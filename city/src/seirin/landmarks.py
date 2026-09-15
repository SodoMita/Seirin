"""Landmarks, points of interest and the public-transport system.

Two tiers:

**Canon landmarks** are fixed by the design document — the Akatomi Dynamics
headquarters, Stardome concert hall, Seirin station, the Kogare-no-Inu tea house
in Tsukimachi, the community archives, the Tenro shrine, the Kamikura spring,
the Shelf-4 works, the CSR laboratory, the container terminals and dry docks.
Their coordinates are constants; the generator does not get to move them.

**Generated POIs** are everything a city needs to function and nothing in canon
describes: schools, clinics, convenience stores, banks, post offices, temples,
shopping streets, petrol stations, fire stations, police boxes, parks and
parking lots. They are sited by explicit demand rules — convenience stores need
a junction and passing traffic, schools need a catchment of children, clinics
need a catchment of older residents — so their distribution is an *output* of
the demographic simulation rather than decoration.

Public transport is generated the same way: rail lines follow the trunk
corridors the terrain allowed, and station spacing follows demand (population
and jobs within walking distance).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
from shapely.geometry import LineString, MultiPolygon, Point, Polygon
from shapely.ops import unary_union

from .base import Rng, chaikin, resample, smoothstep
from .buildings import City
from .districts import DistrictSystem, Neighbourhood
from .roads import RoadNetwork
from .terrain import Terrain

# --------------------------------------------------------------------------
# Canon landmarks (fixed coordinates from the design document's geography)
# --------------------------------------------------------------------------

CANON: List[Dict] = [
    dict(id="akatomi_hq", kanji="晶富ダイナミクス本社", romaji="Akatomi Dynamics HQ",
         kind="corporate", x=420.0, y=980.0, floors=34, footprint=78_000.0,
         note="Штаб-квартира Akatomi Dynamics: стеклянная башня над деловым кварталом."),
    dict(id="stardome", kanji="スター・ドーム", romaji="Stardome",
         kind="arena", x=1_980.0, y=1_520.0, floors=6, footprint=42_000.0,
         note="Концертный зал на 14 000 мест, площадка фестиваля света."),
    dict(id="seirin_station", kanji="青凛駅", romaji="Seirin Station",
         kind="rail_station", x=1_450.0, y=1_900.0, floors=3, footprint=26_000.0,
         note="Главный вокзал: четыре платформы, северный и южный выходы."),
    dict(id="kogare_inu", kanji="焦れの犬", romaji="Kogare-no-Inu (tea house)",
         kind="teahouse", x=-3_180.0, y=3_290.0, floors=2, footprint=420.0,
         note="Чайный дом семьи Юбикири в Цукимати."),
    dict(id="tsukimachi_archives", kanji="月町文書館", romaji="Tsukimachi Community Archives",
         kind="archive", x=-3_620.0, y=2_880.0, floors=2, footprint=1_100.0,
         note="Общинные архивы, которыми заведует Юки Тэнро."),
    dict(id="tenro_shrine", kanji="天露神社", romaji="Tenro Shrine",
         kind="shrine", x=1_050.0, y=10_250.0, floors=1, footprint=2_600.0,
         note="Горное святилище Тэнро над водосбором Камикуры."),
    dict(id="kamikura_spring", kanji="上倉水源", romaji="Kamikura Spring",
         kind="water", x=1_900.0, y=9_050.0, floors=0, footprint=900.0,
         note="Источник, питающий город; охраняемая зона водосбора."),
    dict(id="shelf4_works", kanji="棚四工区", romaji="Shelf-4 Works",
         kind="construction", x=-2_400.0, y=11_200.0, floors=2, footprint=34_000.0,
         note="Площадка проекта «Шельф-4»: отсыпка и склады."),
    dict(id="csr_lab", kanji="CSR研究所", romaji="CSR Laboratory",
         kind="lab", x=3_180.0, y=3_040.0, floors=4, footprint=9_400.0,
         note="Лаборатория коллоидной мягкой робототехники в Тэцубе."),
    dict(id="goliath_yard", kanji="ゴリアテ作業場", romaji="Goliath Works Yard",
         kind="mecha_yard", x=2_150.0, y=1_850.0, floors=2, footprint=16_000.0,
         note="Площадка промышленных экзо-тягачей «Голиаф-V»."),
    dict(id="ren_workshop", kanji="錬の工房", romaji="Ren's Workshop",
         kind="workshop", x=2_940.0, y=2_240.0, floors=2, footprint=680.0,
         note="Частная мастерская в переулке Тэцубы."),
    dict(id="port_terminal_2", kanji="第二埠頭", romaji="Container Terminal 2",
         kind="port", x=6_150.0, y=-2_250.0, floors=1, footprint=180_000.0,
         note="Контейнерный терминал: четыре крана, причал 320 м."),
    dict(id="port_drydock", kanji="乾ドック", romaji="Dry Dock",
         kind="drydock", x=5_100.0, y=-1_480.0, floors=1, footprint=46_000.0,
         note="Ремонтный сухой док, заходит «Кракен-М»."),
    dict(id="customs", kanji="税関", romaji="Customs Terminal",
         kind="customs", x=6_900.0, y=-1_050.0, floors=3, footprint=5_200.0,
         note="Таможенный терминал и диспетчерская порта."),
    dict(id="seirin_hospital", kanji="青凛市民病院", romaji="Seirin Citizens' Hospital",
         kind="hospital", x=780.0, y=2_620.0, floors=7, footprint=13_000.0,
         note="Центральная больница: приёмное отделение, вертолётная площадка."),
    dict(id="seirin_police", kanji="青凛警察署", romaji="Seirin Police Station",
         kind="police", x=1_320.0, y=1_380.0, floors=5, footprint=4_600.0,
         note="Городское управление полиции и центр управления."),
    dict(id="city_hall", kanji="青凛市役所", romaji="Seirin City Hall",
         kind="civic", x=980.0, y=1_760.0, floors=9, footprint=17_000.0,
         note="Мэрия: залы слушаний, где идёт спор о «Шельфе-4»."),
    dict(id="stella_studio", kanji="ステラ・スタジオ", romaji="Stella Studio",
         kind="studio", x=2_420.0, y=760.0, floors=3, footprint=3_400.0,
         note="Мастерская сетевого художественного проекта «Стелла»."),
    dict(id="obsidian_hangar", kanji="黒曜格納庫", romaji="Obsidian Hangar",
         kind="hangar", x=4_050.0, y=3_180.0, floors=3, footprint=12_500.0,
         note="Закрытый полигон Akatomi; здесь стоит Obsidian-01."),
    dict(id="tetsuba_baths", kanji="鉄場湯", romaji="Tetsuba Baths",
         kind="bath", x=2_120.0, y=3_420.0, floors=2, footprint=1_300.0,
         note="Общественная баня промышленного пояса."),
    dict(id="minato_market", kanji="港市場", romaji="Harbour Market",
         kind="market", x=3_320.0, y=-950.0, floors=2, footprint=7_800.0,
         note="Рыбный и овощной рынок у Северного порта."),
    dict(id="hikari_theatre", kanji="光座", romaji="Hikari-za Theatre",
         kind="theatre", x=1_620.0, y=640.0, floors=4, footprint=4_100.0,
         note="Старый кинотеатр, теперь площадка техно-паломников."),
]


@dataclass
class POI:
    id: str
    kanji: str
    romaji: str
    kind: str
    x: float
    y: float
    capacity: int = 0
    catchment_min: float = 0.0
    machi_id: str = ""
    district_id: str = ""
    jobs: int = 0
    canon: bool = False
    floors: int = 1
    footprint_m2: float = 0.0
    note: str = ""

    @property
    def point(self) -> Point:
        return Point(self.x, self.y)


@dataclass
class Station:
    id: str
    kanji: str
    romaji: str
    x: float
    y: float
    lines: List[str] = field(default_factory=list)
    kind: str = "rail"                 # rail | metro | bus_hub | tram
    daily_boardings: int = 0
    catchment_pop: int = 0
    catchment_jobs: int = 0
    platforms: int = 2
    opened: int = 1958

    @property
    def point(self) -> Point:
        return Point(self.x, self.y)


@dataclass
class TransitLine:
    id: str
    kanji: str
    romaji: str
    kind: str                          # rail | metro | tram | ferry | bus
    stations: List[str] = field(default_factory=list)
    geometry: Optional[LineString] = None
    length_km: float = 0.0
    daily_riders: int = 0
    opened: int = 1901
    headway_s: int = 600

    @property
    def name(self) -> str:
        return self.romaji


class Landmarks:
    """Canon landmarks + generated POIs + the transit system."""

    def __init__(self, rng: Rng, terrain: Terrain, districts: DistrictSystem,
                 roads: RoadNetwork, city: City, names):
        self.rng = rng.sub("landmarks")
        self.terrain = terrain
        self.districts = districts
        self.roads = roads
        self.city = city
        self.names = names
        self.census = None
        self.canon: List[POI] = []
        self.pois: List[POI] = []
        self.stations: List[Station] = []
        self.lines: List[TransitLine] = []
        self._place_canon()
        self._index_streets()

    # The pipeline runs these as explicit phases, because each needs the output
    # of the previous one: canon landmarks feed the 3-D scene, the census needs
    # the building stock, the POIs need the census (for demand), and the transit
    # stations need the census (for ridership) before travel demand can be built.
    def place_pois(self, census) -> None:
        self.census = census
        self._place_pois()

    def build_transit(self) -> None:
        self._transit()

    def _index_streets(self):
        from shapely.strtree import STRtree
        major = [s.line for s in self.roads.streets
                 if s.klass in ("trunk", "arterial", "collector")]
        self._major_lines = major
        self._major_index = STRtree(major) if major else None

    # -- canon -------------------------------------------------------------
    def _place_canon(self):
        for spec in CANON:
            poi = POI(id=spec["id"], kanji=spec["kanji"], romaji=spec["romaji"],
                      kind=spec["kind"], x=spec["x"], y=spec["y"], canon=True,
                      floors=spec["floors"], footprint_m2=spec["footprint"],
                      note=spec["note"])
            nb = self.districts.neighbourhood_at(poi.x, poi.y)
            if nb:
                poi.machi_id, poi.district_id = nb.id, nb.district_id
            poi.jobs = {"corporate": 4_200, "arena": 380, "rail_station": 260,
                        "lab": 210, "port": 640, "drydock": 320, "hospital": 940,
                        "police": 180, "civic": 620, "customs": 120,
                        "hangar": 90, "market": 240, "mecha_yard": 210,
                        "teahouse": 6, "archive": 4, "workshop": 3, "shrine": 2,
                        "water": 2, "construction": 140, "bath": 9,
                        "theatre": 22, "studio": 12}.get(poi.kind, 20)
            self.canon.append(poi)
        self.by_id = {p.id: p for p in self.canon}
        self.by_id["akatomi_hq"].capacity = 4_200
        self.by_id["stardome"].capacity = 14_000
        self.by_id["seirin_hospital"].capacity = 620
        for p in self.canon:
            self.by_id[p.id].catchment_min = 0.0

    # -- generated POIs ----------------------------------------------------
    def _place_pois(self):
        """Site everyday services against the demand that actually exists.

        Every rule below is a demographic or geometric criterion: a primary
        school needs children, a clinic needs elderly residents, a convenience
        store needs a junction with passing traffic. Nothing is placed "for
        variety".
        """
        rng = self.rng
        city = self.city
        demo = self.census
        machi = self.districts.machi_by_id
        built = [b for b in city.buildings]
        # Index buildings per machi for demand evaluation.
        per_machi: Dict[str, List] = {}
        for b in built:
            per_machi.setdefault(b.machi_id, []).append(b)

        def pop_of(mid: str) -> int:
            if demo is not None and mid in demo.machi_stats:
                return demo.machi_stats[mid].population
            return sum(b.occupants for b in per_machi.get(mid, []))

        def children_of(mid: str) -> float:
            if demo is not None and mid in demo.machi_stats:
                st = demo.machi_stats[mid]
                return st.age_6_14 * st.population
            return pop_of(mid) * 0.085

        def elderly_of(mid: str) -> float:
            if demo is not None and mid in demo.machi_stats:
                st = demo.machi_stats[mid]
                return st.age_65_p * st.population
            return pop_of(mid) * 0.29

        def shops_of(mid: str) -> int:
            return sum(1 for b in per_machi.get(mid, []) if b.kind == "shop")

        def pick_site(mid: str, prefer_junction: bool = False) -> Optional[Tuple[float, float]]:
            """Choose a lot for a facility.

            With `prefer_junction` the site is the one with the best street
            frontage — the reason convenience stores and petrol stations sit on
            corners. The street index makes this a query, not a scan.
            """
            bs = per_machi.get(mid, [])
            if not bs:
                nb = machi.get(mid)
                return (nb.anchor if nb else None)
            if prefer_junction and self._major_index is not None:
                best, best_score = None, -1.0
                for b in bs[:260]:
                    p = Point(b.centre)
                    hits = self._major_index.query(p.buffer(45.0), predicate="intersects")
                    score = float(len(hits))
                    if score > best_score:
                        best, best_score = p, score
                if best is not None and best_score > 0:
                    return (best.x, best.y)
            b = bs[int(rng.np.integers(0, len(bs)))]
            return b.centre

        poi_id = 0

        def add(kind: str, mid: str, xy, kanji_name, romaji_name, **kw) -> None:
            nonlocal poi_id
            nb = machi.get(mid)
            p = POI(id=f"poi{poi_id:05d}", kanji=kanji_name, romaji=romaji_name,
                    kind=kind, x=xy[0], y=xy[1],
                    machi_id=mid if nb else "",
                    district_id=nb.district_id if nb else "", **kw)
            self.pois.append(p)
            poi_id += 1

        # --- everyday retail: one convenience store per ~2,400 residents ------
        for mid, bs in per_machi.items():
            pop = pop_of(mid)
            nb = machi.get(mid)
            if nb is None or nb.kind in ("forest", "construction"):
                continue
            n_store = int(pop / 2_400.0)
            for _ in range(n_store):
                xy = pick_site(mid, prefer_junction=True)
                if xy is None:
                    continue
                add("convenience", mid, xy, "二十四時間", "24-hour store",
                    jobs=7, capacity=0, floors=1, footprint_m2=180.0)
            if pop > 1_200:
                xy = pick_site(mid)
                if xy:
                    add("shop_street", mid, xy, self.names.mall()[0],
                        self.names.mall()[1], jobs=int(pop / 300.0),
                        floors=1, footprint_m2=900.0)
            # schools: one primary per catch-22 children count
            n_school = int(children_of(mid) / 420.0)
            for i in range(max(0, n_school)):
                xy = pick_site(mid)
                if not xy:
                    continue
                kj, rj = self.names.station()
                add("school_primary", mid, xy, kj.replace("駅", "小学校"),
                    rj.replace("-eki", " Elementary"), jobs=28, capacity=520,
                    floors=3, footprint_m2=3_400.0)
            if pop > 4_500:
                xy = pick_site(mid)
                if xy:
                    kj, rj = self.names.station()
                    add("school_junior_high", mid, xy, kj.replace("駅", "中学校"),
                        rj.replace("-eki", " Junior High"), jobs=44, capacity=620,
                        floors=3, footprint_m2=5_200.0)
            # clinics track the elderly population
            n_clinic = int(elderly_of(mid) / 950.0)
            for i in range(max(0, n_clinic)):
                xy = pick_site(mid)
                if not xy:
                    continue
                add("clinic", mid, xy, "医院", "Clinic", jobs=9, floors=2,
                    footprint_m2=420.0)
            # temples and shrines: one per 5,000 residents, but never in the port
            if nb.kind not in ("port", "industrial", "warehouse") and rng.py.random() < pop / 5_000.0:
                xy = pick_site(mid)
                if xy:
                    kj, rj = self.names.shrine()
                    add("shrine", mid, xy, kj, rj, jobs=2, floors=1,
                        footprint_m2=700.0)
            # post offices, banks, police boxes follow commercial activity
            shops = shops_of(mid)
            if shops > 30:
                xy = pick_site(mid)
                if xy and rng.chance(0.7):
                    add("bank", mid, xy, "信用金庫", "Credit union", jobs=14,
                        floors=3, footprint_m2=900.0)
                if xy and rng.chance(0.6):
                    add("post_office", mid, xy, "郵便局", "Post office", jobs=11,
                        floors=2, footprint_m2=650.0)
            if shops > 60 and rng.chance(0.35):
                xy = pick_site(mid, prefer_junction=True)
                if xy:
                    add("police_box", mid, xy, "交番", "Police box", jobs=6,
                        floors=1, footprint_m2=140.0)
            if nb.kind in ("industrial", "warehouse", "port") and pop > 0:
                xy = pick_site(mid)
                if xy:
                    add("fire_station", mid, xy, "消防署", "Fire station", jobs=22,
                        floors=2, footprint_m2=2_100.0)
            if nb.kind in ("residential_mid", "residential_low", "village") and pop > 900:
                xy = pick_site(mid)
                if xy:
                    add("park", mid, xy, self.names.park()[0], self.names.park()[1],
                        jobs=2, floors=0, footprint_m2=4_800.0)
            if shops > 15:
                xy = pick_site(mid, prefer_junction=True)
                if xy:
                    add("petrol", mid, xy, "給油所", "Petrol station", jobs=5,
                        floors=1, footprint_m2=1_100.0)
                if shops > 40 and rng.chance(0.5):
                    add("parking", mid, xy or (0, 0), "立体駐車場", "Multi-storey car park",
                        jobs=6, floors=5, footprint_m2=2_600.0)

        # --- city-scale services, always exactly one or a headquarters ---------
        campuses = self._pick_along("university", 3)
        for i, xy in enumerate(campuses):
            nb = self.districts.neighbourhood_at(*xy)
            kj, rj = self.names.station()
            add("university", nb.id if nb else "", xy,
                kj.replace("駅", "大学"), rj.replace("-eki", " University"),
                jobs=310, capacity=6_000, floors=5, footprint_m2=24_000.0)
        halls = self._pick_along("civic", 4)
        for xy in halls:
            nb = self.districts.neighbourhood_at(*xy)
            add("ward_office", nb.id if nb else "", xy, "区役所", "Ward office",
                jobs=64, floors=5, footprint_m2=3_800.0)
        power = [(3_600.0, 4_400.0), (7_400.0, -400.0)]
        for xy in power:
            nb = self.districts.neighbourhood_at(*xy)
            add("power_station", nb.id if nb else "", xy, "変電所", "Substation",
                jobs=14, floors=1, footprint_m2=9_000.0)
        water = [(2_050.0, 8_600.0), (1_180.0, 9_900.0)]
        for xy in water:
            add("reservoir", "", xy, "配水池", "Service reservoir", jobs=4,
                floors=0, footprint_m2=5_200.0)
        for xy in [(1_900.0, 6_950.0), (5_950.0, 1_050.0)]:
            nb = self.districts.neighbourhood_at(*xy)
            add("water_treatment", nb.id if nb else "", xy, "浄水場",
                "Water treatment works", jobs=26, floors=2, footprint_m2=18_000.0)
        landfills = self._pick_along("landfill", 2)
        for xy in landfills:
            nb = self.districts.neighbourhood_at(*xy)
            add("landfill", nb.id if nb else "", xy, "最終処分場", "Landfill",
                jobs=12, floors=1, footprint_m2=26_000.0)
        # cemeteries sit next to temples, on cheap sloping ground
        for i in range(4):
            xy = self._pick_along("cemetery", 1)[0]
            nb = self.districts.neighbourhood_at(*xy)
            add("cemetery", nb.id if nb else "", xy, "霊園", "Cemetery", jobs=3,
                floors=0, footprint_m2=16_000.0)

    def _pick_along(self, kind: str, n: int) -> List[Tuple[float, float]]:
        """Pick `n` well-separated, buildable sites weighted by the kind."""
        rng = self.rng
        ter, ds = self.terrain, self.districts
        out: List[Tuple[float, float]] = []
        tries = 0
        while len(out) < n and tries < 4_000:
            tries += 1
            x = rng.uniform(-9_500.0, 10_500.0)
            y = rng.uniform(-3_500.0, 12_000.0)
            if ter.is_water(x, y) or ter.slope_at(x, y) > 0.30:
                continue
            nb = ds.neighbourhood_at(x, y)
            if nb is None:
                continue
            allow = {"university": ("residential_mid", "residential_low", "village"),
                     "civic": ("commercial", "residential_mid"),
                     "landfill": ("forest", "industrial", "village"),
                     "cemetery": ("village", "residential_low", "forest")}[kind]
            if nb.kind not in allow:
                continue
            if any(math.dist((x, y), q) < 2_200.0 for q in out):
                continue
            out.append((x, y))
        return out

    # -- public transport --------------------------------------------------
    def _transit(self):
        """Rail and metro lines through the trunk corridors, with stations
        sited where demand (population + jobs within 900 m) justifies one."""
        rng = self.rng
        anchors = self.roads.anchor_points
        corridors = [
            ("seirin_main", "青凛本線", "Seirin Main Line", "rail",
             ["west_suburb", "tsukimachi_centre", "hikari_core", "seirin_station",
              "kita_waterfront", "north_harbour"], 1901),
            ("kaigan", "海岸線", "Kaigan Coastal Line", "rail",
             ["tsukimachi_centre", "tetsuba_centre", "minami_housing", "port_gate_a",
              "port_gate_b"], 1932),
            ("sanson", "山村線", "Sanson Mountain Line", "rail",
             ["seirin_station", "kamikura_village", "tenro_village"], 1954),
            ("minato_metro", "港メトロ", "Minato Metro", "metro",
             ["seirin_station", "hikari_core", "naka_station", "minami_housing"], 1978),
        ]
        # One extra intermediate anchor for the metro so it has a plausible
        # inner-city alignment rather than reusing the trunk road.
        anchors["naka_station"] = (1_150.0, 3_050.0)
        for lid, kj, rj, kind, chain, opened in corridors:
            pts: List[Tuple[float, float]] = []
            for a, b in zip(chain[:-1], chain[1:]):
                route = self._route_along_roads(anchors[a], anchors[b])
                pts.extend(route[:-1] if pts else route)
            if len(pts) < 2:
                continue
            geom = LineString(chaikin(pts, 2))
            line = TransitLine(id=lid, kanji=kj, romaji=rj, kind=kind,
                               geometry=geom, opened=opened,
                               headway_s=420 if kind == "metro" else 720,
                               length_km=round(geom.length / 1_000.0, 1))
            # Stations: every 1.1-2.6 km, nudged to the local demand peak.
            spacing = 850.0 if kind == "metro" else 1_250.0
            n = max(4, int(round(geom.length / spacing)))
            pts_sorted = [geom.interpolate(i / (n - 1), normalized=True) for i in range(n)]
            for i, p in enumerate(pts_sorted):
                xy = self._snap_to_demand(p.x, p.y, 350.0)
                st = self._station_at(xy, lid, kj, rj, kind, opened)
                if st is None:
                    continue
                line.stations.append(st.id)
            self.lines.append(line)
        # Ferry across the bay to the south coast (a real Seirin detail: the bay
        # has no bridge, so the crossing is a ferry).
        ferry_pts = [(3_900.0, 300.0), (2_600.0, -1_900.0), (600.0, -3_300.0),
                     (-1_900.0, -4_100.0), (-5_200.0, -4_400.0)]
        if all(not self.terrain.is_water(x, y) or True for x, y in ferry_pts):
            geom = LineString(chaikin(ferry_pts, 2))
            fl = TransitLine(id="bay_ferry", kanji="湾フェリー", romaji="Bay Ferry",
                             kind="ferry", geometry=geom, opened=1961,
                             headway_s=4_200, length_km=round(geom.length / 1_000.0, 1))
            for i, xy in enumerate([ferry_pts[0], ferry_pts[2], ferry_pts[-1]]):
                st = self._station_at(xy, fl.id, fl.kanji, fl.romaji, "ferry", 1961,
                                      force=True)
                if st:
                    fl.stations.append(st.id)
            self.lines.append(fl)
        self._station_demand()

    def _route_along_roads(self, a, b) -> List[Tuple[float, float]]:
        """Rail alignment between two anchors.

        Railways need gentle grades, so the route is found with the same
        least-cost search the arterials use, but with the slope penalty raised
        fourfold and every curve charged for: the result follows the valley
        floors and the coastal shelf, which is where Japanese coastal railways
        actually run, rather than cutting across the grain of the terrain.
        """
        route = self.roads._astar(a, b, slope_weight=24.0, curve_penalty=1.8)
        if len(route) < 2:
            return [a, b]
        return route

    def _snap_to_demand(self, x: float, y: float, radius: float) -> Tuple[float, float]:
        """Move a station site to the highest-demand nearby buildable parcel."""
        self._bucket_index()
        cell = self._bucket_cell
        cands = []
        i0, i1 = int((x - radius) // cell), int((x + radius) // cell)
        j0, j1 = int((y - radius) // cell), int((y + radius) // cell)
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                for b in self._buckets.get((i, j), ()):
                    if math.dist(b.centre, (x, y)) <= radius:
                        cands.append(b)
        if not cands:
            return (x, y)
        # demand = residential occupants + jobs, discounted by distance
        best, best_score = (x, y), -1.0
        for b in cands[:600]:
            score = (b.occupants + 0.8 * b.jobs) / (1.0 + math.dist(b.centre, (x, y)) / 120.0)
            if score > best_score:
                best, best_score = b.centre, score
        return best

    def _station_at(self, xy, lid, lkj, lrj, kind, opened, force: bool = False):
        x, y = xy
        for st in self.stations:
            if math.dist((st.x, st.y), (x, y)) < 260.0:
                st.lines.append(lid)
                st.platforms = max(st.platforms, 2 if kind != "metro" else 2)
                return st
        if not force:
            if self.terrain.is_water(x, y) and kind != "ferry":
                return None
            # radius rule: only build a station if the catchment justifies it
            pop, jobs = self._catchment(x, y, 900.0)
            if pop + jobs < 2_200 and kind != "metro":
                return None
        nb = self.districts.neighbourhood_at(x, y)
        kj, rj = self.names.station()
        st = Station(id=f"st{len(self.stations):03d}", kanji=kj, romaji=rj,
                     x=x, y=y, lines=[lid], kind=kind,
                     platforms=2 if kind != "rail" else 3, opened=opened)
        self.stations.append(st)
        return st

    def _bucket_index(self):
        """Uniform grid bucket over building centres: catchment sums in O(k)."""
        if hasattr(self, "_buckets"):
            return
        cell = 250.0
        buckets: Dict[Tuple[int, int], List] = {}
        for b in self.city.buildings:
            key = (int(math.floor(b.centre[0] / cell)), int(math.floor(b.centre[1] / cell)))
            buckets.setdefault(key, []).append(b)
        self._buckets = buckets
        self._bucket_cell = cell

    def _catchment(self, x: float, y: float, r: float) -> Tuple[int, int]:
        self._bucket_index()
        cell = self._bucket_cell
        r2 = r * r
        pop = jobs = 0
        i0, i1 = int((x - r) // cell), int((x + r) // cell)
        j0, j1 = int((y - r) // cell), int((y + r) // cell)
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                for b in self._buckets.get((i, j), ()):
                    dx, dy = b.centre[0] - x, b.centre[1] - y
                    if dx * dx + dy * dy <= r2:
                        pop += b.occupants
                        jobs += b.jobs
        return pop, jobs

    def _station_demand(self):
        """Daily boardings from the catchment, the way rail demand is forecast:
        trips are generated by the population and attracted by jobs, and the
        station's share depends on what it competes with.
        """
        for st in self.stations:
            r = 900.0 if st.kind != "ferry" else 1_600.0
            pop, jobs = self._catchment(st.x, st.y, r)
            st.catchment_pop, st.catchment_jobs = pop, jobs
            # ~1.9 rail trips per resident per weekday, and half of all jobs
            # generate a trip; the station captures a share that falls with the
            # number of other stations nearby.
            competitors = sum(1 for o in self.stations
                              if o is not st and math.dist((o.x, o.y), (st.x, st.y)) < 2_400.0)
            share = 1.0 / (1.0 + 0.35 * competitors)
            base = (pop * 1.05 + jobs * 0.55) * share
            st.daily_boardings = int(max(120, base * (1.25 if st.kind == "metro" else 1.0)))
        for line in self.lines:
            line.daily_riders = sum(st.daily_boardings for st in self.stations
                                    if st.id in line.stations)

    # -- queries -----------------------------------------------------------
    _CACHE_ATTRS = ('_major_index', '_buckets')

    def __getstate__(self):
        state = self.__dict__.copy()
        for k in self._CACHE_ATTRS:
            state.pop(k, None)
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)

    def summary(self) -> Dict[str, float]:
        kinds: Dict[str, int] = {}
        for p in self.pois:
            kinds[p.kind] = kinds.get(p.kind, 0) + 1
        return {
            "canon_landmarks": len(self.canon),
            "generated_pois": len(self.pois),
            "poi_kinds": len(kinds),
            "poi_mix": dict(sorted(kinds.items(), key=lambda kv: -kv[1])),
            "stations": len(self.stations),
            "lines": len(self.lines),
            "daily_boardings": sum(s.daily_boardings for s in self.stations),
            "poi_jobs": sum(p.jobs for p in self.pois),
        }
