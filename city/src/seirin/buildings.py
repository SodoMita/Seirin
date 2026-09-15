"""Parcels (land lots) and the buildings on them.

Japanese zoning is explicit and numeric, so it is reproduced here rather than
invented: each neighbourhood is assigned a *yōto chiku* (use district) and that
assigns the legal envelope every building must respect —

======================  =========  =====  =========================
use district            FAR (容積)  BCR    storeys allowed
======================  =========  =====  =========================
1-shu jūkyo             200 %      60 %   low-rise only
2-shu jūkyo             300 %      60 %   up to 4 storeys
1-chū jūkyo             300 %      60 %   mid-rise
2-chū jūkyo             400 %      60 %   mid-rise, commercial OK
jun-shōgyō              500 %      80 %   neighbourhood commerce
kin-shōgyō              700 %      80 %   commercial
kōgyō / jun-kōgyō       200–400 %  60 %   industrial
shigaichi-ka     (fire)   -         -    rebuilt after a fire
======================  =========  =====  =========================

Parcels are cut out of the blocks by recursively splitting on the long axis, the
way a plot map actually subdivides, and each building's footprint, height and
material follow from the envelope, the local land value, the earthquake code in
force when it was built, and the microclimate.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import split, unary_union
from shapely.strtree import STRtree

from .base import Rng, japanese_address, obb, rect_polygon
from .districts import DistrictSystem, Neighbourhood
from .roads import RoadNetwork
from .terrain import Terrain

# yōto chiku -> (FAR, BCR, max storeys, allowed kinds)
ZONING = {
    "1shu": dict(far=2.00, bcr=0.60, storeys=(1, 2), label="1種低層住居専用",
                 kanji="一種低層", kinds=("house",)),
    "2shu": dict(far=3.00, bcr=0.60, storeys=(1, 4), label="2種中高層住居専用",
                 kanji="二種住居", kinds=("house", "apart")),
    "1chu": dict(far=3.00, bcr=0.60, storeys=(2, 7), label="1種中高層住居専用",
                 kanji="一種中高層", kinds=("house", "apart")),
    "2chu": dict(far=4.00, bcr=0.60, storeys=(2, 10), label="2種中高層住居専用",
                 kanji="二種中高層", kinds=("house", "apart", "shop")),
    "jusho": dict(far=5.00, bcr=0.80, storeys=(2, 12), label="準住居地域",
                  kanji="準住居", kinds=("house", "apart", "shop", "office")),
    "kin": dict(far=7.00, bcr=0.80, storeys=(3, 24), label="近隣商業地域",
                kanji="近隣商業", kinds=("shop", "office", "apart", "house")),
    "sho": dict(far=8.00, bcr=0.80, storeys=(4, 40), label="商業地域",
                kanji="商業", kinds=("tower", "office", "shop", "hotel", "apart")),
    "junko": dict(far=3.00, bcr=0.60, storeys=(1, 6), label="準工業地域",
                  kanji="準工業", kinds=("factory", "warehouse", "apart", "shop")),
    "ko": dict(far=2.00, bcr=0.60, storeys=(1, 5), label="工業専用地域",
               kanji="工業専用", kinds=("factory", "warehouse", "plant", "tank")),
    "none": dict(far=0.40, bcr=0.30, storeys=(1, 3), label="市街化調整区域",
                 kanji="調整区域", kinds=("house", "barn")),
}

# machi kind -> the zoning that kind attracts
ZONE_OF = {
    "commercial": ("sho", "kin"),
    "residential_mid": ("2chu", "1chu", "jusho"),
    "residential_low": ("1shu", "2shu", "1chu"),
    "industrial": ("ko", "junko"),
    "warehouse": ("junko", "ko"),
    "port": ("ko",),
    "farmland": ("none", "1shu"),
    "village": ("none", "1shu"),
    "forest": ("none",),
    "construction": ("none",),
}

BUILDING_MATERIALS = {
    "house": ("wood", "#c9a882"),
    "barn": ("wood", "#8d7b5f"),
    "apart": ("rc", "#b9b3a6"),
    "shop": ("steel", "#a9a49a"),
    "office": ("steel", "#9aa6b0"),
    "tower": ("src", "#8f9aa6"),
    "hotel": ("rc", "#a89c8e"),
    "factory": ("steel", "#9d9c94"),
    "warehouse": ("steel", "#8fa0a0"),
    "plant": ("steel", "#93988f"),
    "tank": ("steel", "#a0a8a4"),
}


@dataclass
class Building:
    id: int
    polygon: Polygon
    kind: str
    storeys: int
    height_m: float
    foot_m2: float
    floor_m2: float
    year: int
    zoning: str
    material: str
    colour: str
    use: str
    district_id: str
    machi_id: str
    address: str
    occupants: int = 0
    units: int = 0
    jobs: int = 0
    value_myen: float = 0.0
    risk_quake: float = 0.0
    risk_fire: float = 0.0
    elevation: float = 0.0
    # roof geometry, filled by the 3-D stage
    roof: str = "flat"
    rotation: float = 0.0
    far_applied: float = 2.0
    bcr_applied: float = 0.6
    landmark: bool = False
    centre: Tuple[float, float] = (0.0, 0.0)

    @property
    def centroid_xy(self) -> Tuple[float, float]:
        return self.centre


class Parcel:
    __slots__ = ("id", "polygon", "block_id", "machi_id", "district_id",
                 "zoning", "address", "area", "land_value_myen", "building_ids")

    def __init__(self, pid, polygon, block_id, nb: Neighbourhood):
        self.id = pid
        self.polygon = polygon
        self.block_id = block_id
        self.machi_id = nb.id
        self.district_id = nb.district_id
        self.zoning = "1shu"
        self.address = ""
        self.area = polygon.area
        self.land_value_myen = 0.0
        self.building_ids: List[int] = []


class City:
    """Parcels + buildings for a whole city, plus the stock statistics."""

    def __init__(self, rng: Rng, terrain: Terrain, districts: DistrictSystem,
                 roads: RoadNetwork, names):
        self.rng = rng.sub("buildings")
        self.terrain = terrain
        self.districts = districts
        self.roads = roads
        self.names = names
        self.blocks: List[Polygon] = []
        self.parcels: List[Parcel] = []
        self.buildings: List[Building] = []
        self._bid = 0
        self.parcels_of_building: Dict[int, int] = {}
        self._assign_zoning()
        self._make_blocks()
        self._make_parcels()
        self._make_buildings()
        self.dropped_in_water = self._drop_in_water()
        self._statistics()

    # -- zoning ------------------------------------------------------------
    def _assign_zoning(self):
        rng = self.rng
        for nb in self.districts.neighbourhoods:
            opts = ZONE_OF.get(nb.kind, ("1shu",))
            # Accessibility raises the permitted intensity: near the station the
            # same plot is zoned commercial, far away it is low-rise housing.
            if nb.kind == "commercial" or getattr(nb, "built_density", 0.5) > 0.72:
                weights = [0.45, 0.55] if len(opts) > 1 else [1.0]
            elif nb.kind in ("farmland", "forest", "village"):
                weights = [0.9, 0.1] if len(opts) > 1 else [1.0]
            else:
                weights = [0.5, 0.35, 0.15][:len(opts)] if len(opts) > 1 else [1.0]
            nb.zoning = opts[int(rng.np.choice(len(opts), p=np.array(weights) / sum(weights)))]

    # -- blocks ------------------------------------------------------------
    def _make_blocks(self):
        """Block faces of the street graph, minus unbuildable ground."""
        faces = self.roads.blocks()
        ter = self.terrain
        kept: List[Polygon] = []
        for poly in faces:
            rp = poly.representative_point()
            # Blocks are bounded by real streets: reject anything crossed by water.
            if ter.is_water(rp.x, rp.y):
                continue
            if poly.area > 220_000.0:
                # A single huge face means the street net is too sparse there
                # (fields, mountains): cut it into block-sized pieces.
                kept.extend(self._chop(poly, 120.0))
            else:
                kept.append(poly)
        self.blocks = kept
        self._block_index = STRtree(kept)

    def _chop(self, poly: Polygon, target: float) -> List[Polygon]:
        out = [poly]
        guard = 0
        while guard < 60:
            guard += 1
            big = [p for p in out if p.area > 4.5 * target ** 2]
            if not big:
                break
            for p in big:
                out.remove(p)
                minx, miny, maxx, maxy = p.bounds
                if (maxx - minx) > (maxy - miny):
                    xm = 0.5 * (minx + maxx)
                    cutter = LineString([(xm, miny - 5.0), (xm, maxy + 5.0)])
                else:
                    ym = 0.5 * (miny + maxy)
                    cutter = LineString([(minx - 5.0, ym), (maxx + 5.0, ym)])
                for g in split(p, cutter).geoms:
                    if g.area > 300.0:
                        out.append(g)
        return out

    # -- parcels -----------------------------------------------------------
    def _make_parcels(self):
        rng = self.rng
        pid = 0
        for bi, block in enumerate(self.blocks):
            rp = block.representative_point()
            nb = self.districts.neighbourhood_at(rp.x, rp.y)
            if nb is None:
                continue
            # Target lot area per land use. Japanese urban lots are small: a
            # detached house in a residential district typically sits on 130-250
            # m2, a shop on 100-200 m2, while a factory yard runs to hectares.
            min_area = {"commercial": 190.0, "residential_mid": 155.0,
                        "residential_low": 245.0, "industrial": 2_100.0,
                        "warehouse": 1_600.0, "port": 3_200.0, "farmland": 6_500.0,
                        "village": 430.0, "forest": 22_000.0,
                        "construction": 5_500.0}[nb.kind]
            # A block is subdivided until every lot is at or below a local target
            # size — the plot pattern, derived from the block's own area so the
            # result has the grain of its district rather than a global scale.
            target = min_area * float(rng.uniform(0.85, 1.35))
            lots = self._subdivide(block, target)
            for lot in lots:
                if lot.area < min_area * 0.22:
                    continue
                p = Parcel(pid, lot, bi, nb)
                p.zoning = nb.zoning
                chome = (int(abs(hash(nb.id)) % 9) + 1)
                block_no = (bi % 40) + 1
                banchi = (pid % 30) + 1
                parent = next(d for d in self.districts.districts if d["id"] == nb.district_id)
                p.address = japanese_address(parent["kanji"] + nb.kanji, chome, block_no, banchi)
                p.land_value_myen = lot.area * nb.land_value_kper_sqm / 1_000.0 * rng.uniform(0.85, 1.15)
                self.parcels.append(p)
                pid += 1
        self._parcel_index = STRtree([p.polygon for p in self.parcels])

    def _subdivide(self, poly: Polygon, target: float, depth: int = 0) -> List[Polygon]:
        """Recursive long-axis splitting with a street frontage bias."""
        if depth > 7 or poly.area <= target * 1.32:
            return [poly]
        minx, miny, maxx, maxy = poly.bounds
        long_x = (maxx - minx) >= (maxy - miny)
        length = (maxx - minx) if long_x else (maxy - miny)
        if length < 9.0:
            return [poly]
        # Split at a jittered position so lots are not all the same width.
        frac = float(np.clip(self.rng.normal(0.5, 0.09), 0.3, 0.7))
        if long_x:
            xm = minx + (maxx - minx) * frac
            cutter = LineString([(xm, miny - 4.0), (xm, maxy + 4.0)])
        else:
            ym = miny + (maxy - miny) * frac
            cutter = LineString([(minx - 4.0, ym), (maxx + 4.0, ym)])
        out: List[Polygon] = []
        try:
            pieces = list(split(poly, cutter).geoms)
        except Exception:
            return [poly]
        if len(pieces) < 2:
            return [poly]
        for g in pieces:
            if g.geom_type != "Polygon" or g.area < 40.0:
                continue
            out.extend(self._subdivide(g, target, depth + 1))
        return out or [poly]

    # -- buildings ---------------------------------------------------------
    # Storey count and target total floor area per building type. These are the
    # Japanese empirical ranges (a detached house is ~95-135 m2 of floor, a shop
    # 1-3 storeys of 90-260 m2, and so on); the use district's FAR/BCR then acts
    # as a legal *cap* on top of them, never as a target to build towards.
    TYPE_MODEL = {
        "house":   dict(storeys=(1, 3), style="lognorm", median=2.0, sigma=0.30,
                        floor=(85.0, 165.0), wood=0.92),
        "barn":    dict(storeys=(1, 1), style="fixed", median=1.0, sigma=0.0,
                        floor=(40.0, 140.0), wood=0.95),
        "apart":   dict(storeys=(2, 14), style="lognorm", median=3.4, sigma=0.42,
                        floor=(420.0, 3_600.0), wood=0.28),
        "shop":    dict(storeys=(1, 5), style="lognorm", median=2.0, sigma=0.40,
                        floor=(90.0, 1_400.0), wood=0.22),
        "office":  dict(storeys=(3, 14), style="lognorm", median=4.6, sigma=0.40,
                        floor=(420.0, 7_500.0), wood=0.03),
        "hotel":   dict(storeys=(3, 12), style="lognorm", median=5.0, sigma=0.35,
                        floor=(700.0, 6_000.0), wood=0.05),
        "tower":   dict(storeys=(12, 46), style="site", median=20.0, sigma=0.35,
                        floor=(6_000.0, 60_000.0), wood=0.0),
        "factory": dict(storeys=(1, 3), style="lognorm", median=1.5, sigma=0.35,
                        floor=(600.0, 12_000.0), wood=0.08),
        "warehouse": dict(storeys=(1, 2), style="fixed", median=1.2, sigma=0.2,
                          floor=(500.0, 9_000.0), wood=0.05),
        "plant":   dict(storeys=(1, 3), style="lognorm", median=2.0, sigma=0.3,
                        floor=(900.0, 14_000.0), wood=0.0),
        "tank":    dict(storeys=(1, 1), style="fixed", median=1.0, sigma=0.0,
                        floor=(60.0, 900.0), wood=0.0),
    }

    def _make_buildings(self):
        """Build each lot once.

        Order of decisions, which is the order a real lot is developed in:
        use district -> legal FAR/BCR cap; the building *type* the market puts
        there; the storey count and floor area typical for that type; the
        footprint that produces that floor area within the coverage ratio; and
        finally the seismic code in force in its construction year, which is what
        actually determines how it behaves in an earthquake.
        """
        rng = self.rng
        ter = self.terrain
        self.landmark_sites = self._pick_redevelopment_sites()
        for p in self.parcels:
            nb = self.districts.machi_by_id[p.machi_id]
            z = ZONING[p.zoning]
            if nb.kind == "forest" and rng.py.random() < 0.985:
                continue
            if nb.kind == "construction" and rng.py.random() < 0.9:
                continue
            c = p.polygon.representative_point()
            if ter.is_water(c.x, c.y):
                continue                      # never build in the bay or a channel
            h = ter.height_at(c.x, c.y)
            slope = ter.slope_at(c.x, c.y)
            if slope > 0.65 and nb.kind not in ("village", "forest"):
                continue
            intensity = float(np.clip(getattr(nb, "built_density", 0.4), 0.02, 1.2))
            fill = {"commercial": 0.95, "residential_mid": 0.93,
                    "residential_low": 0.84, "industrial": 0.71, "warehouse": 0.69,
                    "port": 0.60, "farmland": 0.09, "village": 0.42,
                    "forest": 0.02, "construction": 0.04}[nb.kind]
            if rng.py.random() > fill * (0.55 + 0.6 * min(1.0, intensity)):
                continue

            site = self.landmark_sites.get(p.id)
            kind = self._pick_kind(nb, z, p, site)
            model = self.TYPE_MODEL[kind]
            lo_s, hi_s = model["storeys"]
            if model["style"] == "site":
                storeys = int(np.clip(round(site["storeys"] * rng.uniform(0.8, 1.05)),
                                      lo_s, hi_s)) if site else 12
            elif model["style"] == "lognorm":
                storeys = int(np.clip(round(rng.lognorm(model["median"], model["sigma"])),
                                      lo_s, hi_s))
            else:
                storeys = int(np.clip(round(rng.normal(model["median"], model["sigma"])),
                                      lo_s, hi_s))

            # Land value and accessibility push a lot towards the top of its type.
            demand = float(np.clip((nb.land_value_kper_sqm - 45.0) / 250.0, 0.0, 1.0))
            if rng.py.random() < 0.55 * demand and storeys < hi_s:
                storeys += 1
            # And the legal envelope caps it.
            far, bcr = z["far"], z["bcr"]
            if site:
                far, bcr = max(far, site["far"]), max(bcr, site["bcr"])

            flo, fhi = model["floor"]
            target_floor = float(np.exp(np.log(flo) + (np.log(fhi) - np.log(flo))
                                        * float(np.clip(rng.beta(2.2, 2.6), 0.0, 1.0))))
            if site:
                target_floor = max(target_floor, site.get("floor_m2", 8_000.0))
            target_floor = min(target_floor, far * p.polygon.area)

            inset = 0.9 if nb.kind in ("commercial", "residential_mid") else 1.6
            foot = p.polygon.buffer(-inset)
            if foot.is_empty or foot.geom_type not in ("Polygon", "MultiPolygon"):
                foot = p.polygon.buffer(-0.3)
            if foot.is_empty:
                continue
            target_foot = min(foot.area * bcr, target_floor / max(storeys, 1))
            foot = self._fit_area(foot, target_foot)
            if foot is None or foot.is_empty:
                continue
            if foot.geom_type == "MultiPolygon":
                foot = max(foot.geoms, key=lambda g: g.area)
            if foot.geom_type != "Polygon" or foot.area < 24.0:
                continue
            # Whatever the plan said, the built result cannot exceed the coverage
            # ratio or the floor-area ratio.
            foot = self._fit_area(foot, min(foot.area, bcr * p.polygon.area))
            if foot is None or foot.is_empty:
                continue
            if foot.geom_type == "MultiPolygon":
                foot = max(foot.geoms, key=lambda g: g.area)
            if foot.geom_type != "Polygon" or foot.area < 24.0:
                continue
            floor_total = min(foot.area * storeys, far * p.polygon.area)
            # Reconcile height with the footprint actually achieved, so a
            # trimmed footprint does not silently carry the original floor area.
            storeys = int(np.clip(round(floor_total / max(foot.area, 1.0)), 1, hi_s))

            height = storeys * (3.35 if kind in ("office", "apart", "hotel", "tower")
                                else 3.05 if kind in ("shop", "factory", "warehouse",
                                                      "plant")
                                else 2.85)
            material, colour = BUILDING_MATERIALS[kind]
            if rng.py.random() < model["wood"]:
                material, colour = "wood", BUILDING_MATERIALS["house"][1]
            year = int(np.clip(rng.normal(nb.built_year_median + 6, 13), 1931, 2032))
            if kind == "tower":
                year = int(np.clip(rng.normal(2013, 8), 1978, 2033))
            occ, units, jobs = self._occupancy(kind, floor_total, nb)
            b = Building(
                id=self._bid, polygon=foot, kind=kind, storeys=storeys, height_m=height,
                foot_m2=foot.area, floor_m2=floor_total, year=year, zoning=p.zoning,
                material=material, colour=colour, use=kind, district_id=p.district_id,
                machi_id=p.machi_id, address=p.address, occupants=occ, units=units,
                elevation=h,
            )
            b.centre = (foot.centroid.x, foot.centroid.y)
            b.rotation = float(obb(np.array(foot.exterior.coords))[4])
            b.jobs = jobs
            b.value_myen = self._value(b, nb, p)
            b.risk_quake = self._quake_risk(b, nb)
            b.risk_fire = float(np.clip(0.15 + 0.5 * (b.material == "wood")
                                        - 0.2 * (1.0 - nb.flood_risk), 0.02, 0.85))
            b.roof = ("gabled" if kind in ("house", "barn")
                      else "hip" if kind == "apart"
                      else "flat" if kind in ("office", "tower", "factory", "plant")
                      else "shed" if kind in ("warehouse", "shop")
                      else "flat")
            b.landmark = bool(site)
            # The envelope actually applied to this lot: the use district's limits,
            # raised where a district plan covers a redevelopment site. Recorded so
            # the invariant checks test what was applied, not a global default.
            b.far_applied = float(far)
            b.bcr_applied = float(bcr)
            self.buildings.append(b)
            p.building_ids.append(b.id)
            self.parcels_of_building[b.id] = p.id
            self._bid += 1

    def _pick_redevelopment_sites(self) -> Dict[int, Dict]:
        """A few assembled sites where a district plan allows real towers.

        Towers are not the default outcome of Japanese zoning — they happen on
        large consolidated lots with a special plan, always near the station, the
        civic core or a waterfront redevelopment area. Selecting the highest-value
        large lots reproduces that pattern instead of sprinkling high-rises.
        """
        rng = self.rng
        cand = []
        for p in self.parcels:
            if p.area < 450.0:
                continue
            nb = self.districts.machi_by_id[p.machi_id]
            if nb.kind not in ("commercial", "residential_mid", "waterfront", "port"):
                continue
            # A redevelopment site is a big lot in an expensive place.
            score = (p.land_value_myen / 1_000.0) ** 1.15 * (p.area / 500.0) ** 0.55
            cand.append((score, p))
        cand.sort(key=lambda t: -t[0])
        sites: Dict[int, Dict] = {}
        chosen_points: List[Tuple[float, float]] = []
        for score, p in cand:
            if len(sites) >= 30:
                break
            xy = (p.polygon.centroid.x, p.polygon.centroid.y)
            if any(math.dist(xy, q) < 480.0 for q in chosen_points):
                continue
            chosen_points.append(xy)
            storeys = int(np.clip(rng.lognorm(21.0, 0.40), 12, 46))
            sites[p.id] = dict(
                storeys=storeys,
                far=float(np.clip(storeys * 0.62, 6.0, 26.0)),
                bcr=0.85 if storeys > 18 else 0.8,
                floor_m2=float(p.polygon.area * np.clip(storeys * 0.62, 6.0, 26.0) * 0.72))
        return sites

    def _pick_storeys(self, nb: Neighbourhood, z: Dict, p: Parcel) -> int:
        rng = self.rng
        lo, hi = z["storeys"]
        # Land value drives height: developers build to the envelope where land
        # is dear, and to one storey where it is cheap.
        lv = p.polygon.area and nb.land_value_kper_sqm
        drive = float(np.clip((lv - 30.0) / 300.0, 0.0, 1.0))
        span = max(0, hi - lo)
        base = lo + span * (drive ** 1.6) + rng.normal(0, 0.7)
        if nb.kind == "forest":
            base = lo
        return int(np.clip(round(base), lo, hi))

    def _pick_kind(self, nb: Neighbourhood, z: Dict, p: Parcel,
                   site: Optional[Dict] = None) -> str:
        """The use the market actually puts on this lot.

        The use district decides what is legal; within that, the neighbourhood's
        land use decides what is likely. A lot in a residential machi is far more
        likely to hold a house than an office even where both are permitted.
        """
        rng = self.rng
        if site is not None:
            return rng.weighted(["tower", "office", "hotel", "apart", "shop"],
                                [0.52, 0.24, 0.10, 0.10, 0.04])
        allowed = list(z["kinds"])
        if nb.kind == "port" and "warehouse" in allowed:
            w = [0.55 if k == "warehouse" else 0.12 for k in allowed]
            return rng.weighted(allowed, w)
        weights = {
            "house": 1.0, "apart": 0.75, "shop": 0.55, "office": 0.35,
            "tower": 0.02, "hotel": 0.06, "factory": 0.5, "warehouse": 0.5,
            "plant": 0.12, "tank": 0.05, "barn": 0.5,
        }
        mix = {
            "commercial": dict(shop=2.2, office=1.8, apart=1.5, house=0.25, hotel=1.4),
            "residential_mid": dict(house=0.5, apart=2.6, shop=0.6, office=0.3),
            "residential_low": dict(house=3.0, apart=0.35, shop=0.25, office=0.05),
            "industrial": dict(factory=1.6, warehouse=1.4, apart=0.7, house=0.4, shop=0.3),
            "warehouse": dict(warehouse=2.0, factory=1.2, shop=0.2),
            "port": dict(warehouse=2.0, factory=1.0, plant=1.0, tank=0.6),
            "farmland": dict(house=1.6, barn=1.2),
            "village": dict(house=2.4, barn=0.8, shop=0.3),
            "forest": dict(house=1.0),
            "construction": dict(warehouse=0.6, plant=0.4),
        }.get(nb.kind, {})
        w = []
        for k in allowed:
            v = weights.get(k, 0.3) * mix.get(k, 1.0)
            w.append(max(1e-6, v))
        return rng.weighted(allowed, w)

    @staticmethod
    def _fit_area(poly, target_area: float):
        """Shrink a footprint so that it covers about `target_area`.

        A negative buffer of distance d removes about ``d * perimeter`` of area,
        so the first attempt is analytic — one buffer call gets within a few
        percent for compact lots. Only when the shape is so convoluted that the
        estimate misses badly does the code fall back to bisection.
        """
        if poly.area <= target_area or target_area <= 0:
            return poly
        if poly.geom_type == "MultiPolygon":
            poly = max(poly.geoms, key=lambda g: g.area)
        if poly.geom_type != "Polygon":
            return poly
        per = poly.exterior.length
        if per <= 0:
            return poly
        d0 = max(0.02, (poly.area - target_area) / per)
        cand = poly.buffer(-d0)
        if not cand.is_empty:
            if cand.geom_type == "MultiPolygon":
                cand = max(cand.geoms, key=lambda g: g.area)
            if cand.geom_type == "Polygon" and abs(cand.area - target_area) <= 0.18 * target_area:
                return cand
        lo, hi = 0.0, d0 * 2.2
        best = None
        for _ in range(10):
            mid = 0.5 * (lo + hi)
            cand = poly.buffer(-mid)
            if cand.is_empty:
                hi = mid
                continue
            if cand.geom_type == "MultiPolygon":
                cand = max(cand.geoms, key=lambda g: g.area)
            if cand.geom_type != "Polygon":
                hi = mid
                continue
            if cand.area > target_area:
                lo = mid
            else:
                hi = mid
                best = cand
        return best if best is not None else poly

    def _occupancy(self, kind: str, floor_m2: float, nb: Neighbourhood):
        """Returns (residents, dwellings, jobs) for a building.

        Densities are the Japanese national averages: 92 m2 per dwelling with
        2.35 people in it, one office worker per 22 m2 of office floor.
        """
        rng = self.rng
        if kind in ("house", "barn"):
            if kind == "barn":
                return 0, 0, 0
            people = int(np.clip(rng.normal(2.55, 1.05), 1, 7))
            return people, 1, 0
        if kind in ("apart", "tower"):
            units = max(1, int(floor_m2 / rng.uniform(74.0, 108.0)))
            return int(round(units * rng.uniform(1.85, 2.5))), units, 0
        if kind == "hotel":
            return 0, max(4, int(floor_m2 / 34.0)), int(floor_m2 / 120.0)
        if kind in ("office",):
            return 0, 0, int(floor_m2 / rng.uniform(19.0, 26.0))
        if kind in ("shop",):
            return 0, 0, int(floor_m2 / rng.uniform(24.0, 42.0))
        if kind in ("factory", "warehouse", "plant", "tank"):
            return 0, 0, int(floor_m2 / rng.uniform(58.0, 130.0))
        return 1, 0, 0

    def _value(self, b: Building, nb: Neighbourhood, p: Parcel) -> float:
        """Replacement + land value in millions of yen (2026 yen)."""
        build_cost = {"wood": 0.20, "steel": 0.30, "rc": 0.36, "src": 0.46}[b.material]
        age = max(0, 2032 - b.year)
        build = b.floor_m2 * build_cost * max(0.18, 1.0 - 0.011 * age)
        return float(build + p.land_value_myen)

    def _quake_risk(self, b: Building, nb: Neighbourhood) -> float:
        """Old timber on soft reclaimed ground is the dangerous combination —
        this is the standard Japanese seismic-risk heuristic, not a decoration.
        """
        code = 1.0 if b.year >= 2000 else 0.62 if b.year >= 1981 else 0.34
        soil = 1.0 - 0.55 * nb.flood_risk
        timber = 0.82 if b.material == "wood" else 1.0
        soft_storey = 0.9 if (b.material == "wood" and b.storeys >= 3) else 1.0
        return float(np.clip((1.0 - code * soil * timber * soft_storey) * 0.85, 0.0, 0.9))

    # -- statistics --------------------------------------------------------
    def _drop_in_water(self):
        """Final guard: a footprint may not extend onto open water.

        The per-building test uses a single representative point, which is enough
        for the 20 m height grid but not for a footprint that straddles the quay
        edge, so every footprint is tested against the water polygon itself.
        """
        water = self.terrain.water_polygon()
        if water.is_empty:
            return 0
        from shapely.prepared import prep
        pw = prep(water)
        kept = []
        for b in self.buildings:
            # A footprint that is mostly over water is not a building; one that
            # clips the quay edge by a metre or two is a building on a quay.
            if b.polygon.intersects(water):
                overlap = b.polygon.intersection(water).area
                if overlap / max(b.polygon.area, 1e-6) > 0.5:
                    continue
            kept.append(b)
        removed = len(self.buildings) - len(kept)
        self.buildings = kept
        return removed

    def _statistics(self):
        self.stats: Dict[str, float] = {}
        if not self.buildings:
            return
        floors = np.array([b.floor_m2 for b in self.buildings])
        people = np.array([b.occupants for b in self.buildings])
        self.stats = {
            "buildings": len(self.buildings),
            "parcels": len(self.parcels),
            "blocks": len(self.blocks),
            "floor_km2": round(float(floors.sum()) / 1e6, 2),
            "population": int(people.sum()),
            "value_gyen": round(sum(b.value_myen for b in self.buildings) / 1e3, 1),
            "mean_height_m": round(float(np.mean([b.height_m for b in self.buildings])), 2),
            "max_height_m": round(float(np.max([b.height_m for b in self.buildings])), 1),
            "wood_share": round(float(np.mean([b.material == "wood" for b in self.buildings])), 3),
            "pre1981_share": round(float(np.mean([b.year < 1981 for b in self.buildings])), 3),
        }
        self.stats["floor_area_per_capita"] = round(
            self.stats["floor_km2"] * 1e6 / max(1, self.stats["population"]), 1)

    _CACHE_ATTRS = ('_block_index', '_parcel_index',)

    def __getstate__(self):
        state = self.__dict__.copy()
        for k in self._CACHE_ATTRS:
            state.pop(k, None)
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)

    def buildings_in(self, polygon: Polygon) -> List[Building]:
        hits = self._building_index.query(polygon, predicate="intersects") \
            if hasattr(self, "_building_index") else range(len(self.buildings))
        return [self.buildings[int(i)] for i in hits]
