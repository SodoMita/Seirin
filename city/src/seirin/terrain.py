"""Seirin terrain: bay, coastline, river system, coastal plain and the
Tenro/Kamikura mountain range.

The height field is *the* single source of geographic truth: coastline, water
polygons, river channels, port reclamation and the buildability of every parcel
are all derived from it, so the city can never contradict its own geography.

Sign convention: `height` is elevation in metres above sea level; anything
strictly below 0 is water (sea floor, bay floor, river channels). The shoreline
is therefore exactly the 0-contour of this field.

Geography in one paragraph. Seirin sits on the Pacific side of central Honshu.
Seirin Bay is a broad, shallow bay open to the south; reclaimed quays line its
eastern shore, and the city's waterfront districts ring its northern rim. The
Kamikura river drains the northern range, runs through the old town of Tsukimachi
and enters the bay between the old town and the industrial belt; the Nagare
drains the eastern hills straight to the open sea; the Tetsuba canal was dredged
through the industrial belt to the dock basins. North of the coastal plain the
Tenro/Kamikura range rises to ~900 m and holds the Kamikura spring, the mountain
villages and the Shelf-4 works.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

import numpy as np
from shapely.geometry import LineString, MultiPolygon, Polygon
from shapely.ops import unary_union

from .base import Rng, contour_polygons, fbm, ridged, smoothstep, value_noise
from .raster import distance_transform, smooth

# Model frame ---------------------------------------------------------------
X0, X1 = -11_000.0, 12_000.0        # east-west extent of the model
Y0, Y1 = -8_800.0, 14_500.0         # south-north extent of the model
GRID = 20.0                          # height-field cell size (metres)

# Seirin Bay: a rough circle whose centre lies offshore, so the shoreline arcs
# around the harbour districts and the bay opens to the south.
BAY_CENTRE = (2_400.0, -4_400.0)
BAY_RADIUS = 4_350.0
SEA_LEVEL = 0.0

# Reclaimed port platforms: (cx, cy, width, depth, rotation). Straight quay
# walls only exist where people built them; everywhere else the coast is natural.
PORT_PLATFORMS = {
    "terminal_2": (6_150.0, -2_250.0, 1_500.0, 620.0, math.radians(-32.0)),
    "terminal_3": (7_700.0, -1_050.0, 1_250.0, 560.0, math.radians(-32.0)),
    "drydock_row": (5_100.0, -1_480.0, 800.0, 400.0, math.radians(-32.0)),
    "bulk_yard": (7_050.0, -3_000.0, 900.0, 520.0, math.radians(-32.0)),
}


def _bay_radius(theta: np.ndarray, seed: int) -> np.ndarray:
    """Headlands and inlets: the bay rim is noised, never a perfect arc."""
    return BAY_RADIUS * (
        1.0
        + 0.10 * (value_noise(np.cos(theta) * 2.4 + 8.0, np.sin(theta) * 2.4 + 8.0, seed) - 0.5) * 2
        + 0.05 * (value_noise(np.cos(theta) * 7.0 + 2.0, np.sin(theta) * 7.0 + 2.0, seed + 3) - 0.5) * 2
    )


def _sea_line(x: np.ndarray) -> np.ndarray:
    """Southern limit of the land outside the bay (the open Pacific)."""
    return -5_350.0 + 420.0 * np.sin(x / 3_900.0) + 180.0 * np.sin(x / 1_500.0 + 2.0)


@dataclass
class River:
    name_kanji: str
    name_romaji: str
    points: List[Tuple[float, float]]      # head -> mouth
    half_width: List[float]                # channel half-width at each point
    bed: List[float]                       # thalweg elevation at each point (m)
    discharge_m3s: float = 18.0
    kind: str = "river"                    # river | canal | creek

    def line(self) -> LineString:
        return LineString(self.points)


class Terrain:
    """Discrete height field plus the geography derived from it."""

    def __init__(self, rng: Rng):
        self.rng = rng
        self.seed = rng.seed_for("terrain")
        self._build_grid()
        self._make_rivers()
        self._elevate()
        self._derive_water()
        self.slope = self.slope_grid()

    # -- construction ------------------------------------------------------
    def _build_grid(self):
        self.xs = np.arange(X0, X1 + GRID, GRID)
        self.ys = np.arange(Y0, Y1 + GRID, GRID)
        self.gx, self.gy = np.meshgrid(self.xs, self.ys)
        self.shape = self.gx.shape
        dx = self.gx - BAY_CENTRE[0]
        dy = self.gy - BAY_CENTRE[1]
        self.bay_dist = np.hypot(dx, dy)
        self.bay_rim = _bay_radius(np.arctan2(dy, dx), self.seed)
        self.bay_inset = self.bay_rim - self.bay_dist        # > 0 inside the bay
        self.sea_inset = _sea_line(self.gx) - self.gy        # > 0 in the open sea

    def _make_rivers(self):
        """The water system, from the canon's geography."""
        self.rivers: List[River] = [
            River(
                name_kanji="上倉川", name_romaji="Kamikura-gawa", kind="river",
                points=[(3_150.0, 14_200.0), (2_760.0, 12_400.0), (2_180.0, 10_600.0),
                        (1_700.0, 9_100.0), (1_240.0, 7_700.0), (880.0, 6_300.0),
                        (620.0, 5_100.0), (330.0, 4_050.0), (120.0, 3_050.0),
                        (-40.0, 2_100.0), (-160.0, 1_180.0), (-150.0, 280.0),
                        (-60.0, -520.0), (60.0, -1_250.0)],
                half_width=[3.0, 4.0, 5.5, 7.0, 9.0, 12.0, 14.0, 16.0, 18.0,
                            21.0, 24.0, 27.0, 30.0, 34.0],
                bed=[470.0, 330.0, 215.0, 140.0, 88.0, 52.0, 31.0, 18.0, 10.0,
                     5.4, 2.6, 0.9, -0.4, -1.8],
                discharge_m3s=22.0,
            ),
            River(
                name_kanji="流川", name_romaji="Nagare-gawa", kind="river",
                points=[(10_400.0, 12_600.0), (9_400.0, 10_700.0), (8_300.0, 8_900.0),
                        (7_400.0, 7_200.0), (6_600.0, 5_600.0), (6_100.0, 4_200.0),
                        (6_000.0, 2_800.0), (6_300.0, 1_400.0), (7_000.0, 200.0),
                        (7_700.0, -900.0), (8_300.0, -2_400.0), (8_500.0, -4_200.0),
                        (8_400.0, -5_800.0)],
                half_width=[3.0, 4.5, 6.0, 8.0, 10.0, 12.0, 13.0, 14.0, 15.0,
                            17.0, 19.0, 21.0, 24.0],
                bed=[380.0, 275.0, 190.0, 128.0, 86.0, 56.0, 34.0, 19.0, 10.5,
                     5.0, 1.4, -1.2, -2.6],
                discharge_m3s=15.0,
            ),
            River(
                name_kanji="鉄場運河", name_romaji="Tetsuba-unga", kind="canal",
                points=[(330.0, 2_050.0), (1_600.0, 1_960.0), (2_900.0, 2_000.0),
                        (4_200.0, 1_930.0), (5_000.0, 1_380.0), (5_400.0, 600.0),
                        (5_500.0, -600.0), (5_300.0, -1_480.0)],
                half_width=[13.0, 13.0, 13.0, 14.0, 15.0, 17.0, 19.0, 22.0],
                bed=[1.6, 0.9, 0.2, -0.6, -1.6, -2.4, -3.0, -3.6],
                discharge_m3s=6.0,
            ),
        ]
        for i, (kj, rj) in enumerate([("桜谷川", "Sakuradani-gawa"),
                                      ("石倉川", "Ishikura-gawa"),
                                      ("雨霧川", "Amagiri-gawa"),
                                      ("鈴森川", "Suzumori-gawa")]):
            sx = 400.0 + 2_600.0 * i
            sy = 9_400.0 - 900.0 * i
            self.rivers.append(River(
                name_kanji=kj, name_romaji=rj, kind="creek",
                points=[(sx + 1_400.0, sy + 2_600.0), (sx + 700.0, sy + 1_600.0),
                        (sx + 250.0, sy + 700.0), (sx - 120.0, sy - 200.0)],
                half_width=[2.5, 4.0, 6.0, 8.0],
                bed=[210.0 + 70.0 * i, 120.0 + 40.0 * i, 42.0 + 16.0 * i,
                     6.0 + 2.0 * i],
                discharge_m3s=3.0 + 1.5 * i,
            ))
        # Channel fields (distance, half-width, bed elevation, downstream
        # ordering), computed per river inside a local window.
        self.river_fields: List[Dict[str, np.ndarray]] = []
        for rv in self.rivers:
            fields = polyline_fields(self.gx, self.gy, rv.points,
                                     [rv.half_width, rv.bed], margin=900.0)
            self.river_fields.append(fields)

    def _elevate(self):
        """Land elevation, bay and open-sea excavation, reclamation, rivers."""
        seed = self.seed
        inland = -self.bay_inset                       # > 0 on land, grows inland
        plain = (1.4
                 + 24.0 * (1.0 - np.exp(-np.clip(inland, 0, None) / 2_000.0))
                 + 40.0 * smoothstep(1_400.0, 6_500.0, np.clip(inland, 0, None)))
        north = 660.0 * smoothstep(5_200.0, 13_800.0, self.gy) ** 1.25
        east = 190.0 * smoothstep(6_500.0, 11_000.0, self.gx) * smoothstep(1_500.0, 7_000.0, self.gy)
        west = 140.0 * smoothstep(-6_000.0, -10_500.0, self.gx) * smoothstep(1_000.0, 6_000.0, self.gy)
        ridges = 250.0 * ridged(self.gx / 2_600.0, self.gy / 2_600.0, octaves=5,
                                seed=seed + 11) * smoothstep(900.0, 7_000.0, self.gy)
        hills = 48.0 * fbm(self.gx / 1_150.0, self.gy / 1_150.0, octaves=5, seed=seed + 5)
        fine = 5.0 * fbm(self.gx / 210.0, self.gy / 210.0, octaves=3, seed=seed + 9)
        h = plain + north + east + west + ridges + hills + fine

        # Bay and open sea: excavate a basin whose depth grows offshore.
        depth_bay = 3.0 + 0.055 * np.clip(self.bay_inset, 0.0, None)
        depth_sea = 4.0 + 0.05 * np.clip(self.sea_inset, 0.0, None)
        wet = np.maximum(self.bay_inset, self.sea_inset)
        h = np.where(wet > 0, -np.maximum(depth_bay, depth_sea), h)

        # Reclaimed port platforms flatten whatever is under them.
        self.flat_masks: Dict[str, np.ndarray] = {}
        flat = np.zeros_like(h, dtype=bool)
        for name, (cx, cy, w, d, ang) in PORT_PLATFORMS.items():
            c, s = math.cos(ang), math.sin(ang)
            px = (self.gx - cx) * c + (self.gy - cy) * s
            py = -(self.gx - cx) * s + (self.gy - cy) * c
            m = (np.abs(px) < w / 2) & (np.abs(py) < d / 2)
            self.flat_masks[name] = m
            flat |= m
        h = np.where(flat, 3.4, h)

        # Rivers: carve a channel at the graded bed, then blend smoothly back to
        # the undisturbed land across the valley floor and walls. A blend (rather
        # than a min()) is C1-smooth, scales with the terrain and cannot clamp a
        # whole district flat — the failure mode of a hard valley profile.
        VALLEY_WIDTH = {"river": 620.0, "creek": 340.0, "canal": 95.0}
        self.channel_masks: List[np.ndarray] = []
        for fields, rv in zip(self.river_fields, self.rivers):
            d, hw, bed = fields["dist"], fields["a0"], fields["a1"]
            w = VALLEY_WIDTH.get(rv.kind, 400.0)
            blend = smoothstep(hw, hw + w, d)
            h = bed + (h - bed) * blend
            self.channel_masks.append(d < hw)

        coastal = smoothstep(3_400.0, 0.0, np.abs(self.gy))
        for fields, rv in zip(self.river_fields, self.rivers):
            if rv.kind == "creek":
                continue
            d, hw, bed = fields["dist"], fields["a0"], fields["a1"]
            low = smoothstep(26.0, 4.0, bed)          # only the lower reaches
            band = (d > hw * 1.02) & (d < hw + 17.0)
            dyke = np.where(band, 2.4 + 0.30 * np.abs(d - hw * 1.7), 0.0)
            h = h + np.minimum(dyke, 6.8) * coastal * low

        if not np.all(np.isfinite(h)):
            raise RuntimeError("terrain height field produced non-finite values")
        self.height = smooth(h, 0.6).astype(np.float32)

    def _derive_water(self):
        self.sea = self.height < SEA_LEVEL
        channel = np.zeros(self.shape, dtype=bool)
        for m in getattr(self, "channel_masks", []):
            channel |= m
        self.channel = channel
        self.water = self.sea | channel
        self.dist_water = distance_transform(self.water) * GRID

    def slope_grid(self) -> np.ndarray:
        gy, gx = np.gradient(self.height.astype(np.float64), GRID, GRID)
        return np.hypot(gx, gy).astype(np.float32)

    # -- queries -----------------------------------------------------------
    def _cell(self, x: float, y: float) -> Tuple[int, int]:
        i = int(np.clip(round((x - X0) / GRID), 0, self.shape[1] - 1))
        j = int(np.clip(round((y - Y0) / GRID), 0, self.shape[0] - 1))
        return i, j

    def height_at(self, x: float, y: float) -> float:
        i, j = self._cell(x, y)
        return float(self.height[j, i])

    def height_grid(self, x: np.ndarray, y: np.ndarray) -> np.ndarray:
        fx = np.clip((x - X0) / GRID, 0, self.shape[1] - 1.001)
        fy = np.clip((y - Y0) / GRID, 0, self.shape[0] - 1.001)
        i0 = fx.astype(int)
        j0 = fy.astype(int)
        tx, ty = fx - i0, fy - j0
        h00 = self.height[j0, i0]
        h10 = self.height[j0, i0 + 1]
        h01 = self.height[j0 + 1, i0]
        h11 = self.height[j0 + 1, i0 + 1]
        return ((h00 * (1 - tx) + h10 * tx) * (1 - ty)
                + (h01 * (1 - tx) + h11 * tx) * ty)

    def slope_at(self, x: float, y: float) -> float:
        i, j = self._cell(x, y)
        return float(self.slope[j, i])

    def is_water(self, x: float, y: float) -> bool:
        i, j = self._cell(x, y)
        return bool(self.water[j, i])

    def distance_to_water(self, x: float, y: float) -> float:
        i, j = self._cell(x, y)
        return float(self.dist_water[j, i])

    def buildable(self, x: float, y: float, max_slope: float = 0.30) -> bool:
        i, j = self._cell(x, y)
        return (not bool(self.water[j, i])) and float(self.slope[j, i]) <= max_slope

    def min_elevation_grid(self) -> np.ndarray:
        """Flood-risk proxy: how low the land is next to each cell."""
        low = np.where(self.water, 0.0, np.clip(self.height, 0.0, 800.0))
        return smooth(low, 6.0)

    # -- vector geography --------------------------------------------------
    def land_polygons(self, min_area: float = 4_000.0) -> List[Polygon]:
        """Land above sea level — the coastline comes from the 0-contour.

        The height field is padded with land on every side before extraction, so
        the sea — including the open Pacific band along the southern edge — is a
        basin fully enclosed inside the padded grid and every coastline becomes a
        closed ring. (Padding only the landward sides leaves the coastline open
        where it meets the frame edge, and an open isoline cannot be turned into
        a polygon.)

        The coastline ring bounds the *sea*, so the land is the complement: the
        faces polygonized from the rings that lie below sea level are unioned and
        subtracted from the padded frame. Islands in the bay and the port
        platforms come out of this automatically, holes and all.
        """
        h = self.height
        pad = np.empty((h.shape[0] + 2, h.shape[1] + 2), dtype=h.dtype)
        pad[1:-1, 1:-1] = h
        pad[0, :] = 1.0e6
        pad[-1, :] = 1.0e6
        pad[:, 0] = 1.0e6
        pad[:, -1] = 1.0e6
        px0, py0 = X0 - GRID, Y0 - GRID
        px1, py1 = X1 + GRID, Y1 + GRID
        wet_faces = contour_polygons(pad, SEA_LEVEL, px0, py0, GRID, GRID, above=False)
        sea = unary_union(wet_faces) if wet_faces else None
        padded_frame = Polygon([(px0, py0), (px1, py0), (px1, py1), (px0, py1)])
        land = padded_frame if sea is None else padded_frame.difference(sea)
        frame = Polygon([(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)])
        clipped = land.intersection(frame)
        parts: List[Polygon] = []
        if clipped.is_empty:
            return []
        for g in ([clipped] if clipped.geom_type == "Polygon"
                  else list(getattr(clipped, "geoms", []))):
            if isinstance(g, Polygon) and g.area > min_area:
                parts.append(g)
        parts.sort(key=lambda p: p.area, reverse=True)
        return parts

    def land_union(self) -> Polygon | MultiPolygon:
        return unary_union(self.land_polygons())

    def water_polygon(self) -> Polygon | MultiPolygon:
        extent = Polygon([(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)])
        return extent.difference(self.land_union())

    def river_water_polygons(self) -> List[Polygon]:
        """Water surfaces of rivers/canals that lie *above* the sea.

        The sea and bay are one body of water; each river channel is carved as a
        trench, so its water surface is the part of that trench inside the land.
        """
        land = self.land_union()
        out: List[Polygon] = []
        for rv in self.rivers:
            if rv.kind == "creek" and float(np.max(rv.half_width)) < 6.0:
                continue
            sock = rv.line().buffer(1.0, cap_style=2, join_style=2)
            # variable-width ribbon: offset the centreline by the local half-width
            parts = []
            pts = rv.points
            for i in range(len(pts) - 1):
                seg = LineString([pts[i], pts[i + 1]])
                w = 0.5 * (rv.half_width[i] + rv.half_width[i + 1])
                parts.append(seg.buffer(w, cap_style=2, join_style=2))
            ribbon = unary_union(parts)
            piece = ribbon.intersection(land)
            if not piece.is_empty:
                out.append(piece)
        merged = unary_union(out)
        if isinstance(merged, Polygon):
            return [merged]
        return [g for g in merged.geoms if isinstance(g, Polygon)]

    def contours(self, levels: Sequence[float]) -> Dict[float, List[LineString]]:
        from .base import contour_lines
        return {lv: contour_lines(self.height, lv, X0, Y0, GRID, GRID)
                for lv in levels}

    def sample_profile(self, p: Tuple[float, float], q: Tuple[float, float],
                       n: int = 64) -> Tuple[np.ndarray, np.ndarray]:
        ts = np.linspace(0.0, 1.0, n)
        xs = p[0] + (q[0] - p[0]) * ts
        ys = p[1] + (q[1] - p[1]) * ts
        return ts, self.height_grid(xs, ys)


def polyline_fields(gx: np.ndarray, gy: np.ndarray,
                    points: Sequence[Sequence[float]],
                    attributes: Sequence[Sequence[float]],
                    margin: float = 800.0) -> Dict[str, np.ndarray]:
    """Fields of `dist`, `along` and each interpolated attribute for a polyline.

    For every grid cell the nearest point on the polyline is found; `dist` is the
    distance to it, `along` the normalised position (0 at the head, 1 at the
    mouth) and each attribute is linearly interpolated there. Computed inside a
    local window for speed; far cells get a large finite distance so downstream
    arithmetic never sees infinity.
    """
    pts = np.asarray(points, dtype=float)
    attrs = [np.asarray(a, dtype=float) for a in attributes]
    FAR = 1.0e6
    full_d = np.full(gx.shape, FAR, dtype=np.float64)
    full_along = np.zeros(gx.shape, dtype=np.float64)
    full_attrs = [np.full(gx.shape, float(a[0]), dtype=np.float64) for a in attrs]
    x0 = pts[:, 0].min() - margin
    x1 = pts[:, 0].max() + margin
    y0 = pts[:, 1].min() - margin
    y1 = pts[:, 1].max() + margin
    i0 = max(0, int((x0 - gx[0, 0]) / (gx[0, 1] - gx[0, 0])))
    i1 = min(gx.shape[1], int((x1 - gx[0, 0]) / (gx[0, 1] - gx[0, 0])) + 1)
    j0 = max(0, int((y0 - gy[0, 0]) / (gy[1, 0] - gy[0, 0])))
    j1 = min(gy.shape[0], int((y1 - gy[0, 0]) / (gy[1, 0] - gy[0, 0])) + 1)
    seg_len = np.hypot(np.diff(pts[:, 0]), np.diff(pts[:, 1]))
    cum = np.concatenate([[0.0], np.cumsum(seg_len)])
    total = float(cum[-1]) if cum[-1] > 0 else 1.0
    if i1 <= i0 or j1 <= j0:
        return {"dist": full_d, "along": full_along,
                **{f"a{k}": v for k, v in enumerate(full_attrs)}}
    sx = gx[j0:j1, i0:i1]
    sy = gy[j0:j1, i0:i1]
    best_d = np.full(sx.shape, FAR)
    best_along = np.zeros(sx.shape)
    best_attrs = [np.full(sx.shape, float(a[0])) for a in attrs]
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        ab = b - a
        L2 = float(ab @ ab)
        px = sx - a[0]
        py = sy - a[1]
        t = np.clip((px * ab[0] + py * ab[1]) / max(L2, 1e-9), 0.0, 1.0)
        d = np.hypot(px - ab[0] * t, py - ab[1] * t)
        closer = d < best_d
        best_d = np.where(closer, d, best_d)
        best_along = np.where(closer, (cum[i] + seg_len[i] * t) / total, best_along)
        for k, attr in enumerate(attrs):
            v = attr[i] + (attr[i + 1] - attr[i]) * t
            best_attrs[k] = np.where(closer, v, best_attrs[k])
    full_d[j0:j1, i0:i1] = best_d
    full_along[j0:j1, i0:i1] = best_along
    for k in range(len(attrs)):
        full_attrs[k][j0:j1, i0:i1] = best_attrs[k]
    return {"dist": full_d, "along": full_along,
            **{f"a{k}": v for k, v in enumerate(full_attrs)}}
