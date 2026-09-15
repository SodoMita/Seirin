"""The 2-D vector map atlas.

Every map is a hand-built SVG: shapes are real projected geometry, labels are
placed by a collision-avoiding placer, and nothing is a raster image or an
embedded bitmap. Layer structure is meaningful (water / landforms / roads /
buildings / labels), so the files open usefully in Inkscape or Illustrator.

Maps produced:

run 1  regional situation, city plan, central district, port, Tsukimachi
run 2  transit, zoning, land value, population density, seismic risk, transit
       schematic, isometric extrusions
run 3  night plate (festival lighting), hydrology, terrain analysis
"""

from __future__ import annotations

import math
import os
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
from shapely.geometry import (LineString, MultiLineString, MultiPolygon, Point,
                              Polygon, box)
from shapely.ops import unary_union

from .base import SvgDoc, fmt, path_d, path_d_compact
from .buildings import City, ZONING
from .districts import DistrictSystem
from .landmarks import Landmarks
from .roads import STREET_CLASSES, RoadNetwork
from .society import Census
from .terrain import GRID, PORT_PLATFORMS, X0, X1, Y0, Y1, Terrain

FONT = ("'Hiragino Sans','Yu Gothic','Noto Sans JP','Source Han Sans JP',"
        "'MS Gothic',sans-serif")

# Palettes ------------------------------------------------------------------
DARK = dict(bg="#0a1016", sea="#0d2233", sea_deep="#081927", land="#1d2520",
            forest="#18241c", urban="#2a2b26", contour="#2f3a30",
            waterway="#14374d", label="#e9eef3", label_dim="#9fb0be",
            frame="#3d4a55")
PLATE = dict(bg="#f4f1ea", sea="#c7d9e2", sea_deep="#b3cbd7", land="#eee9dd",
             forest="#dde4d3", urban="#e4ded1", contour="#c9c2ae",
             waterway="#b9d3de", label="#2a2f33", label_dim="#6b6f72",
             frame="#8c8577")

LEVEL_COLOURS_DARK = {20: "#26332a", 50: "#2d3a2b", 100: "#36402c",
                      200: "#41482e", 400: "#4d5133", 600: "#5a5a3a",
                      800: "#6a6644", 1000: "#7a7250"}
LEVEL_COLOURS_PLATE = {20: "#e0e3cf", 50: "#d8ddc6", 100: "#cfd6bd",
                       200: "#c6ccb2", 400: "#bcbfa6", 600: "#b0ab9a",
                       800: "#a39c8d", 1000: "#968e80"}


class LabelPlacer:
    """Collision-avoiding label placement.

    Labels are tried in priority order with a set of offset candidates; the
    first candidate that does not overlap an already-placed label wins. This is
    the difference between a map and a pile of text — and it has to be
    deterministic, so candidates are ordered, not random.
    """

    def __init__(self, width: float, height: float):
        self.placed: List[Tuple[float, float, float, float]] = []
        self.width = width
        self.height = height

    def place(self, x: float, y: float, text: str, size: float = 11.0,
              priority: float = 1.0, offsets: Optional[Sequence[Tuple[float, float]]] = None,
              char_w: float = 0.58) -> Optional[Tuple[float, float]]:
        w = size * char_w * max(1, len(text)) + size * 0.9
        h = size * 1.35
        cands = offsets or [(0, -h * 0.8), (0, h * 1.5), (w * 0.62, h * 0.35),
                            (-w * 0.62, h * 0.35), (0, -h * 2.2), (0, h * 2.8),
                            (w * 0.7, -h * 0.8), (-w * 0.7, -h * 0.8)]
        for (dx, dy) in cands:
            box0 = (x + dx - w / 2, y + dy - h / 2, w, h)
            if self._fits(box0):
                self.placed.append(box0)
                return (x + dx, y + dy)
        return None

    def _fits(self, b) -> bool:
        x, y, w, h = b
        if x < 0 or y < 0 or x + w > self.width or y + h > self.height:
            return False
        for (ox, oy, ow, oh) in self.placed:
            if not (x + w < ox or ox + ow < x or y + h < oy or oy + oh < y):
                return False
        return True

    def reserve(self, x, y, w, h):
        self.placed.append((x - w / 2, y - h / 2, w, h))


def _octi_elbow(a: Tuple[float, float], b: Tuple[float, float]) -> List[Tuple[float, float]]:
    """Path from a to b using only horizontal, vertical and 45° segments.

    Two segments are enough for any pair: an axis-aligned run followed by a
    diagonal. Terrain-free, deterministic, and it is what makes a diagram read
    like a diagram rather than like a squashed map.
    """
    dx, dy = b[0] - a[0], b[1] - a[1]
    if abs(dx) < 1e-6 or abs(dy) < 1e-6 or abs(abs(dx) - abs(dy)) < 1e-6:
        return [a, b]
    if abs(dx) > abs(dy):
        s = 1.0 if dx > 0 else -1.0
        elbow = (b[0] - s * abs(dy), a[1])
        return [a, elbow, b]
    s = 1.0 if dy > 0 else -1.0
    elbow = (a[0], b[1] - s * abs(dx))
    return [a, elbow, b]


class Atlas:
    """Builds every SVG map for one generated city."""

    def __init__(self, terrain: Terrain, districts: DistrictSystem, roads: RoadNetwork,
                 city: City, landmarks: Landmarks, census: Census):
        self.terrain = terrain
        self.districts = districts
        self.roads = roads
        self.city = city
        self.landmarks = landmarks
        self.census = census
        self._land = terrain.land_union()
        self._water = terrain.water_polygon()
        self._rivers = terrain.river_water_polygons()
        self._machi_centroids = {nb.id: nb.anchor for nb in districts.neighbourhoods}

    # -- shared helpers ----------------------------------------------------
    def _new_doc(self, view, size_px: int, palette: Dict, title: str,
                 aspect: float = 1.0) -> SvgDoc:
        x0, y0, x1, y1 = view
        w = x1 - x0
        doc = SvgDoc(w, w / aspect if aspect else w, view, bg=palette["bg"],
                     title=title, font=FONT)
        return doc

    def _draw_land(self, doc: SvgDoc, pal: Dict, contours: bool = True,
                   levels: Optional[Sequence[float]] = None):
        doc.open_layer("land")
        doc.poly(self._land, fill=pal["land"])
        if contours:
            doc.open_layer("contours")
            cols = PLATE if pal is PLATE else None
            colour_map = (LEVEL_COLOURS_PLATE if pal["bg"].startswith("#f")
                          else LEVEL_COLOURS_DARK)
            lvls = levels or tuple(colour_map.keys())
            for lv in lvls:
                colour = colour_map.get(lv, colour_map[max(colour_map)])
                for ln in self.terrain.contours([lv])[lv]:
                    doc.poly(ln, stroke=colour, sw=1.6, opacity=0.9)
        doc.open_layer("water")
        doc.poly(self._water, fill=pal["sea"])
        for r in self._rivers:
            doc.poly(r, fill=pal["waterway"])

    def _draw_roads(self, doc: SvgDoc, pal: Dict, area: Tuple[float, float, float, float],
                    classes=("trunk", "arterial", "collector", "local"),
                    width_scale: float = 1.0, casings: bool = True):
        doc.open_layer("roads")
        order = {"service": 0, "alley": 0, "local": 1, "collector": 2,
                 "arterial": 3, "trunk": 4}
        x0, y0, x1, y1 = area
        for st in sorted(self.roads.streets, key=lambda s: order[s.klass]):
            if st.klass not in classes:
                continue
            b = st.line.bounds
            if b[2] < x0 or b[0] > x1 or b[3] < y0 or b[1] > y1:
                continue
            spec = STREET_CLASSES[st.klass]
            w = max(1.1, spec["width"] * width_scale * 0.62)
            if casings and st.klass in ("trunk", "arterial"):
                doc.poly(st.line, stroke=pal["bg"], sw=w + 4.2, opacity=0.95)
            colour = spec["colour"] if pal is PLATE else _darken(spec["colour"], 0.72)
            doc.poly(st.line, stroke=colour, sw=w, opacity=1.0)
        if self.roads.bridges:
            doc.open_layer("bridges")
            for br in self.roads.bridges:
                doc.poly(br.line, stroke="#7fd4ff" if pal is DARK else "#4c6f86",
                         sw=max(2.0, br.deck_width * 0.55), opacity=1.0)

    def _draw_buildings(self, doc: SvgDoc, pal: Dict,
                        area: Tuple[float, float, float, float],
                        max_buildings: int = 200_000, min_side: float = 0.0,
                        height_shading: bool = True, precision: int = 1):
        doc.open_layer("buildings")
        x0, y0, x1, y1 = area
        # Group by kind for compact output; sort so the tallest draw last.
        by_kind: Dict[str, List] = {}
        for b in self.city.buildings:
            cx, cy = b.centre
            if cx < x0 or cx > x1 or cy < y0 or cy > y1:
                continue
            if min_side and b.foot_m2 ** 0.5 < min_side:
                continue
            by_kind.setdefault(b.kind, []).append(b)
        base_colours = {
            "house": "#b9a184", "barn": "#8a7a62", "apart": "#a9a49b",
            "shop": "#9c968c", "office": "#8e99a4", "tower": "#7d8b99",
            "hotel": "#9c9083", "factory": "#8f8e88", "warehouse": "#889796",
            "plant": "#84897f", "tank": "#95a09c",
        }
        if pal is PLATE:
            base_colours = {k: _lighten(v, 0.30) for k, v in base_colours.items()}
        # Bucket by final colour and emit one path per colour: the same drawing,
        # a fraction of the markup.
        buckets: Dict[str, List[str]] = {}
        crowns: List[str] = []
        for kind, items in by_kind.items():
            colour = base_colours.get(kind, "#9a958c")
            for b in items:
                if b.height_m > 55.0:
                    crowns.append(path_d_compact(b.polygon, precision=precision))
                c = colour
                if height_shading:
                    c = _darken(colour, 1.0 - min(0.42, b.height_m / 150.0 * 0.42))
                buckets.setdefault(c, []).append(
                    path_d_compact(b.polygon, precision=precision))
        for colour, ds in buckets.items():
            doc.path_multi(ds, fill=colour)
        if crowns:
            doc.path_multi(crowns, stroke="#e7d9a8" if pal is DARK else "#8a7f56",
                           sw=2.4, opacity=0.9)

    def _draw_labels(self, doc: SvgDoc, pal: Dict, view, sizes: Dict[str, float],
                     include_machi: bool = True, include_pois: bool = True,
                     include_streets: bool = True):
        x0, y0, x1, y1 = view
        placer = LabelPlacer(x1 - x0, y1 - y0)
        # district names first (highest priority)
        doc.open_layer("labels_districts")
        for d in sorted(self.districts.districts,
                        key=lambda d: -_poly_area(d["polygon"])):
            if d["polygon"] is None:
                continue
            cx, cy = d["centre"]
            if not (x0 <= cx <= x1 and y0 <= cy <= y1):
                continue
            size = sizes.get("district", 26.0)
            pos = placer.place(cx - x0, cy - y0, d["romaji"], size, priority=10,
                               offsets=[(0, 0), (0, -size), (0, size)])
            if pos is None:
                continue
            px, py = pos[0] + x0, pos[1] + y0
            doc.text(px, py, d["romaji"], size=size, fill=pal["label"],
                     weight="600", letter_spacing=size * 0.10,
                     halo=pal["bg"], opacity=0.96)
            doc.text(px, py + size * 1.25, d["kanji"], size=size * 0.72,
                     fill=pal["label_dim"], halo=pal["bg"], opacity=0.9)
        if include_machi:
            doc.open_layer("labels_machi")
            for nb in self.districts.neighbourhoods:
                cx, cy = nb.anchor
                if not (x0 <= cx <= x1 and y0 <= cy <= y1):
                    continue
                if nb.polygon.area < 150_000.0:
                    continue
                size = sizes.get("machi", 15.0)
                pos = placer.place(cx - x0, cy - y0, nb.romaji, size, priority=5)
                if pos is None:
                    continue
                doc.text(pos[0] + x0, pos[1] + y0, nb.romaji, size=size,
                         fill=pal["label_dim"], opacity=0.92)
        if include_pois:
            doc.open_layer("labels_landmarks")
            kind_sizes = {"corporate": 1.15, "arena": 1.1, "rail_station": 1.2}
            for poi in self.landmarks.canon:
                if not (x0 <= poi.x <= x1 and y0 <= poi.y <= y1):
                    continue
                size = sizes.get("poi", 16.0) * kind_sizes.get(poi.kind, 1.0)
                label = poi.romaji.split("(")[0].strip()
                pos = placer.place(poi.x - x0, poi.y - y0, label, size, priority=8)
                if pos is None:
                    continue
                doc.text(pos[0] + x0, pos[1] + y0, label, size=size,
                         fill="#ffd479" if pal is DARK else "#8a6a1f",
                         weight="600", halo=pal["bg"])
                doc.circle(poi.x, poi.y, size * 0.30,
                           fill="#ffd479" if pal is DARK else "#8a6a1f")
        if include_streets:
            doc.open_layer("labels_streets")
            seen = set()
            for st in self.roads.streets:
                if st.klass not in ("trunk", "arterial") or st.length < 900.0:
                    continue
                if st.name_romaji in seen:
                    continue
                seen.add(st.name_romaji)
                mid = st.line.interpolate(0.5, normalized=True)
                if not (x0 <= mid.x <= x1 and y0 <= mid.y <= y1):
                    continue
                p0 = st.line.interpolate(0.06, normalized=True)
                p1 = st.line.interpolate(0.2, normalized=True)
                ang = math.degrees(math.atan2(p1.y - p0.y, p1.x - p0.x))
                if ang > 90:
                    ang -= 180
                elif ang < -90:
                    ang += 180
                size = sizes.get("street", 13.0)
                pos = placer.place(mid.x - x0, mid.y - y0, st.name_romaji, size, priority=3)
                if pos is None:
                    continue
                doc.text(pos[0] + x0, pos[1] + y0, st.name_romaji, size=size,
                         fill=pal["label_dim"], opacity=0.85, rotate=ang)

    def _compass(self, doc: SvgDoc, view, pal: Dict, scale_bar_km: float = 2.0):
        x0, y0, x1, y1 = view
        span = x1 - x0
        cx, cy = x1 - span * 0.06, y0 + span * 0.06
        r = span * 0.022
        doc.open_layer("furniture")
        doc.poly(LineString([(cx, cy - r), (cx, cy + r)]), stroke=pal["label_dim"], sw=r * 0.10)
        doc.poly(LineString([(cx - r, cy), (cx + r, cy)]), stroke=pal["label_dim"], sw=r * 0.10)
        doc.text(cx, cy - r * 1.35, "N", size=r * 0.95, fill=pal["label"],
                 weight="600")
        # scale bar
        bar_km = scale_bar_km
        bar_m = bar_km * 1_000.0
        bx, by = x0 + span * 0.035, y0 + span * 0.045
        doc.poly(LineString([(bx, by), (bx + bar_m, by)]), stroke=pal["label"], sw=r * 0.13)
        for i in range(3):
            doc.poly(LineString([(bx + bar_m * i / 2, by - r * 0.32),
                                 (bx + bar_m * i / 2, by + r * 0.32)]),
                     stroke=pal["label"], sw=r * 0.11)
        doc.text(bx + bar_m / 2, by + r * 1.15, f"{bar_km:g} km", size=r * 0.72,
                 fill=pal["label_dim"])

    def _title_block(self, doc: SvgDoc, view, pal: Dict, title: str, subtitle: str,
                     credit: str):
        x0, y0, x1, y1 = view
        span = x1 - x0
        doc.open_layer("title")
        doc.text(x0 + span * 0.035, y1 - span * 0.055, title, size=span * 0.026,
                 fill=pal["label"], anchor="start", weight="700",
                 letter_spacing=span * 0.0018)
        doc.text(x0 + span * 0.035, y1 - span * 0.036, subtitle, size=span * 0.0125,
                 fill=pal["label_dim"], anchor="start")
        doc.text(x1 - span * 0.03, y0 + span * 0.035, credit, size=span * 0.0085,
                 fill=pal["label_dim"], anchor="end")

    def _legend(self, doc: SvgDoc, view, pal: Dict, items: Sequence[Tuple[str, str]],
                title: str = "", columns: int = 1):
        x0, y0, x1, y1 = view
        span = x1 - x0
        size = span * 0.0082
        pad = span * 0.012
        w = span * 0.175 * columns
        h = (len(items) / columns) * size * 2.05 + size * 3.0
        bx, by = x1 - w - pad * 2.2, y1 - h - span * 0.03
        doc.open_layer("legend")
        doc.rect(bx, by, w, h, fill=pal["bg"], opacity=0.82, rx=size * 0.5)
        doc.rect(bx, by, w, h, fill="none", stroke=pal["frame"], sw=size * 0.14,
                 rx=size * 0.5)
        if title:
            doc.text(bx + pad * 0.6, by + size * 1.7, title, size=size * 1.18,
                     fill=pal["label"], anchor="start", weight="600")
        for i, (label, colour) in enumerate(items):
            col = i // max(1, (len(items) + columns - 1) // columns)
            row = i % max(1, (len(items) + columns - 1) // columns)
            ix = bx + pad * 0.6 + col * (w / columns)
            iy = by + size * 3.4 + row * size * 2.05
            doc.rect(ix, iy - size * 0.78, size * 1.25, size * 0.82, fill=colour,
                     stroke=pal["frame"], sw=size * 0.08)
            doc.text(ix + size * 1.7, iy, label, size=size, fill=pal["label_dim"],
                     anchor="start")

    # ------------------------------------------------------------------
    # Map 1 — regional situation
    # ------------------------------------------------------------------
    def map_regional(self, path: str, size_px: int = 1600) -> str:
        pal = PLATE
        view = (-30_000.0, -26_000.0, 30_000.0, 30_000.0)
        doc = SvgDoc(view[2] - view[0], view[3] - view[1], view, bg=pal["sea_deep"],
                     title="Seirin — regional situation", font=FONT)
        # An idealised regional coastline: the model frame plus the surrounding
        # landmass, drawn from the same sea-line function the terrain uses.
        doc.open_layer("region")
        xs = np.arange(-40_000.0, 40_000.0, 500.0)
        coast = [-5_350.0 + 420.0 * math.sin(x / 3_900.0) + 180.0 * math.sin(x / 1_500.0 + 2.0)
                 for x in xs]
        pts = list(zip(xs, coast)) + [(40_000.0, 34_000.0), (-40_000.0, 34_000.0)]
        doc.poly(Polygon(pts), fill=pal["land"])
        # the bay
        bay = Point(2_400.0, -4_400.0).buffer(4_350.0, resolution=24)
        doc.poly(bay, fill=pal["sea"])
        doc.open_layer("city_extent")
        doc.rect(X0, Y0, X1 - X0, Y1 - Y0, fill="none", stroke="#8a6a1f",
                 sw=280.0, opacity=0.9)
        doc.text((X0 + X1) / 2, Y1 + 2_600.0, "Seirin city area (23 km × 23 km model frame)",
                 size=2_100.0, fill=pal["label"], weight="600")
        for d in self.districts.districts:
            doc.circle(d["centre"][0], d["centre"][1], 620.0, fill="#b03a2e")
            doc.text(d["centre"][0], d["centre"][1] - 1_100.0, d["romaji"],
                     size=900.0, fill=pal["label_dim"])
        # regional context: neighbouring places and the trunk routes out
        for (x, y, name, kind) in [
                (0.0, 27_000.0, "to the prefectural capital  ·  62 km", "road"),
                (26_000.0, 6_000.0, "Tōkaidō main line  ·  to Tokyo 2 h 10", "rail"),
                (-26_000.0, 10_000.0, "coastal route  ·  west", "road"),
                (6_000.0, -22_000.0, "Pacific shipping lane", "sea")]:
            doc.text(x, y, name, size=1_150.0,
                     fill="#4c6f86" if kind == "sea" else pal["label_dim"],
                     weight="500")
        doc.text(-13_000.0, -9_000.0, "S E I R I N   B A Y", size=2_600.0,
                 fill="#5d7f95", weight="600", letter_spacing=900.0)
        doc.text(20_000.0, 20_000.0, "P A C I F I C   O C E A N", size=2_400.0,
                 fill="#5d7f95", letter_spacing=700.0)
        self._compass(doc, view, pal, scale_bar_km=10.0)
        self._title_block(doc, view, pal, "SEIRIN — REGIONAL SITUATION",
                          "Pacific coast of central Honshu · 34°48′N 138°27′E · "
                          "model frame 23 × 23 km",
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, "Seirin regional situation map, generated.")

    # ------------------------------------------------------------------
    # Map 2 — city plan
    # ------------------------------------------------------------------
    def map_city(self, path: str, size_px: int = 2400, palette: str = "dark",
                 view: Optional[Tuple[float, float, float, float]] = None) -> str:
        pal = DARK if palette == "dark" else PLATE
        # Withhold the last edge of the model frame: the visible arc of the coast
        # reads as the city edge, and the frame never cuts a built block.
        inset = 1_100.0
        view = view or (X0 + inset, Y0 + 2_400.0, X1 - inset, Y1 - inset)
        doc = SvgDoc(2_400, 2_400, view, bg=pal["bg"],
                     title="Seirin — city plan", font=FONT)
        self._draw_land(doc, pal)
        self._draw_roads(doc, pal, view, classes=("trunk", "arterial", "collector", "local"),
                         width_scale=1.0)
        self._draw_buildings(doc, pal, view)
        # transit lines over the city
        doc.open_layer("transit")
        for line in self.landmarks.lines:
            if line.kind == "ferry":
                continue
            doc.poly(line.geometry, stroke="#d94f3d" if pal is DARK else "#a83a2a",
                     sw=64.0, opacity=0.85, dash="220 130")
            for st in self.landmarks.stations:
                if st.id in line.stations:
                    doc.circle(st.x, st.y, 110.0, fill=pal["bg"],
                               stroke="#f0e3c0", sw=42.0)
        self._draw_labels(doc, pal, view,
                          dict(district=460.0, machi=250.0, poi=260.0, street=215.0))
        self._compass(doc, view, pal, scale_bar_km=2.0)
        self._legend(doc, view, pal, [
            ("Trunk road (4 lanes)", STREET_CLASSES["trunk"]["colour"]),
            ("Arterial", STREET_CLASSES["arterial"]["colour"]),
            ("Collector", STREET_CLASSES["collector"]["colour"]),
            ("Local street", STREET_CLASSES["local"]["colour"]),
            ("Rail line", "#d94f3d"),
            ("Water", pal["sea"]),
            ("Building", "#9c968c"),
            ("Landmark", "#ffd479"),
        ], "LEGEND", columns=2)
        self._title_block(doc, view, pal, "SEIRIN — CITY PLAN",
                          f"{self.census.total_population:,} residents · "
                          f"{len(self.city.buildings):,} buildings · "
                          f"{self.roads.stats()['length_km']:,.0f} km of street · 2032",
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, "Seirin city plan.")

    # ------------------------------------------------------------------
    # Map 3 — district detail
    # ------------------------------------------------------------------
    def map_district(self, path: str, district_id: str, radius: float = 2_200.0,
                     palette: str = "dark") -> str:
        d = next(x for x in self.districts.districts if x["id"] == district_id)
        cx, cy = d["centre"]
        pal = DARK if palette == "dark" else PLATE
        view = (cx - radius, cy - radius, cx + radius, cy + radius)
        doc = SvgDoc(2_200, 2_200, view, bg=pal["bg"],
                     title=f"Seirin — {d['romaji']}", font=FONT)
        doc.open_layer("blocks")
        for poly in self.city.blocks:
            if poly.centroid.distance(Point(cx, cy)) > radius * 1.6:
                continue
            doc.poly(poly, fill="#20262a" if pal is DARK else "#e8e3d6")
        self._draw_land(doc, pal, contours=pal is PLATE)
        self._draw_roads(doc, pal, view,
                         classes=("trunk", "arterial", "collector", "local", "alley",
                                  "service"),
                         width_scale=1.25)
        self._draw_buildings(doc, pal, view, height_shading=True)
        # Address blocks: the machi pattern with their boundaries
        doc.open_layer("machi_boundaries")
        for nb in self.districts.neighbourhoods:
            if nb.anchor[0] < view[0] or nb.anchor[0] > view[2]:
                continue
            if nb.anchor[1] < view[1] or nb.anchor[1] > view[3]:
                continue
            doc.poly(nb.polygon, fill="none", stroke="#7f8f9c",
                     sw=18.0, dash="90 70", opacity=0.55)
        placer = LabelPlacer(view[2] - view[0], view[3] - view[1])
        for nb in self.districts.neighbourhoods:
            x, y = nb.anchor
            if not (view[0] <= x <= view[2] and view[1] <= y <= view[3]):
                continue
            pos = placer.place(x - view[0], y - view[1], nb.romaji, 150.0, priority=4)
            if pos is None:
                continue
            doc.text(pos[0] + view[0], pos[1] + view[1], nb.romaji, size=150.0,
                     fill="#cfdae4", weight="600", halo=pal["bg"])
            doc.text(pos[0] + view[0], pos[1] + view[1] + 165.0, nb.kanji,
                     size=125.0, fill="#93a5b3", halo=pal["bg"])
        self._draw_labels(doc, pal, view, dict(poi=170.0, street=140.0),
                          include_machi=False)
        # POIs inside the view
        doc.open_layer("pois")
        for poi in self.landmarks.pois:
            if not (view[0] <= poi.x <= view[2] and view[1] <= poi.y <= view[3]):
                continue
            colour = {"clinic": "#7fd1c0", "school_primary": "#c7b3e0",
                      "school_junior_high": "#c7b3e0", "convenience": "#ffd479",
                      "shrine": "#e0897a", "park": "#7fbf7a",
                      "police_box": "#8fb8e0", "fire_station": "#e07a6a"}.get(
                          poi.kind, "#b9c2c9")
            doc.circle(poi.x, poi.y, 46.0, fill=colour)
        self._compass(doc, view, pal, scale_bar_km=0.5)
        self._legend(doc, view, pal, [
            ("Neighbourhood (machi)", "#7f8f9c"),
            ("Landmark", "#ffd479"),
            ("School", "#c7b3e0"),
            ("Clinic", "#7fd1c0"),
            ("Shrine / temple", "#e0897a"),
            ("Park", "#7fbf7a"),
            ("Shop", "#ffd479"),
            ("Fire station", "#e07a6a"),
        ], "LEGEND", columns=2)
        self._title_block(doc, view, pal, f"SEIRIN — {d['romaji'].upper()}",
                          f"{d['english']} · {d['character']}",
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, f"Seirin district map: {d['romaji']}.")

    # ------------------------------------------------------------------
    # Map 4 — transit
    # ------------------------------------------------------------------
    def map_transit(self, path: str, size_px: int = 2000) -> str:
        pal = DARK
        view = (X0 + 1_400, Y0 + 3_400, X1 - 1_400, Y1 - 1_400)
        doc = SvgDoc(2_000, 2_000, view, bg=pal["bg"], title="Seirin — transit",
                     font=FONT)
        doc.open_layer("land")
        doc.poly(self._land, fill="#151d18")
        self.terrain.land_polygons()
        doc.poly(self._water, fill=pal["sea"])
        for r in self._rivers:
            doc.poly(r, fill=pal["waterway"])
        doc.open_layer("built")
        for b in self.city.buildings:
            if b.height_m < 6.0:
                continue
            doc.poly(b.polygon, fill="#232a2e", stroke="none")
        doc.open_layer("lines")
        line_colours = {"seirin_main": "#d94f3d", "kaigan": "#3f8fd0",
                        "sanson": "#5cb85c", "minato_metro": "#e0a03f",
                        "bay_ferry": "#7fd4ff"}
        for line in self.landmarks.lines:
            colour = line_colours.get(line.id, "#cccccc")
            if line.kind == "ferry":
                doc.poly(line.geometry, stroke=colour, sw=90.0, dash="260 150",
                         opacity=0.9)
            else:
                doc.poly(line.geometry, stroke="#101619", sw=190.0)
                doc.poly(line.geometry, stroke=colour, sw=110.0)
        doc.open_layer("stations")
        for st in self.landmarks.stations:
            r = 90.0 + min(300.0, st.daily_boardings / 900.0)
            doc.circle(st.x, st.y, r, fill="#0f1417", stroke="#f2ead8", sw=32.0)
            if len(st.lines) > 1:
                doc.circle(st.x, st.y, r * 1.45, fill="none", stroke="#f2ead8", sw=26.0)
        placer = LabelPlacer(view[2] - view[0], view[3] - view[1])
        for st in sorted(self.landmarks.stations, key=lambda s: -s.daily_boardings):
            pos = placer.place(st.x - view[0], st.y - view[1], st.romaji, 175.0,
                               priority=6)
            if pos is None:
                continue
            doc.text(pos[0] + view[0], pos[1] + view[1], st.romaji, size=175.0,
                     fill="#e9eef3", weight="600", halo="#0a1016")
            doc.text(pos[0] + view[0], pos[1] + view[1] + 190.0,
                     f"{st.daily_boardings:,}/day", size=140.0,
                     fill="#9fb0be", halo="#0a1016")
        self._compass(doc, view, pal, scale_bar_km=2.0)
        self._legend(doc, view, pal, [
            ("Seirin Main Line", "#d94f3d"), ("Kaigan Coastal Line", "#3f8fd0"),
            ("Sanson Mountain Line", "#5cb85c"), ("Minato Metro", "#e0a03f"),
            ("Bay ferry", "#7fd4ff"),
            ("Interchange", "#f2ead8"),
        ], "LINES", columns=1)
        self._title_block(doc, view, pal, "SEIRIN — PUBLIC TRANSPORT",
                          f"{len(self.landmarks.stations)} stations · "
                          f"{sum(s.daily_boardings for s in self.landmarks.stations):,} "
                          "boardings per weekday",
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, "Seirin transit map.")

    # ------------------------------------------------------------------
    # Map 5 — zoning
    # ------------------------------------------------------------------
    ZONE_COLOURS = {
        "1shu": "#f2e6a2", "2shu": "#f5d98f", "1chu": "#f7cd83", "2chu": "#f7bd75",
        "jusho": "#f2a367", "kin": "#e8836a", "sho": "#d95f5f",
        "junko": "#b9a2d9", "ko": "#8f86c9", "none": "#a8d5a2",
    }

    def map_zoning(self, path: str, size_px: int = 2200) -> str:
        pal = PLATE
        view = (X0 + 1_400, Y0 + 2_600, X1 - 1_400, Y1 - 1_400)
        doc = SvgDoc(2_200, 2_200, view, bg="#ffffff", title="Seirin — use districts",
                     font=FONT)
        doc.open_layer("zoning")
        # Machi-level zoning is painted at machi scale — the resolution at which
        # Japanese use districts are actually designated.
        for nb in self.districts.neighbourhoods:
            colour = self.ZONE_COLOURS.get(getattr(nb, "zoning", "none"), "#dddddd")
            doc.poly(nb.polygon, fill=colour, stroke="#ffffff", sw=48.0)
        doc.open_layer("water")
        doc.poly(self._water, fill="#dce8ee")
        for r in self._rivers:
            doc.poly(r, fill="#b9d3de")
        doc.open_layer("rail")
        for line in self.landmarks.lines:
            if line.kind in ("rail", "metro"):
                doc.poly(line.geometry, stroke="#555555", sw=54.0, dash="180 110")
        placer = LabelPlacer(view[2] - view[0], view[3] - view[1])
        for d in self.districts.districts:
            cx, cy = d["centre"]
            if not (view[0] <= cx <= view[2] and view[1] <= cy <= view[3]):
                continue
            pos = placer.place(cx - view[0], cy - view[1], d["romaji"], 320.0, priority=9)
            if pos is None:
                continue
            doc.text(pos[0] + view[0], pos[1] + view[1], d["romaji"], size=320.0,
                     fill="#2a2f33", weight="700", halo="#ffffff")
        counts: Dict[str, int] = {}
        for nb in self.districts.neighbourhoods:
            z = getattr(nb, "zoning", "none")
            counts[z] = counts.get(z, 0) + 1
        items = [(ZONING[z]["label"] + f"  ({counts[z]})", c)
                 for z, c in self.ZONE_COLOURS.items() if counts.get(z)]
        self._legend(doc, view, pal, items, "USE DISTRICTS (用途地域) — by machi", 2)
        self._compass(doc, view, pal, scale_bar_km=2.0)
        self._title_block(doc, view, pal, "SEIRIN — USE DISTRICT MAP",
                          "Zoning follows the Japanese yōto-chiku system; the "
                          "floor-area and coverage ratios in the data tables apply per machi.",
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, "Seirin zoning map.")

    # ------------------------------------------------------------------
    # Map 6 — thematic surfaces (density, value, risk)
    # ------------------------------------------------------------------
    def _heat_scale(self, value: float, lo: float, hi: float) -> str:
        t = 0.0 if hi <= lo else max(0.0, min(1.0, (value - lo) / (hi - lo)))
        stops = [(0.0, (28, 44, 66)), (0.25, (36, 84, 110)), (0.5, (58, 130, 120)),
                 (0.72, (196, 168, 92)), (0.88, (208, 112, 72)), (1.0, (188, 58, 62))]
        for i in range(len(stops) - 1):
            a, ca = stops[i]
            b, cb = stops[i + 1]
            if a <= t <= b:
                f = (t - a) / max(1e-9, b - a)
                c = tuple(int(round(ca[k] + (cb[k] - ca[k]) * f)) for k in range(3))
                return f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"
        return "#bc3a3e"

    def map_thematic(self, path: str, metric: str, size_px: int = 2000) -> str:
        spec = {
            "population": ("POPULATION DENSITY", "residents per km²", "persons_km2"),
            "value": ("LAND VALUE", "thousand yen per m² (公示地価 basis)", "land_value"),
            "risk": ("SEISMIC RISK", "share of dwellings in pre-1981 timber buildings",
                     "quake_risk"),
            "elderly": ("AGEING", "share of residents aged 65 and over", "elderly"),
            "access": ("TRANSIT ACCESSIBILITY", "jobs reachable within 30 minutes",
                       "access"),
        }[metric]
        pal = DARK
        view = (X0 + 1_400, Y0 + 2_600, X1 - 1_400, Y1 - 1_400)
        doc = SvgDoc(2_000, 2_000, view, bg="#0d1319", title=f"Seirin — {spec[0]}",
                     font=FONT)
        values = self._metric_values(metric)
        if not values:
            raise ValueError(f"thematic map '{metric}' has no values — the metric "
                             f"name or the society model is wrong")
        lo = float(np.percentile(list(values.values()), 5))
        hi = float(np.percentile(list(values.values()), 95))
        doc.open_layer("machi_choropleth")
        machi_fills: Dict[str, List[str]] = {}
        for nb in self.districts.neighbourhoods:
            v = values.get(nb.id)
            if v is None:
                continue
            machi_fills.setdefault(self._heat_scale(v, lo, hi), []).append(
                path_d_compact(nb.polygon, precision=0))
        for fill, ds in machi_fills.items():
            doc.path_multi(ds, fill=fill, stroke="#0d1319", sw=30.0, opacity=0.95)
        doc.open_layer("context")
        doc.poly(self._water, fill="#0a1a24")
        for r in self._rivers:
            doc.poly(r, fill="#0d2b3a")
        for st in self.roads.streets:
            if st.klass in ("trunk", "arterial"):
                doc.poly(st.line, stroke="#1c242b", sw=54.0, opacity=0.8)
        placer = LabelPlacer(view[2] - view[0], view[3] - view[1])
        for nb in sorted(self.districts.neighbourhoods,
                         key=lambda n: -values.get(n.id, 0)):
            if nb.id not in values:
                continue
            if nb.polygon.area < 400_000.0:
                continue
            pos = placer.place(nb.anchor[0] - view[0], nb.anchor[1] - view[1],
                               nb.romaji, 190.0, priority=5)
            if pos is None:
                continue
            v = values[nb.id]
            label = f"{v:,.0f}" if v >= 10 else f"{v:.3f}"
            doc.text(pos[0] + view[0], pos[1] + view[1], nb.romaji, size=190.0,
                     fill="#0d1319", weight="600", halo="#e9eef3")
            doc.text(pos[0] + view[0], pos[1] + view[1] + 210.0, label, size=170.0,
                     fill="#22303a", halo="#e9eef3")
        # colour ramp
        doc.open_layer("ramp")
        span = view[2] - view[0]
        bx, by = view[0] + span * 0.045, view[0] + span * 0.30
        n = 60
        for i in range(n):
            t = i / (n - 1)
            doc.line(bx + i * span * 0.006, by, bx + i * span * 0.006, by + span * 0.018,
                     stroke=self._heat_scale(t * (hi - lo) + lo, lo, hi),
                     sw=span * 0.0062)
        doc.text(bx, by + span * 0.030, f"{lo:,.0f}", size=span * 0.010,
                 fill="#9fb0be", anchor="start")
        doc.text(bx + n * span * 0.006, by + span * 0.030, f"{hi:,.0f}",
                 size=span * 0.010, fill="#9fb0be", anchor="end")
        doc.text(bx, by - span * 0.010, spec[1], size=span * 0.011,
                 fill="#e9eef3", anchor="start", weight="600")
        self._compass(doc, view, pal, scale_bar_km=2.0)
        self._title_block(doc, view, pal, f"SEIRIN — {spec[0]}", spec[1],
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, f"Seirin thematic map: {metric}.")

    def _metric_values(self, metric: str) -> Dict[str, float]:
        """One value per machi for the thematic maps.

        Seismic risk is averaged per machi in a single pass over the building
        stock (100+ machi x 170 000 buildings scanned one machi at a time was
        minutes of work for a map).
        """
        out: Dict[str, float] = {}
        if metric == "risk":
            total: Dict[str, float] = {}
            count: Dict[str, int] = {}
            for b in self.city.buildings:
                total[b.machi_id] = total.get(b.machi_id, 0.0) + b.risk_quake
                count[b.machi_id] = count.get(b.machi_id, 0) + 1
        for mid, st in self.census.machi_stats.items():
            nb = self.districts.machi_by_id.get(mid)
            if nb is None or nb.polygon.area <= 0:
                continue
            if metric == "population":
                out[mid] = st.population / (nb.polygon.area / 1e6)
            elif metric == "value":
                out[mid] = st.land_value_myen_per_sqm * 1_000.0
            elif metric == "risk":
                if count.get(mid):
                    out[mid] = total[mid] / count[mid]
            elif metric == "elderly":
                out[mid] = st.age_65_p
            elif metric == "access":
                out[mid] = st.accessibility * 1.0
        return out

    # ------------------------------------------------------------------
    # Map 7 — night plate with the festival lighting
    # ------------------------------------------------------------------
    def map_night(self, path: str, size_px: int = 2200) -> str:
        pal = DARK
        view = (1_050.0 - 3_600.0, 1_150.0 - 3_000.0, 1_050.0 + 3_600.0, 1_150.0 + 3_900.0)
        doc = SvgDoc(2_200, 2_200, view, bg="#05080c", title="Seirin — night plate",
                     font=FONT)
        doc.open_layer("ground")
        doc.poly(self._land, fill="#0b1114")
        doc.poly(self._water, fill="#060f16")
        for r in self._rivers:
            doc.poly(r, fill="#08161f")
        doc.open_layer("glow")
        # Light pools: the CBD grid, the arterial corridors and the port floodlights.
        doc.circle(1_050.0, 1_150.0, 1_650.0, fill="#ffcf7a", opacity=0.10)
        doc.circle(1_450.0, 1_900.0, 900.0, fill="#ffd89a", opacity=0.10)
        doc.circle(-3_250.0, 3_150.0, 700.0, fill="#ffbe6a", opacity=0.09)
        doc.circle(2_700.0, 2_650.0, 650.0, fill="#8fd0ff", opacity=0.07)
        doc.circle(6_150.0, -2_250.0, 900.0, fill="#e8f4ff", opacity=0.10)
        doc.circle(3_350.0, -700.0, 500.0, fill="#ffd89a", opacity=0.08)
        doc.open_layer("buildings")
        dark_mass: List[str] = []
        warm_lit: List[str] = []
        cool_lit: List[str] = []
        for b in self.city.buildings:
            cx, cy = b.centre
            if not (view[0] <= cx <= view[2] and view[1] <= cy <= view[3]):
                continue
            dark_mass.append(path_d_compact(b.polygon, precision=0))
            # lit windows: warm in mixed use, cool in offices, dark on rooftops
            if b.height_m > 4.0:
                d = path_d_compact(b.polygon, precision=0)
                (warm_lit if b.kind in ("house", "apart", "shop", "hotel")
                 else cool_lit).append(d)
        doc.path_multi(dark_mass, fill="#1b232a")
        doc.path_multi(warm_lit, fill="#ffd08a", opacity=0.22)
        doc.path_multi(cool_lit, fill="#bcd8ee", opacity=0.20)
        doc.open_layer("roads_lit")
        for st in self.roads.streets:
            if st.klass in ("trunk", "arterial"):
                doc.poly(st.line, stroke="#ffdca8", sw=52.0, opacity=0.55)
            elif st.klass == "collector":
                doc.poly(st.line, stroke="#ffce8c", sw=30.0, opacity=0.32)
        doc.open_layer("festival")
        # The canon's light festival: projection beams over the bay and a line of
        # lanterns along the old town's approach.
        for k in range(9):
            t = -2.4 + k * 0.6
            doc.line(3_200.0 + t * 300.0, -600.0, 3_200.0 + t * 900.0, 4_600.0,
                     stroke="#9fe0ff", sw=26.0, opacity=0.16)
        for k in range(26):
            x = -4_900.0 + k * 150.0
            doc.circle(x, 2_400.0 - abs(k - 13) * 22.0, 26.0, fill="#ffe2a8",
                       opacity=0.75)
        placer = LabelPlacer(view[2] - view[0], view[3] - view[1])
        for d in self.districts.districts:
            cx, cy = d["centre"]
            if not (view[0] <= cx <= view[2] and view[1] <= cy <= view[3]):
                continue
            pos = placer.place(cx - view[0], cy - view[1], d["romaji"], 300.0, priority=9)
            if pos is None:
                continue
            doc.text(pos[0] + view[0], pos[1] + view[1], d["romaji"], size=300.0,
                     fill="#e9eef3", weight="600", halo="#05080c", opacity=0.9)
        self._compass(doc, view, pal, scale_bar_km=1.0)
        self._title_block(doc, view, pal, "SEIRIN — NIGHT PLATE",
                          "Windows, street lighting and the light festival over "
                          "the bay · 22:40, festival week",
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, "Seirin night plate.")

    # ------------------------------------------------------------------
    # Map 8 — hydrology and terrain analysis
    # ------------------------------------------------------------------
    def map_hydrology(self, path: str, size_px: int = 2000) -> str:
        pal = PLATE
        view = (X0 + 1_200, Y0 + 2_400, X1 - 1_200, Y1 - 1_200)
        doc = SvgDoc(2_000, 2_000, view, bg="#faf8f3",
                     title="Seirin — hydrology and terrain", font=FONT)
        doc.open_layer("terrain_bands")
        # Hypsometric bands drawn as filled contour polygons (vector, not raster).
        from .base import contour_polygons
        h = self.terrain.height
        pad = np.pad(h, 1, mode="constant", constant_values=1.0e6)
        for (lo, hi, colour) in [(0, 20, "#dfe7d3"), (20, 80, "#d5dfc4"),
                                 (80, 200, "#c8d3b2"), (200, 400, "#b9c1a0"),
                                 (400, 600, "#a8ab8d"), (600, 800, "#97977d"),
                                 (800, 1200, "#87866f")]:
            field = np.clip((pad - lo) / max(1e-6, (hi - lo)), 0.0, 1.0)
            for poly in contour_polygons(field, 0.5, X0 - GRID, Y0 - GRID, GRID, GRID,
                                         above=True):
                doc.poly(poly, fill=colour, stroke="none")
        doc.open_layer("contours")
        for lv in (20, 100, 200, 400, 600, 800, 1000):
            for ln in self.terrain.contours([lv])[lv]:
                doc.poly(ln, stroke="#8d866f", sw=26.0 if lv % 200 == 0 else 14.0,
                         opacity=0.8)
        doc.open_layer("water")
        doc.poly(self._water, fill=pal["sea"])
        for r in self._rivers:
            doc.poly(r, fill=pal["waterway"])
        doc.open_layer("rivers_labelled")
        placer = LabelPlacer(view[2] - view[0], view[3] - view[1])
        for rv in self.terrain.rivers:
            mid = rv.line().interpolate(0.55, normalized=True)
            if not (view[0] <= mid.x <= view[2] and view[1] <= mid.y <= view[3]):
                continue
            pos = placer.place(mid.x - view[0], mid.y - view[1], rv.name_romaji,
                               300.0, priority=7)
            if pos is None:
                continue
            doc.text(pos[0] + view[0], pos[1] + view[1], rv.name_romaji, size=300.0,
                     fill="#2b5f7a", weight="600", halo="#faf8f3")
            doc.text(pos[0] + view[0], pos[1] + view[1] + 320.0,
                     f"{rv.discharge_m3s:.0f} m³/s", size=240.0, fill="#4a7d95",
                     halo="#faf8f3")
        # Catchment boundary and the protected water source
        spring = self.landmarks.by_id.get("kamikura_spring")
        if spring:
            doc.circle(spring.x, spring.y, 2_400.0, fill="#7fb6d0", opacity=0.22)
            doc.circle(spring.x, spring.y, 2_400.0, fill="none", stroke="#2b5f7a",
                       sw=60.0, dash="220 160")
            placer.reserve(spring.x - view[0], spring.y - view[1] - 2_600.0, 4_500.0, 1_200.0)
            doc.text(spring.x, spring.y - 2_200.0, "Kamikura water-source protection area",
                     size=330.0, fill="#1f4a60", weight="600", halo="#faf8f3")
        for d in self.districts.districts:
            cx, cy = d["centre"]
            if not (view[0] <= cx <= view[2] and view[1] <= cy <= view[3]):
                continue
            doc.text(cx, cy, d["romaji"], size=260.0, fill="#3c3a33", opacity=0.65)
        self._compass(doc, view, pal, scale_bar_km=2.0)
        self._legend(doc, view, pal, [(f"{lo}–{hi} m", c) for (lo, hi, c) in
                                      [(0, 20, "#dfe7d3"), (20, 80, "#d5dfc4"),
                                       (80, 200, "#c8d3b2"), (200, 400, "#b9c1a0"),
                                       (400, 600, "#a8ab8d"), (600, 800, "#97977d"),
                                       (800, 1200, "#87866f")]], "ELEVATION", 1)
        self._title_block(doc, view, pal, "SEIRIN — HYDROLOGY AND TERRAIN",
                          "Kamikura and Nagare catchments · the bay has no bridge, "
                          "so all cross-bay movement is by ferry",
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, "Seirin hydrology and terrain map.")

    # ------------------------------------------------------------------
    # Map 9 — transit schematic (metro-style diagram)
    # ------------------------------------------------------------------
    def map_transit_schematic(self, path: str, size_px: int = 2000) -> str:
        """A diagram, not a map: stations at even spacing on straightened lines.

        The schematic is *derived from the real network* — the order of stations
        along each line, the interchanges, the line colours and the ridership —
        but the positions are diagram positions, which is what a transit diagram
        is for. The layout is a deterministic spring relaxation: each line pulls
        its stations to an even spacing, stations repel each other so labels have
        room, a weak anchor keeps the real geography readable, and every segment
        is rendered octilinearly (horizontal, vertical or 45°, the convention of
        every metro map) with an elbow where the direct line is neither.
        """
        pal = DARK
        cols = {"seirin_main": "#d94f3d", "kaigan": "#3f8fd0", "sanson": "#5cb85c",
                "minato_metro": "#e0a03f"}
        lines = [l for l in self.landmarks.lines if l.kind in ("rail", "metro")]
        by_id = {st.id: st for st in self.landmarks.stations}
        on_map = []
        for line in lines:
            for sid in line.stations:
                if sid in by_id and by_id[sid] not in on_map:
                    on_map.append(by_id[sid])

        pos = self._schematic_layout(lines, by_id, on_map)
        xs = [p[0] for p in pos.values()]
        ys = [p[1] for p in pos.values()]
        # Margins are not symmetric: the title block needs the top, the line key
        # needs the bottom-right corner, and labels need room on every side.
        left, right = 260.0, 260.0
        top, bottom = 300.0, 560.0 + 96.0 * len(lines)
        view = (min(xs) - left, min(ys) - top, max(xs) - min(xs) + left + right,
                max(ys) - min(ys) + top + bottom)
        height_px = size_px * view[3] / max(1.0, view[2])
        doc = SvgDoc(size_px, height_px, view, bg="#0b1014",
                     title="Seirin — transit diagram", font=FONT)

        # -- line paths, octilinear, drawn dark-then-colour for readability
        doc.open_layer("lines")
        for line in lines:
            sts = [by_id[s] for s in line.stations if s in pos]
            if len(sts) < 2:
                continue
            colour = cols.get(line.id, "#999999")
            poly: List[Tuple[float, float]] = []
            for i in range(len(sts) - 1):
                poly.extend(_octi_elbow(pos[sts[i].id], pos[sts[i + 1].id]))
            for i in range(len(poly) - 1):
                p, q = poly[i], poly[i + 1]
                if abs(p[0] - q[0]) < 1e-6 and abs(p[1] - q[1]) < 1e-6:
                    continue
                doc.line(p[0], p[1], q[0], q[1], stroke="#0b1014", sw=54.0)
            for i in range(len(poly) - 1):
                p, q = poly[i], poly[i + 1]
                if abs(p[0] - q[0]) < 1e-6 and abs(p[1] - q[1]) < 1e-6:
                    continue
                doc.line(p[0], p[1], q[0], q[1], stroke=colour, sw=30.0)

        # -- stations
        doc.open_layer("stations")
        placer = LabelPlacer(view[2], view[3])
        for st in sorted(on_map, key=lambda s: -s.daily_boardings):
            x, y = pos[st.id]
            inter = len(st.lines) > 1
            if inter:
                doc.circle(x, y, 40.0, fill="#f2ead8", stroke="#0b1014", sw=12.0)
                doc.circle(x, y, 22.0, fill="none", stroke="#0b1014", sw=10.0)
            else:
                doc.circle(x, y, 26.0, fill="#f2ead8", stroke="#0b1014", sw=12.0)
            label = st.romaji
            size = 48.0 if (inter or st.daily_boardings > 6000) else 40.0
            pos_lab = placer.place(
                x - view[0], y - view[1], label, size=size,
                priority=9 if inter else 6,
                offsets=((0, -96), (0, 104), (0, -196), (0, 204),
                         (260, -34), (-260, -34), (260, 40), (-260, 40),
                         (330, -96), (-330, -96)))
            if pos_lab is None:
                continue
            lx, ly = pos_lab[0] + view[0], pos_lab[1] + view[1]
            if abs(pos_lab[0] - (x - view[0])) > 120.0:
                doc.line(x, y, lx, ly, stroke="#41505c", sw=4.0, dash="14 12")
            doc.text(lx, ly + size * 0.34, label, size=size, fill="#e9eef3",
                     weight="500", halo="#0b1014")
            doc.text(lx, ly + size * 1.20, f"{st.kanji} · {st.daily_boardings:,}",
                     size=size * 0.70, fill="#9fb0be", halo="#0b1014")

        # -- key
        doc.open_layer("key")
        kx = view[0] + view[2] * 0.02
        ky = view[1] + view[3] - 300.0 - (128.0 + 86.0 * len(lines))
        kw, kh = 900.0, 128.0 + 86.0 * len(lines)
        placer.reserve(kx - view[0] + kw / 2, ky - view[1] + kh / 2, kw + 60.0, kh + 40.0)
        doc.rect(kx, ky, kw, kh, fill="#0e1418", stroke="#2a3540", sw=4.0, rx=18.0)
        doc.text(kx + 40.0, ky + 74.0, "LINES", size=52.0, fill="#e9eef3",
                 anchor="start", weight="700", letter_spacing=6.0)
        for i, line in enumerate(lines):
            y = ky + 150.0 + i * 86.0
            doc.line(kx + 46.0, y, kx + 210.0, y, stroke=cols.get(line.id, "#999"),
                     sw=28.0)
            doc.text(kx + 250.0, y + 18.0,
                     f"{line.romaji} {line.kanji} · {line.length_km:g} km · "
                     f"{line.daily_riders:,}/day", size=46.0, fill="#c9d6e0",
                     anchor="start")
        self._title_block(doc, view, pal, "SEIRIN — TRANSIT DIAGRAM",
                          "Stations in line order on straightened tracks; "
                          "ringed circles are interchanges. Diagram positions are "
                          "schematic — the network is not.",
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, "Seirin transit diagram.")

    def _schematic_layout(self, lines, by_id, on_map, iterations: int = 220):
        """Deterministic relaxation for the transit diagram.

        Returns a dict station id -> (x, y) in diagram units. No RNG: the same
        network always produces the same diagram.

        The relaxation is Gauss-Seidel rather than a simultaneous update: pairs
        of stations that are too close are pushed apart one after another, in
        order of how close they are, so the corrections do not cancel each other
        (a simultaneous update on 32 stations crowds them into a frozen cluster).
        Line spacing is then enforced as a soft spring, and the real geography
        acts as a weak anchor so the diagram still reads as this city.
        """
        ids = [st.id for st in on_map]
        idx = {sid: i for i, sid in enumerate(ids)}
        real = np.array([[st.x, st.y] for st in on_map])
        span = np.maximum(real.max(axis=0) - real.min(axis=0), 1.0)
        P = (real - real.min(axis=0)) / span * np.array([2_300.0, 1_600.0])
        anchor = P.copy()
        edges = []
        for line in lines:
            seq = [idx[s] for s in line.stations if s in idx]
            for a, b in zip(seq, seq[1:]):
                edges.append((a, b))
        edges = np.array(edges) if edges else np.zeros((0, 2), int)
        spacing_target, min_sep = 300.0, 240.0
        for _ in range(iterations):
            # springs: equal spacing along each line
            if len(edges):
                d = P[edges[:, 1]] - P[edges[:, 0]]
                dist = np.maximum(np.hypot(d[:, 0], d[:, 1]), 1e-6)
                f = ((dist - spacing_target) / dist)[:, None] * d * 0.30
                P[edges[:, 0]] += f
                P[edges[:, 1]] -= f
            # repulsion, sequentially, closest pairs first
            dd = P[:, None, :] - P[None, :, :]
            dist = np.hypot(dd[:, :, 0], dd[:, :, 1])
            np.fill_diagonal(dist, 1e9)
            for i, j in np.argwhere(np.triu(dist < min_sep, 1)):
                diff = P[j] - P[i]
                length = float(np.hypot(diff[0], diff[1]))
                if length < 1e-6:
                    diff = np.array([1.0, 0.0])
                    length = 1.0
                push = (min_sep - length) / length * 0.5
                P[i] -= diff * push
                P[j] += diff * push
            # weak pull back toward the real geography
            P += (anchor - P) * 0.010
        return {sid: (float(P[idx[sid], 0]), float(P[idx[sid], 1])) for sid in ids}

    # ------------------------------------------------------------------
    # Map 10 — isometric extrusion

    # ------------------------------------------------------------------
    def map_isometric(self, path: str, view: Optional[Tuple[float, float, float, float]] = None,
                      size_px: int = 2000) -> str:
        """An isometric axonometric of the built volume.

        Buildings are extruded by *drawing their real footprints as the top face*
        and the two visible side faces as polygons at the projected height. The
        result is a genuine 2.5-D vector drawing of the city, not a perspective
        render: every polygon is a projected building, so it scales, prints and
        edits like the rest of the atlas.
        """
        pal = DARK
        view = view or (1_050.0 - 3_100.0, 1_150.0 - 2_600.0,
                        1_050.0 + 3_100.0, 1_150.0 + 3_200.0)
        span = view[2] - view[0]
        # Projection: x' = x - y*cos(30°), y' = (x + y)*sin(30°) - z, centred.
        kx, ky = 0.866, 0.5

        def P(x, y, z=0.0):
            return (x - y * kx, (x + y) * ky * 0.5 - z * 1.25)

        # Project the view corners to get a tight viewBox, then keep the inline
        # image size tied to size_px (an SVG whose pixel size equals its world
        # size renders at the wrong scale in browsers and in print).
        corners = [P(*c) for c in ((view[0], view[1]), (view[2], view[1]),
                                   (view[2], view[3]), (view[0], view[3]))]
        px0 = min(c[0] for c in corners)
        px1 = max(c[0] for c in corners)
        py0 = min(c[1] for c in corners) - 260.0
        py1 = max(c[1] for c in corners)
        vw, vh = px1 - px0, py1 - py0
        doc = SvgDoc(size_px, size_px * vh / vw, (px0, py0, px0 + vw, py0 + vh),
                     bg=pal["bg"], title="Seirin — isometric", font=FONT)
        doc.open_layer("ground")
        ground = [P(view[0], view[1]), P(view[2], view[1]),
                  P(view[2], view[3]), P(view[0], view[3])]
        doc.poly(Polygon(ground), fill="#161d1a")
        doc.open_layer("water")
        # Clip the water to the view before projecting: filtering vertices alone
        # would cut bays into straight chords.
        view_box = box(view[0] - 400, view[1] - 400, view[2] + 400, view[3] + 400)
        water = self._water.intersection(view_box).buffer(0)
        for g in ([water] if water.geom_type == "Polygon"
                  else list(getattr(water, "geoms", []))):
            if g.is_empty or g.geom_type != "Polygon":
                continue
            ring = [P(x, y) for (x, y) in g.exterior.coords]
            if len(ring) > 2:
                doc.poly(Polygon(ring), fill="#0c1c28")
        items = []
        for b in self.city.buildings:
            cx, cy = b.centre
            if not (view[0] <= cx <= view[2] and view[1] <= cy <= view[3]):
                continue
            items.append((cx + cy, b))
        items.sort(key=lambda t: t[0])       # far to near in this projection
        doc.open_layer("buildings")
        light = np.array([-0.62, -0.78])     # light from the upper left, in plan
        tops: List[str] = []
        walls: Dict[str, List[str]] = {}
        for _, b in items:
            base = max(0.0, b.elevation)
            top = base + b.height_m
            ring = list(b.polygon.exterior.coords)[:-1]
            if len(ring) < 3:
                continue
            hi = [P(x, y, top) for (x, y) in ring]
            lo = [P(x, y, base) for (x, y) in ring]
            tops.append(path_d_compact(Polygon(hi), precision=0))
            # Walls: keep the faces turned toward the viewer (both plan axes
            # increase toward the camera) and shade them by their real normal.
            n = len(ring)
            for i in range(n):
                j = (i + 1) % n
                (x1, y1), (x2, y2) = ring[i], ring[j]
                ex, ey = x2 - x1, y2 - y1
                length = math.hypot(ex, ey)
                if length < 1e-6:
                    continue
                nx, ny = ey / length, -ex / length
                inward = (nx * (ring[0][0] - x1) + ny * (ring[0][1] - y1)) < 0.0
                if inward:
                    nx, ny = -nx, -ny
                if nx + ny <= 0.02:          # turned away from the viewer
                    continue
                shade = float(np.dot((nx, ny), light))
                fill = ("#20282e" if shade > 0.25 else "#171d22" if shade > -0.2
                        else "#131920")
                walls.setdefault(fill, []).append(
                    path_d_compact(Polygon([hi[i], hi[j], lo[j], lo[i]]),
                                   precision=0))
        doc.path_multi(tops, fill="#2f3941", stroke="#0e1315", sw=1.0)
        for fill, ds in walls.items():
            doc.path_multi(ds, fill=fill)
        doc.open_layer("crowns")
        crown_paths = []
        for _, b in items:
            if b.height_m < 45.0:
                continue
            base = max(0.0, b.elevation)
            ring = [P(x, y, base + b.height_m) for (x, y) in b.polygon.exterior.coords[:-1]]
            if len(ring) > 2:
                crown_paths.append(path_d_compact(Polygon(ring), precision=0))
        doc.path_multi(crown_paths, fill="#e7d9a8", stroke="#ffd479", sw=2.0)
        doc.open_layer("labels")
        placer = LabelPlacer(vw, vh)
        for d in self.districts.districts:
            cx, cy = d["centre"]
            if not (view[0] <= cx <= view[2] and view[1] <= cy <= view[3]):
                continue
            p = P(cx, cy, 0.0)
            pos = placer.place(p[0] - px0, p[1] - py0, d["romaji"], 60.0, priority=8)
            if pos is None:
                continue
            doc.text(pos[0] + px0, pos[1] + py0, d["romaji"], size=60.0,
                     fill="#e9eef3", weight="600", halo="#0a1016")
        doc.text(px0 + vw * 0.03, py0 + vh * 0.06,
                 "SEIRIN — ISOMETRIC EXTRUSION", size=vw * 0.028,
                 fill="#e9eef3", anchor="start", weight="700")
        doc.text(px0 + vw * 0.03, py0 + vh * 0.095,
                 "Every polygon is a projected building footprint extruded to its "
                 "simulated height.", size=vw * 0.0115,
                 fill="#9fb0be", anchor="start")
        return doc.write(path, "Seirin isometric extrusion.")

    # ------------------------------------------------------------------
    # Map 11 — port detail
    # ------------------------------------------------------------------
    def map_port(self, path: str, size_px: int = 2000) -> str:
        pal = DARK
        view = (3_200.0, -5_200.0, 9_600.0, 1_200.0)
        doc = SvgDoc(2_000, 2_000, view, bg="#070d13", title="Seirin — port",
                     font=FONT)
        doc.open_layer("land")
        doc.poly(self._land, fill="#1b2220")
        doc.poly(self._water, fill="#08131c")
        doc.open_layer("bathymetry")
        # Depth contours drawn from the terrain's below-zero field.
        from .base import contour_lines
        for depth, colour in [(-5.0, "#0c2130"), (-10.0, "#0d283a"),
                              (-15.0, "#0f3044"), (-20.0, "#11384f")]:
            for ln in contour_lines(self.terrain.height, depth, X0, Y0, GRID, GRID):
                if ln.bounds[2] < view[0] or ln.bounds[0] > view[2]:
                    continue
                doc.poly(ln, stroke=colour, sw=90.0, opacity=0.9)
        doc.open_layer("terminals")
        for name, (cx, cy, w, d, ang) in PORT_PLATFORMS.items():
            import math as _m
            ca, sa = _m.cos(ang), _m.sin(ang)
            corners = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]
            ring = [(cx + ca * u - sa * v, cy + sa * u + ca * v) for (u, v) in corners]
            doc.poly(Polygon(ring), fill="#3a3d3b", stroke="#5d6b72", sw=60.0)
        doc.open_layer("cranes")
        for poi in self.landmarks.canon:
            if poi.kind == "port":
                for k in range(4):
                    gx = poi.x - 260.0 + k * 175.0
                    gy = poi.y - 190.0
                    doc.poly(LineString([(gx - 22, gy - 22), (gx + 22, gy + 22)]),
                             stroke="#c07a3f", sw=70.0)
                    doc.poly(LineString([(gx - 22, gy + 22), (gx + 22, gy - 22)]),
                             stroke="#c07a3f", sw=70.0)
        self._draw_roads(doc, pal, view,
                         classes=("trunk", "arterial", "collector", "service", "local"),
                         width_scale=1.4)
        doc.open_layer("containers")
        for poi in self.landmarks.canon:
            if poi.kind in ("port", "customs", "drydock"):
                for i in range(18):
                    cx = poi.x - 520.0 + (i % 6) * 36.0
                    cy = poi.y + 120.0 + (i // 6) * 34.0
                    doc.rect(cx, cy, 30.0, 12.0,
                             fill=["#5a3b32", "#3b4a52", "#4a4a3b"][i % 3])
        placer = LabelPlacer(view[2] - view[0], view[3] - view[1])
        for poi in self.landmarks.canon:
            if not (view[0] <= poi.x <= view[2] and view[1] <= poi.y <= view[3]):
                continue
            doc.circle(poi.x, poi.y, 55.0, fill="#ffd479")
            pos = placer.place(poi.x - view[0], poi.y - view[1],
                               poi.romaji.split("(")[0].strip(), 150.0, priority=7)
            if pos is None:
                continue
            doc.text(pos[0] + view[0], pos[1] + view[1],
                     poi.romaji.split("(")[0].strip(), size=150.0, fill="#e9eef3",
                     weight="600", halo="#070d13")
        for x, y, s in [(6_150.0, -3_600.0, "Container berth 320 m"),
                        (5_100.0, -2_300.0, "Dry dock 240 × 46 m"),
                        (2_900.0, -500.0, "Ferry terminal")]:
            if view[0] <= x <= view[2] and view[1] <= y <= view[3]:
                doc.text(x, y, s, size=140.0, fill="#9fb0be")
        self._compass(doc, view, pal, scale_bar_km=0.5)
        self._legend(doc, view, pal, [
            ("Reclaimed quay", "#3a3d3b"), ("Container crane", "#c07a3f"),
            ("—  −5 m", "#0c2130"), ("—  −10 m", "#0d283a"),
            ("—  −15 m", "#0f3044"), ("—  −20 m", "#11384f"),
        ], "PORT", columns=2)
        self._title_block(doc, view, pal, "SEIRIN — PORT",
                          "Container terminals, dry dock, customs and the ferry "
                          "berth · the bay has no bridge",
                          "Seirin city generator · vector geometry, no raster data")
        return doc.write(path, "Seirin port map.")

    # -- the whole atlas ---------------------------------------------------
    def build_all(self, out_dir: str) -> Dict[str, str]:
        os.makedirs(out_dir, exist_ok=True)
        written: Dict[str, str] = {}
        written["regional"] = self.map_regional(os.path.join(out_dir, "01_regional_situation.svg"))
        written["city_dark"] = self.map_city(os.path.join(out_dir, "02_city_plan_dark.svg"))
        written["city_plate"] = self.map_city(os.path.join(out_dir, "03_city_plan_print.svg"),
                                              palette="plate")
        written["zoning"] = self.map_zoning(os.path.join(out_dir, "06_zoning.svg"))
        written["population"] = self.map_thematic(os.path.join(out_dir, "07_population_density.svg"),
                                                  "population")
        written["value"] = self.map_thematic(os.path.join(out_dir, "08_land_value.svg"), "value")
        written["quake"] = self.map_thematic(os.path.join(out_dir, "09_seismic_risk.svg"), "risk")
        written["elderly"] = self.map_thematic(os.path.join(out_dir, "10_ageing.svg"), "elderly")
        written["transit"] = self.map_transit_schematic(
            os.path.join(out_dir, "11_transit_diagram.svg"))
        written["hydrology"] = self.map_hydrology(os.path.join(out_dir, "12_hydrology.svg"))
        written["night"] = self.map_night(os.path.join(out_dir, "13_night_plate.svg"))
        written["isometric"] = self.map_isometric(os.path.join(out_dir, "14_isometric.svg"))
        written["port"] = self.map_port(os.path.join(out_dir, "15_port.svg"))
        for d in self.districts.districts:
            if d["id"] in ("rural_north", "rural_west", "rural_east", "rural_south"):
                continue
            written[f"district_{d['id']}"] = self.map_district(
                os.path.join(out_dir, "districts", f"20_district_{d['id']}.svg"), d["id"])
        return written


def _darken(hex_colour: str, factor: float) -> str:
    h = hex_colour.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return "#{:02x}{:02x}{:02x}".format(
        int(max(0, min(255, r * factor))), int(max(0, min(255, g * factor))),
        int(max(0, min(255, b * factor))))


def _lighten(hex_colour: str, amount: float) -> str:
    h = hex_colour.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return "#{:02x}{:02x}{:02x}".format(
        int(min(255, r + (255 - r) * amount)), int(min(255, g + (255 - g) * amount)),
        int(min(255, b + (255 - b) * amount)))


def _poly_area(poly) -> float:
    return poly.area if poly is not None else 0.0
