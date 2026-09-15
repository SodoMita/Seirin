"""Seirin districts: the canon's five named quarters plus every generated
sub-neighbourhood (machi), land-use zoning and the microclimate/socio-economic
character of each area.

The five canon districts come from the design document (Hikari-no-Machi,
Tsukimachi, Tetsuba, the Port, and the mountain settlements). Everything below
that level — the individual *machi* with their own names, densities and land
use — is generated deterministically, so the city has a plausible internal
administrative structure of the kind a real Japanese city has (17 wards, ~120
neighbourhoods) without inventing any names that contradict canon.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
from shapely.geometry import LineString, MultiPolygon, Point, Polygon
from shapely.ops import unary_union
from shapely.prepared import prep

from .base import NameBank, Rng, obb, rect_polygon, smoothstep
from .raster import normalize, sample_bilinear, smooth
from .terrain import GRID, X0, X1, Y0, Y1, Terrain

# --------------------------------------------------------------------------
# Canon anchors — coordinates chosen so the city reads as one coherent city
# --------------------------------------------------------------------------

# (id, romaji, kanji, centre, kind, canon?)
DISTRICTS: List[Dict] = [
    dict(id="hikari", romaji="Hikari-no-Machi", kanji="光の町", centre=(1_050.0, 1_150.0),
         kind="cbd", canon=True, radius=1900.0, far=6.5, density=1.0,
         character="Деловой и развлекательный центр: стекло, реклама, холодный свет.",
         english="Light Quarter"),
    dict(id="tsukimachi", romaji="Tsukimachi", kanji="月町", centre=(-3_250.0, 3_150.0),
         kind="oldtown", canon=True, radius=1850.0, far=2.2, density=0.7,
         character="Старый город: чайные дома, рынки, святилища, дерево и дождь.",
         english="Moon Quarter"),
    dict(id="tetsuba", romaji="Tetsuba", kanji="鉄場", centre=(2_700.0, 2_650.0),
         kind="industrial", canon=True, radius=2400.0, far=1.2, density=0.35,
         character="Промышленный пояс: доки, ремонтные площадки, R&D-центр, ветхое жильё.",
         english="Iron Yard"),
    dict(id="port", romaji="Seirin-kō", kanji="青凛港", centre=(6_400.0, -2_150.0),
         kind="port", canon=True, radius=1_900.0, far=0.6, density=0.1,
         character="Контейнерные терминалы, ремонтные доки, логистика.",
         english="Seirin Port"),
    dict(id="minami", romaji="Minami-Tetsuba", kanji="南鉄場", centre=(4_950.0, 700.0),
         kind="reclaimed_housing", canon=False, radius=1450.0, far=2.6, density=0.85,
         character="Послевоенная засыпка: плотные кварталы, галереи, мастерские.",
         english="South Iron Yard"),
    dict(id="naka", romaji="Naka-machi", kanji="中町", centre=(600.0, 3_100.0),
         kind="mixed", canon=False, radius=1700.0, far=3.0, density=0.75,
         character="Район между вокзалом и старым городом: магазины, офисы, апартаменты.",
         english="Central Quarter"),
    dict(id="higashi", romaji="Higashi-kōgai", kanji="東郊外", centre=(8_100.0, 3_900.0),
         kind="suburb", canon=False, radius=2150.0, far=1.2, density=0.55,
         character="Дальний пригород у холмов: односемейные дома, школы, поля.",
         english="East Suburb"),
    dict(id="nishi", romaji="Nishi-kōgai", kanji="西郊外", centre=(-7_100.0, 2_600.0),
         kind="suburb", canon=False, radius=2100.0, far=1.0, density=0.45,
         character="Западные жилые холмы, огороды, старая железная дорога.",
         english="West Suburb"),
    dict(id="minato_kita", romaji="Kita-Minato", kanji="北港", centre=(3_350.0, -700.0),
         kind="waterfront", canon=False, radius=1500.0, far=2.0, density=0.6,
         character="Набережная: склады, рынок, малая верфь, променад.",
         english="North Harbour"),
    dict(id="tenro", romaji="Tenro-sanson", kanji="天露山村", centre=(900.0, 9_600.0),
         kind="mountain_village", canon=True, radius=1_500.0, far=0.25, density=0.12,
         character="Горные поселения у святилища Тэнро и источника Камикуры.",
         english="Tenro Mountain Villages"),
    dict(id="kamikura", romaji="Kamikura", kanji="上倉", centre=(3_900.0, 8_000.0),
         kind="mountain_village", canon=True, radius=1_300.0, far=0.2, density=0.1,
         character="Верхняя долина Камикуры: термальные ванны, лесозаготовка.",
         english="Kamikura"),
    dict(id="shelf4", romaji="Shelf-4", kanji="棚四", centre=(-2_400.0, 11_200.0),
         kind="construction", canon=True, radius=1_100.0, far=0.1, density=0.05,
         character="Площадка проекта «Шельф-4»: отсыпка, склады, охрана.",
         english="Shelf-4 Works"),
    # Rural zones exist so the urban wards keep a plausible size: a Japanese
    # municipality of this population always includes large forested uplands.
    dict(id="rural_north", romaji="Kita-sanson", kanji="北山村", centre=(5_600.0, 10_800.0),
         kind="rural", canon=False, radius=4_600.0, far=0.0, density=0.02,
         character="Северные леса и водосборный бассейн Камикуры.",
         english="Northern Forest"),
    dict(id="rural_west", romaji="Nishi-sanson", kanji="西山", centre=(-8_600.0, 7_600.0),
         kind="rural", canon=False, radius=4_400.0, far=0.0, density=0.02,
         character="Западные хребты: лесозаготовка, террасы, заброшенные деревни.",
         english="Western Range"),
    dict(id="rural_south", romaji="Minami-nōson", kanji="南農村", centre=(-6_400.0, -3_600.0),
         kind="rural", canon=False, radius=3_400.0, far=0.15, density=0.05,
         character="Южное побережье: рисовые поля, теплицы, рыбацкие стоянки.",
         english="South Coast Farmland"),
    dict(id="rural_east", romaji="Higashi-sanson", kanji="東山", centre=(10_300.0, 7_400.0),
         kind="rural", canon=False, radius=3_600.0, far=0.05, density=0.03,
         character="Восточные холмы: чайные террасы, карьеры, дачи.",
         english="Eastern Hills"),
]


def _as_polygon_list(geom) -> List[Polygon]:
    g = _polygons_only(geom)
    if g is None:
        return []
    return [g] if g.geom_type == "Polygon" else list(g.geoms)


def _polygons_only(geom) -> Optional[Polygon | MultiPolygon]:
    """Keep only the polygonal part of an arbitrary geometry, or None."""
    if geom is None or geom.is_empty:
        return None
    if geom.geom_type in ("Polygon", "MultiPolygon"):
        return geom
    parts = [g for g in getattr(geom, "geoms", []) if g.geom_type in ("Polygon", "MultiPolygon")]
    if not parts:
        return None
    return unary_union(parts)


@dataclass
class Neighbourhood:
    """A generated *machi* — the level below a canon district."""
    id: str
    romaji: str
    kanji: str
    district_id: str
    polygon: Polygon
    anchor: Tuple[float, float]
    kind: str                       # residential|commercial|industrial|...
    population: int = 0
    jobs: int = 0
    households: int = 0
    density_class: str = "medium"
    mean_income_kyen: float = 3_800.0
    land_value_kper_sqm: float = 90.0
    built_year_median: int = 1994
    flood_risk: float = 0.0
    slope_risk: float = 0.0

    @property
    def area_m2(self) -> float:
        return self.polygon.area


class DistrictSystem:
    """Partitions the land into districts and neighbourhoods, and zones it."""

    def __init__(self, rng: Rng, terrain: Terrain, names: NameBank):
        self.rng = rng.sub("districts")
        self.terrain = terrain
        self.names = names
        self.land = terrain.land_union()
        self.districts: List[Dict] = []
        self.neighbourhoods: List[Neighbourhood] = []
        self._build_districts()
        self._build_neighbourhoods()
        self._zone_neighbourhoods()

    # -- districts ---------------------------------------------------------
    def _build_districts(self):
        for spec in DISTRICTS:
            d = dict(spec)
            d["polygon"] = None
            self.districts.append(d)

        # Weighted Voronoi over an adaptive point set: candidate sites are the
        # district centres plus the street-grid seeds of every district, so a
        # district with a larger radius claims proportionally more land.
        sites: List[Tuple[float, float, int]] = []
        for i, d in enumerate(self.districts):
            cx, cy = d["centre"]
            sites.append((cx, cy, i))
            ring = 6 if d["kind"] not in ("mountain_village", "construction") else 3
            for k in range(ring):
                a = 2 * math.pi * (k / ring) + self.rng.uniform(-0.2, 0.2)
                r = d["radius"] * self.rng.uniform(0.55, 0.95)
                sites.append((cx + math.cos(a) * r, cy + math.sin(a) * r, i))

        # Rasterise the Voronoi cell id on a coarse grid, then polygonise the
        # raster with the same isoline machinery used everywhere else.
        cell = 60.0
        xs = np.arange(X0, X1 + cell, cell)
        ys = np.arange(Y0, Y1 + cell, cell)
        gx, gy = np.meshgrid(xs, ys)
        best = np.full(gx.shape, np.inf)
        owner = np.full(gx.shape, -1, dtype=np.int32)
        for (sx, sy, di) in sites:
            d = self.districts[di]
            # weighted distance: higher weight => site reaches further
            w = max(0.30, (d["radius"] / 1_400.0) ** 0.72)
            dist = np.hypot(gx - sx, gy - sy) / w
            closer = dist < best
            best = np.where(closer, dist, best)
            owner = np.where(closer, di, owner)

        # Grow districts over the water to their nearest land cell so that the
        # harbour belongs to the port, not to whoever is closest across the bay.
        from scipy import ndimage
        water = self.terrain.water
        wxs = np.arange(X0, X1 + GRID, GRID)
        wys = np.arange(Y0, Y1 + GRID, GRID)
        owner_full = np.full(water.shape, -1, dtype=np.int32)
        for j, y in enumerate(ys):
            jj = int(round((y - Y0) / GRID))
            if 0 <= jj < water.shape[0]:
                for i, x in enumerate(xs):
                    ii = int(round((x - X0) / GRID))
                    if 0 <= ii < water.shape[1]:
                        owner_full[jj, ii] = owner[j, i]
        # fill water from the nearest owned land cell, then block-fill holes
        idx = ndimage.distance_transform_edt(owner_full < 0, return_distances=False,
                                             return_indices=True)
        owner_full = owner_full[tuple(idx)]
        owner_full = ndimage.median_filter(owner_full, size=3)

        # Polygonise per district id. The raster is padded with a sentinel that
        # belongs to no district, so every district — including one that reaches
        # the model frame — closes into a ring inside the padded array and can be
        # turned into a polygon. (Padding by repeating the edge does NOT work:
        # the region then runs off the array and its isoline stays open.)
        from .base import contour_polygons
        padded = np.pad(owner_full, 1, mode="constant", constant_values=-1)
        for i, d in enumerate(self.districts):
            field = (padded == i).astype(np.float64) - 0.5
            polys = contour_polygons(field, 0.0, X0 - GRID, Y0 - GRID, GRID, GRID,
                                     above=True)
            if not polys:
                continue
            g = unary_union(polys).intersection(self.land)
            d["polygon"] = _polygons_only(g)

    # -- neighbourhoods ----------------------------------------------------
    def _build_neighbourhoods(self):
        for d in self.districts:
            poly = d["polygon"]
            if poly is None:
                continue
            want = {"cbd": 9, "oldtown": 8, "industrial": 6, "port": 5,
                    "reclaimed_housing": 6, "mixed": 7, "suburb": 7,
                    "waterfront": 4, "mountain_village": 5,
                    "construction": 2, "rural": 6}[d["kind"]]
            pieces = self._split_polygon(poly, want, d)
            for k, piece in enumerate(pieces):
                if piece.area < 40_000.0:
                    continue
                kanji, romaji = self.names.neighbourhood()
                anchor = (piece.representative_point().x, piece.representative_point().y)
                kind = self._machi_kind(d["kind"], piece)
                nb = Neighbourhood(
                    id=f"{d['id']}-{k + 1:02d}", romaji=romaji, kanji=kanji,
                    district_id=d["id"], polygon=piece, anchor=anchor, kind=kind,
                )
                self.neighbourhoods.append(nb)
        # A name bank keyed by machi id lets every later stage (streets, blocks,
        # landmarks) draw from the same vocabulary without collisions.
        self.machi_by_id = {n.id: n for n in self.neighbourhoods}

    def _split_polygon(self, poly, want: int, d: Dict) -> List[Polygon]:
        """Split a district into `want` compact pieces using farthest-point seeds
        and a growth process biased by the local land use."""
        rng = self.rng
        minx, miny, maxx, maxy = poly.bounds
        # Candidate sites: a grid of points inside the polygon, k-means-ed into
        # `want` compact clusters (Lloyd). Simple, stable, and never leaves a
        # cluster empty the way random farthest-point seeding can.
        step = max(40.0, math.sqrt(poly.area / (want * 22.0)))
        cx = np.arange(minx, maxx + step, step)
        cy = np.arange(miny, maxy + step, step)
        gxs, gys = np.meshgrid(cx, cy)
        from shapely import contains_xy
        inside = contains_xy(poly, gxs.ravel(), gys.ravel())
        cand = np.column_stack([gxs.ravel()[inside], gys.ravel()[inside]])
        if len(cand) < want * 2:
            return [poly]
        best = None
        for attempt in range(4):
            k = min(want, len(cand))
            idx = rng.np.choice(len(cand), size=k, replace=False)
            cent = cand[idx].astype(float)
            for _ in range(24):
                d = ((cand[:, None, :] - cent[None, :, :]) ** 2).sum(axis=2)
                lab = d.argmin(axis=1)
                new = np.array([cand[lab == j].mean(axis=0) if np.any(lab == j) else cent[j]
                                for j in range(k)])
                if np.allclose(new, cent):
                    break
                cent = new
            # score: prefer compact, equal-sized clusters
            sizes = np.array([np.sum(lab == j) for j in range(k)], dtype=float)
            score = float(sizes.std() / max(1.0, sizes.mean()))
            if best is None or score < best[0]:
                best = (score, cent.copy())
        pts = [tuple(p) for p in best[1]]
        if len(pts) < 2:
            return [poly]
        sx = np.array([p[0] for p in pts])
        sy = np.array([p[1] for p in pts])
        cell = 45.0
        xs = np.arange(minx - cell, maxx + cell, cell)
        ys = np.arange(miny - cell, maxy + cell, cell)
        gx, gy = np.meshgrid(xs, ys)
        best = np.full(gx.shape, np.inf)
        owner = np.zeros(gx.shape, dtype=np.int32)
        for i in range(len(pts)):
            dist = np.hypot(gx - sx[i], gy - sy[i])
            closer = dist < best
            best = np.where(closer, dist, best)
            owner = np.where(closer, i, owner)

        from .base import contour_polygons
        out: List[Polygon] = []
        padded = np.pad(owner, 1, mode="constant", constant_values=-1)
        for i in range(len(pts)):
            field = (padded == i).astype(np.float64) - 0.5
            polys = contour_polygons(field, 0.0, xs[0] - cell, ys[0] - cell, cell, cell,
                                     above=True)
            if not polys:
                continue
            for part in _as_polygon_list(unary_union(polys).intersection(poly)):
                if part.area > 30_000.0:
                    out.append(part)
        return out or [poly]

    def _machi_kind(self, district_kind: str, piece: Polygon) -> str:
        if district_kind == "cbd":
            return "commercial"
        if district_kind == "oldtown":
            return "commercial" if self.rng.chance(0.45) else "residential_low"
        if district_kind == "industrial":
            return self.rng.weighted(["industrial", "residential_low", "warehouse"],
                                     [0.6, 0.25, 0.15])
        if district_kind == "port":
            return "port"
        if district_kind in ("suburb",):
            return self.rng.weighted(["residential_low", "residential_mid", "farmland"],
                                     [0.55, 0.2, 0.25])
        if district_kind == "mountain_village":
            return self.rng.weighted(["village", "forest"], [0.45, 0.55])
        if district_kind == "construction":
            return "construction"
        if district_kind == "rural":
            return self.rng.weighted(["forest", "farmland", "village"], [0.6, 0.3, 0.1])
        if district_kind == "waterfront":
            return self.rng.weighted(["warehouse", "commercial", "residential_mid"],
                                     [0.4, 0.3, 0.3])
        return self.rng.weighted(["residential_mid", "residential_low", "commercial"],
                                 [0.5, 0.3, 0.2])

    # -- zoning ------------------------------------------------------------
    def _zone_neighbourhoods(self):
        """Per-neighbourhood density, income, land value and risk — the numbers
        that later drive buildings, the economy and the household simulation."""
        rng = self.rng
        ter = self.terrain
        for nb in self.neighbourhoods:
            anchor = nb.anchor
            h = ter.height_at(*anchor)
            slope = ter.slope_at(*anchor)
            d_water = ter.distance_to_water(*anchor)
            d_cbd = math.dist(anchor, (1_050.0, 1_150.0))
            d_station = math.dist(anchor, (1_450.0, 1_900.0))
            flat = 1.0 - smoothstep(0.02, 0.22, slope)
            nb.slope_risk = float(smoothstep(0.18, 0.55, slope))
            nb.flood_risk = float(smoothstep(900.0, 40.0, d_water) * (1.0 - smoothstep(6.0, 22.0, h)))

            base_density = {"commercial": 1.0, "residential_mid": 0.85,
                            "forest": 0.02,
                            "residential_low": 0.5, "industrial": 0.25,
                            "warehouse": 0.15, "port": 0.08, "farmland": 0.08,
                            "village": 0.15, "forest": 0.02,
                            "construction": 0.02}[nb.kind]
            accessibility = math.exp(-d_station / 2_600.0) * 0.6 + math.exp(-d_cbd / 2_200.0) * 0.4
            nb.density_class = ("high" if base_density * accessibility > 0.55 else
                                "medium" if base_density * accessibility > 0.2 else "low")
            # Built-up density scales with accessibility, flatness and kind.
            nb.built_density = float(np.clip(base_density * (0.45 + 0.75 * accessibility) * flat, 0.0, 1.25))

            # Income: CBD and west hills are richer, industrial and port edges poorer.
            rich = (0.55 * math.exp(-d_cbd / 1_500.0)
                    + 0.25 * smoothstep(0.0, 220.0, h)
                    + 0.20 * smoothstep(2_800.0, 800.0, abs(anchor[1])))
            nb.mean_income_kyen = float(np.clip(2_600.0 + 4_100.0 * rich + rng.normal(0, 220),
                                                2_150.0, 9_400.0))
            nb.land_value_kper_sqm = float(np.clip(
                28.0 + 320.0 * math.exp(-d_cbd / 1_700.0) + 90.0 * math.exp(-d_station / 1_400.0)
                + 70.0 * rich - 40.0 * nb.flood_risk + rng.normal(0, 6), 12.0, 520.0))
            parent = next(d for d in self.districts if d["id"] == nb.district_id)
            nb.built_year_median = int(np.clip(rng.normal(
                {"cbd": 2004, "oldtown": 1958, "industrial": 1979, "port": 1990,
                 "reclaimed_housing": 1968, "mixed": 1988, "suburb": 1996,
                 "waterfront": 1994, "mountain_village": 1949,
                 "construction": 2031, "rural": 1952}[parent["kind"]]
                + {"commercial": 0, "residential_mid": -9, "residential_low": -14,
                   "industrial": -6, "warehouse": -4, "port": -2, "farmland": -22,
                   "village": -12, "forest": -30, "construction": 0}[nb.kind], 11),
                1938, 2032))

    # -- queries -----------------------------------------------------------
    def district_at(self, x: float, y: float) -> Optional[Dict]:
        p = Point(x, y)
        for d in self.districts:
            if d["polygon"] is not None and d["polygon"].contains(p):
                return d
        return None

    def neighbourhood_at(self, x: float, y: float) -> Optional[Neighbourhood]:
        p = Point(x, y)
        for nb in self.neighbourhoods:
            if nb.polygon.contains(p):
                return nb
        return None

    def totals(self) -> Dict[str, float]:
        return {
            "districts": len(self.districts),
            "neighbourhoods": len(self.neighbourhoods),
            "land_km2": round(self.land.area / 1e6, 2),
        }
