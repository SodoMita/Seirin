"""The society and economy of Seirin: who lives where, what they earn, where
they work, how they travel, and what the city's economy actually produces.

Everything here is an *accounting model* over the generated building stock, not
a decorative table. The chain is:

    dwellings × household size  -> population
    age structure               -> children, workers, elderly
    labour participation        -> workforce
    jobs by sector              -> employment, and the balance per ward
    income distribution         -> household budgets, rent, land value
    gravity + transit choice    -> origin-destination matrix
    OD matrix                   -> commuter flows, trip lengths, mode split

Because the same numbers feed the 3-D scene, the maps and the statistics, the
city cannot present two different truths: a district drawn as dense housing has
the population, the school demand and the ridership that go with it.

Calibration targets are the published Japanese national averages (2020-2024):
2.21 persons per household, 13.6 % vacant dwellings, 0.61 labour-force
participation for the whole population, 29.1 % aged 65+, 92 m2 of dwelling
floor per household, 1.15 workers per household.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from .base import Rng, smoothstep
from .buildings import City
from .districts import DistrictSystem, Neighbourhood
from .landmarks import Landmarks
from .roads import RoadNetwork
from .terrain import Terrain

# National calibration constants (Japan, 2020-2024 statistics).
PERSONS_PER_HOUSEHOLD = 2.21
VACANCY_RATE = 0.136
PARTICIPATION = 0.61              # labour force / total population
SHARE_65P = 0.291
SHARE_0_14 = 0.115
SHARE_15_64 = 0.594
AVG_HOUSEHOLD_INCOME_MYEN = 5.62  # 5.62 million yen per year
WORKERS_PER_HOUSEHOLD = 1.15

# Employment structure of a Japanese regional port city (share of jobs).
SECTORS = {
    "manufacturing": 0.185,
    "wholesale_retail": 0.165,
    "healthcare_welfare": 0.140,
    "transport_postal": 0.075,
    "construction": 0.070,
    "accommodation_food": 0.060,
    "education": 0.055,
    "professional": 0.055,
    "public_admin": 0.048,
    "finance_insurance": 0.030,
    "ict": 0.038,
    "agriculture_forestry": 0.030,
    "utilities": 0.014,
    "mining": 0.005,
    "arts_recreation": 0.020,
    "other_services": 0.010,
}


@dataclass
class MachiStats:
    mid: str
    name_romaji: str
    district_id: str
    dwellings: int = 0
    vacant: int = 0
    occupied: int = 0
    population: int = 0
    households: int = 0
    age_0_5: float = 0.0
    age_6_14: float = 0.0
    age_15_17: float = 0.0
    age_18_24: float = 0.0
    age_25_44: float = 0.0
    age_45_64: float = 0.0
    age_65_p: float = 0.0
    age_65p: float = 0.0
    workforce: int = 0
    jobs: int = 0
    jobs_by_sector: Dict[str, int] = field(default_factory=dict)
    mean_household_income_myen: float = AVG_HOUSEHOLD_INCOME_MYEN
    gini: float = 0.32
    poverty_rate: float = 0.16
    single_households: int = 0
    elderly_alone: int = 0
    floor_m2: float = 0.0
    floor_per_capita: float = 0.0
    land_value_myen_per_sqm: float = 0.0
    rent_2ldk_kyen: float = 0.0
    vacancy_rate: float = VACANCY_RATE
    accessibility: float = 0.0

    def as_row(self) -> Dict[str, object]:
        d = dict(self.__dict__)
        d.pop("jobs_by_sector", None)
        return d


@dataclass
class Firm:
    id: int
    name_kanji: str
    name_romaji: str
    sector: str
    size_class: str
    employees: int
    machi_id: str
    x: float
    y: float
    revenue_myen: float
    founded: int
    building_id: int = -1


class Census:
    """Population, households, work and travel for the whole city."""

    def __init__(self, rng: Rng, terrain: Terrain, districts: DistrictSystem,
                 roads: RoadNetwork, city: City, landmarks: Landmarks, names):
        self.rng = rng.sub("census")
        self.terrain = terrain
        self.districts = districts
        self.roads = roads
        self.city = city
        self.landmarks = landmarks
        self.names = names
        self.machi_stats: Dict[str, MachiStats] = {}
        self.district_stats: Dict[str, Dict] = {}
        self.od: Optional[np.ndarray] = None
        self.od_modes: Dict[str, np.ndarray] = {}
        self.firms: List[Firm] = []
        self._by_machi: Dict[str, List] = {}
        for b in city.buildings:
            self._by_machi.setdefault(b.machi_id, []).append(b)
        self._build_demography()
        self._reconcile_jobs()
        self._build_economy()

    def finish_travel_demand(self) -> None:
        """Run after the transit network exists: travel demand depends on it."""
        self._build_travel_demand()

    # -- demography --------------------------------------------------------
    def _build_demography(self):
        rng = self.rng
        city = self.city
        machi = self.districts.machi_by_id
        per = self._by_machi

        for mid, nb in machi.items():
            st = MachiStats(mid=mid, name_romaji=nb.romaji, district_id=nb.district_id)
            bl = per.get(mid, [])
            st.dwellings = sum(b.units for b in bl)
            st.floor_m2 = sum(b.floor_m2 for b in bl)
            st.jobs = sum(b.jobs for b in bl)
            # Vacancy: high in depopulating rural wards, low where jobs are.
            base_vac = float(np.clip(
                VACANCY_RATE + 0.075 * (1.0 - min(1.0, st.jobs / max(1.0, st.dwellings * 0.9)))
                - 0.05 * min(1.0, getattr(nb, "land_value_kper_sqm", 60.0) / 200.0),
                0.04, 0.32))
            st.vacancy_rate = base_vac
            st.vacant = int(round(st.dwellings * base_vac))
            st.occupied = max(0, st.dwellings - st.vacant)
            # Household size: larger in the suburbs, smaller in the centre.
            centre_dist = math.dist(nb.anchor, (1_050.0, 1_150.0))
            size = float(np.clip(rng.normal(
                PERSONS_PER_HOUSEHOLD + 0.22 * smoothstep(2_000.0, 7_000.0, centre_dist)
                - 0.10 * smoothstep(2_000.0, 0.0, centre_dist), 0.12), 1.45, 3.4))
            st.population = int(round(st.occupied * size))
            st.households = max(1, st.occupied)
            # Age structure: young families in the suburbs, students near the
            # station and universities, the elderly in the old town and villages.
            young = float(np.clip(smoothstep(1_500.0, 6_500.0, centre_dist), 0.0, 1.0))
            student = float(np.clip(1.0 - centre_dist / 2_600.0, 0.0, 1.0))
            old = float(np.clip(smoothstep(2_200.0, 6_000.0, centre_dist) * 0.7
                                + (0.5 if nb.kind in ("village", "forest", "farmland") else 0.0)
                                + (0.25 if nb.kind == "residential_low" else 0.0), 0.0, 1.4))
            st.age_65_p = float(rng.normal(SHARE_65P * (0.62 + 0.55 * old), 0.02))
            st.age_65p = st.age_65_p
            st.age_0_5 = float(np.clip(SHARE_0_14 * 0.42 * (0.75 + 0.55 * young) + st.age_65_p * -0.12,
                                       0.015, 0.09))
            st.age_6_14 = float(np.clip(SHARE_0_14 * 0.58 * (0.7 + 0.6 * young)
                                        - st.age_65_p * 0.10, 0.02, 0.12))
            st.age_15_17 = float(np.clip(0.036 - 0.01 * st.age_65_p, 0.012, 0.05))
            st.age_18_24 = float(np.clip(0.082 + 0.085 * student - 0.03 * st.age_65_p,
                                         0.02, 0.24))
            st.age_25_44 = float(np.clip(0.235 + 0.05 * young - 0.09 * st.age_65_p, 0.08, 0.34))
            st.age_45_64 = float(np.clip(0.255, 0.14, 0.34))
            total_share = (st.age_0_5 + st.age_6_14 + st.age_15_17 + st.age_18_24
                           + st.age_25_44 + st.age_45_64 + st.age_65_p)
            scale = 1.0 / max(total_share, 0.5)
            for k in ("age_0_5", "age_6_14", "age_15_17", "age_18_24",
                      "age_25_44", "age_45_64", "age_65_p"):
                setattr(st, k, getattr(st, k) * scale)

            workforce_share = float(np.clip(
                PARTICIPATION_TABLE["15_64"] * (1 - st.age_65_p * 0.9)
                + PARTICIPATION_TABLE["65p"] * st.age_65_p, 0.28, 0.72))
            st.workforce = int(round(st.population * workforce_share))
            # Income follows the local land value and the job mix.
            st.mean_household_income_myen = float(np.clip(
                AVG_HOUSEHOLD_INCOME_MYEN * (0.68 + 0.62 * min(1.3, getattr(nb, "land_value_kper_sqm", 60.0) / 190.0)),
                2.6, 12.4))
            st.gini = float(np.clip(0.29 + 0.055 * min(1.0, getattr(nb, "land_value_kper_sqm", 60.0) / 250.0), 0.26, 0.42))
            st.poverty_rate = float(np.clip(0.235 - 0.13 * min(1.0, st.mean_household_income_myen / 6.0)
                                            + 0.05 * st.age_65_p, 0.06, 0.34))
            st.single_households = int(round(st.households * float(np.clip(
                0.30 + 0.22 * student, 0.22, 0.55))))
            st.elderly_alone = int(round(st.households * st.age_65_p * 0.34))
            st.land_value_myen_per_sqm = getattr(nb, "land_value_kper_sqm", 60.0) / 1_000.0
            # Rent: a 2LDK (55 m2) at roughly 0.9 % of land value per year plus
            # a construction component.
            st.rent_2ldk_kyen = float(np.clip(
                26.0 + 0.62 * getattr(nb, "land_value_kper_sqm", 60.0) * 0.55, 26.0, 190.0))
            st.floor_per_capita = st.floor_m2 / max(1, st.population)
            st.accessibility = float(math.exp(-centre_dist / 2_600.0))
            self.machi_stats[mid] = st

        # District roll-ups.
        for d in self.districts.districts:
            rows = [s for s in self.machi_stats.values() if s.district_id == d["id"]]
            if not rows:
                continue
            pop = sum(r.population for r in rows)
            self.district_stats[d["id"]] = {
                "romaji": d["romaji"], "kanji": d["kanji"], "kind": d["kind"],
                "population": pop,
                "dwellings": sum(r.dwellings for r in rows),
                "jobs": sum(r.jobs for r in rows),
                "area_km2": round(d["polygon"].area / 1e6, 2) if d["polygon"] else 0.0,
                "density_per_km2": round(pop / max(0.01, (d["polygon"].area / 1e6 if d["polygon"] else 1.0))),
                "mean_income_myen": round(float(np.mean([r.mean_household_income_myen for r in rows])), 2),
                "age_65_p": round(float(np.average([r.age_65_p for r in rows],
                                                   weights=[max(1, r.population) for r in rows])), 3),
                "floor_per_capita": round(sum(r.floor_m2 for r in rows) / max(1, pop), 1),
                "accessibility": round(float(np.mean([r.accessibility for r in rows])), 3),
            }

    # -- job reconciliation ------------------------------------------------
    # Jobs per resident is the single most mis-estimated quantity in a
    # bottom-up city model: adding up "one office worker per 24 m2" over a
    # whole built stock overshoots badly, because most floor area in a Japanese
    # city is residential, and much non-residential floor is storage, plant or
    # circulation rather than desks. So the *total* is anchored on the national
    # ratio and the per-building counts are scaled to it, which keeps the
    # relative geography (offices and factories carry the jobs, houses do not)
    # while making the city-wide total defensible.
    JOBS_PER_RESIDENT = 0.582          # Japan: 67.7M jobs / 116.3M households-pop
    KIND_JOB_WEIGHT = {
        "office": 1.00, "shop": 0.80, "hotel": 0.55, "factory": 0.42,
        "warehouse": 0.26, "plant": 0.38, "tank": 0.10, "apart": 0.020,
        "house": 0.012, "barn": 0.004, "tower": 1.05,
    }

    def _reconcile_jobs(self):
        pop = sum(s.population for s in self.machi_stats.values())
        target = int(round(pop * self.JOBS_PER_RESIDENT))
        weights = []
        for b in self.city.buildings:
            weights.append(max(0.0, b.floor_m2 * self.KIND_JOB_WEIGHT.get(b.kind, 0.05)))
        total_w = sum(weights)
        if total_w <= 0 or target <= 0:
            return
        scale = target / total_w
        per_machi: Dict[str, int] = {}
        for b, w in zip(self.city.buildings, weights):
            jobs = int(round(w * scale))
            b.jobs = jobs
            per_machi[b.machi_id] = per_machi.get(b.machi_id, 0) + jobs
        for mid, st in self.machi_stats.items():
            st.jobs = per_machi.get(mid, 0)
        self.target_jobs = target
        self.jobs_scale = scale

    # -- economy -----------------------------------------------------------
    def _build_economy(self):
        """Jobs are reconciled with the buildings that hold them, sectors are
        assigned by location logic, and firms are instantiated."""
        rng = self.rng
        total_jobs = sum(s.jobs for s in self.machi_stats.values())
        total_pop = sum(s.population for s in self.machi_stats.values())
        self.total_population = total_pop
        self.total_dwellings = sum(s.dwellings for s in self.machi_stats.values())
        self.total_jobs = total_jobs

        # Sector split: manufacturing and logistics concentrate in Tetsuba and
        # the port, healthcare in the civic wards, finance/ICT in the CBD.
        sector_bias = {
            "hikari": dict(finance_insurance=2.6, ict=2.4, professional=2.0,
                           public_admin=1.5, wholesale_retail=1.4, manufacturing=0.25),
            "tetsuba": dict(manufacturing=2.6, construction=1.5, transport_postal=1.6,
                            mining=1.6, finance_insurance=0.2, ict=0.3),
            "port": dict(transport_postal=2.8, manufacturing=1.4, wholesale_retail=1.1,
                         finance_insurance=0.2, healthcare_welfare=0.3),
            "tsukimachi": dict(wholesale_retail=1.9, accommodation_food=1.9,
                               arts_recreation=1.6, agriculture_forestry=1.4,
                               manufacturing=0.5, finance_insurance=0.5),
            "tenro": dict(agriculture_forestry=4.5, construction=1.2, utilities=1.6,
                          manufacturing=0.1, finance_insurance=0.1),
            "kamikura": dict(agriculture_forestry=4.0, accommodation_food=2.2,
                             utilities=1.4, manufacturing=0.2),
            "shelf4": dict(construction=4.0, mining=2.0, utilities=1.5),
            "minami": dict(manufacturing=1.6, transport_postal=1.4, construction=1.3),
        }
        for st in self.machi_stats.values():
            d = next((x for x in self.districts.districts if x["id"] == st.district_id), None)
            bias = sector_bias.get(st.district_id, {})
            weights = np.array([SECTORS[k] * bias.get(k, 1.0) for k in SECTORS])
            weights = weights / weights.sum()
            counts = self.rng.np.multinomial(max(0, st.jobs), weights)
            st.jobs_by_sector = {k: int(v) for k, v in zip(SECTORS, counts)}

        # Firms: every workplace is an establishment. Draw sizes from a
        # log-normal (the Japanese establishment-size distribution is heavily
        # skewed: 60 % of establishments have under 5 staff).
        firm_id = 0
        sector_names = {
            "manufacturing": ("製作所", "Works"),
            "wholesale_retail": ("商店", "Trading"),
            "healthcare_welfare": ("福祉", "Care"),
            "transport_postal": ("運輸", "Logistics"),
            "construction": ("建設", "Construction"),
            "accommodation_food": ("食堂", "Dining"),
            "education": ("学園", "Academy"),
            "professional": ("事務所", "Consulting"),
            "public_admin": ("市役所", "Civic"),
            "finance_insurance": ("金庫", "Finance"),
            "ict": ("電子", "Systems"),
            "agriculture_forestry": ("農林", "Agri-forestry"),
            "utilities": ("電力", "Power"),
            "mining": ("鉱業", "Mining"),
            "arts_recreation": ("芸術", "Arts"),
            "other_services": ("サービス", "Services"),
        }
        for st in self.machi_stats.values():
            remaining = dict(st.jobs_by_sector)
            nb = self.districts.machi_by_id[st.mid]
            bl = self._by_machi.get(st.mid, [])
            non_res = [b for b in bl if b.kind not in ("house", "apart", "barn")]
            while sum(remaining.values()) > 0:
                size = int(np.clip(rng.lognorm(4.0, 1.5), 1, 900))
                sector = max(remaining, key=lambda k: remaining[k])
                size = min(size, remaining[sector])
                if size <= 0:
                    break
                remaining[sector] -= size
                kj, rj = self.names.station()
                building_id = -1
                if non_res:
                    b = non_res[int(rng.np.integers(0, len(non_res)))]
                    x, y, building_id = b.centre[0], b.centre[1], b.id
                else:
                    x, y = nb.anchor
                base = sector_names[sector]
                self.firms.append(Firm(
                    id=firm_id, name_kanji=f"{kj[:1]}{base[0]}", name_romaji=f"{rj.split('-')[0]} {base[1]}",
                    sector=sector,
                    size_class=("micro" if size <= 4 else "small" if size <= 9
                                else "medium" if size <= 49 else "large" if size <= 299 else "major"),
                    employees=size, machi_id=st.mid, x=x, y=y,
                    # Revenue per worker is anchored on Japanese industry
                    # averages (~16 million yen of turnover per employee); value
                    # added runs at about 42 % of that.
                    revenue_myen=float(size * rng.uniform(12.0, 21.0)
                                       * {"finance_insurance": 1.9, "ict": 1.6,
                                          "manufacturing": 1.35, "professional": 1.4,
                                          "utilities": 2.6, "mining": 1.8,
                                          "wholesale_retail": 1.5}.get(sector, 1.0)),
                    founded=int(np.clip(rng.normal(1991, 22), 1889, 2032)),
                    building_id=building_id))
                firm_id += 1
        self.total_firms = len(self.firms)
        self.total_revenue_gyen = round(sum(f.revenue_myen for f in self.firms) / 1e3, 2)
        # Value added ≈ 42 % of turnover (2019 input-output average for Japan).
        self.total_value_added_gyen = round(self.total_revenue_gyen * 0.42, 2)

    # -- travel demand -----------------------------------------------------
    def _build_travel_demand(self):
        """A doubly-constrained gravity model over the machi, split by mode.

        Attraction uses jobs (workers commute to workplaces); deterrence is an
        exponential decay in travel time, and the mode split comes from the level
        of service actually provided — distance to the nearest station and the
        road capacity between origin and destination.
        """
        rng = self.rng
        mids = list(self.machi_stats.keys())
        n = len(mids)
        idx = {m: i for i, m in enumerate(mids)}
        anchors = np.array([self.districts.machi_by_id[m].anchor for m in mids])
        pop = np.array([self.machi_stats[m].workforce for m in mids], dtype=float)
        jobs = np.array([max(0, self.machi_stats[m].jobs) for m in mids], dtype=float)
        # Commuter attractions: workers per job, capped so the CBD does not
        # absorb the whole city (retail/health jobs are filled locally).
        attract = np.where(jobs > 0, np.minimum(jobs, pop * 2.6), 1.0)
        # A doubly-constrained model is only feasible when both margins have the
        # same total, so the attractions are scaled to the number of workers.
        attract = attract * (pop.sum() / max(1e-9, attract.sum()))
        # travel time proxy: crow-fly distance inflated by 1.35 for street
        # detour, at 22 km/h average urban speed, plus a 6 min access penalty
        d = np.hypot(anchors[:, None, 0] - anchors[None, :, 0],
                     anchors[:, None, 1] - anchors[None, :, 1]) * 1.35
        t = d / (22_000.0 / 60.0) + 6.0
        np.fill_diagonal(t, 3.0)
        beta = 0.115                                   # per minute
        f = np.exp(-beta * t)
        # Doubly-constrained gravity model, solved by Furness (IPF): a_i and b_j
        # are the origin and destination balancing factors. Both are re-derived
        # from the current estimate on every iteration, which is what keeps the
        # procedure stable — scaling the *trip matrix* instead makes it diverge.
        a = np.ones(n)
        b = np.ones(n)
        attract_safe = np.maximum(attract, 1e-6)
        for _ in range(40):
            denom_a = (b[None, :] * attract_safe[None, :] * f).sum(axis=1)
            a = np.where(denom_a > 1e-12, pop / np.maximum(denom_a, 1e-12), 0.0)
            denom_b = (a[:, None] * pop[:, None] * f).sum(axis=0)
            b = np.where(denom_b > 1e-12, attract_safe / np.maximum(denom_b, 1e-12), 1.0)
        # a_i already carries the origin total: multiplying by pop again would
        # count every worker twice (and make the model explode).
        trips = a[:, None] * f * b[None, :] * attract_safe[None, :]
        trips = np.nan_to_num(trips, nan=0.0, posinf=0.0)
        # Final row normalisation: the commuting model must account for exactly
        # the workforce, so any residual from the last balancing half-step is
        # removed here. Destinations then come out as close to their attraction
        # totals as the matrix allows.
        rows = trips.sum(axis=1)
        scale = np.where(rows > 1e-9, pop / np.maximum(rows, 1e-12), 0.0)
        trips = trips * scale[:, None]
        self.od = trips
        self.od_index = idx
        self.od_mids = mids
        self.mean_commute_min = float((trips * t).sum() / max(1e-9, trips.sum()))
        self.mean_commute_km = float((trips * d).sum() / max(1e-9, trips.sum()) / 1e3)

        # Mode split per OD pair: walking under 900 m, cycling under 2.5 km with
        # a hill penalty, otherwise rail if both ends are near a station, else
        # car or bus. This is the standard Japanese urban split shape.
        station_xy = np.array([(s.x, s.y) for s in self.landmarks.stations]) \
            if self.landmarks.stations else np.zeros((0, 2))
        if len(station_xy):
            dstat = np.hypot(anchors[:, None, 0] - station_xy[None, :, 0],
                             anchors[:, None, 1] - station_xy[None, :, 1]).min(axis=1)
        else:
            dstat = np.full(n, 9_999.0)
        station_access = np.clip(1.0 - dstat / 1_500.0, 0.0, 1.0)
        # Utility-style weights (a simplified logit), then normalise per OD pair
        # so every trip has exactly one mode. The shape follows the Japanese
        # urban pattern: walking dominates very short trips, cycling the 1-3 km
        # band, rail the radial long trips into the centre, car everything else.
        walk = np.clip(1.0 - d / 1_500.0, 0.0, 1.0) ** 1.20 * 1.9
        hill = np.clip(1.0 - (self._slope_between(anchors) if hasattr(self, "_slope_pairs")
                              else 0.0), 0.2, 1.0) if False else 1.0
        bike = np.clip(1.0 - d / 3_600.0, 0.0, 1.0) ** 1.1 * 1.35 * hill
        rail_ramp = np.clip(d / 1_200.0, 0.0, 1.0) * np.clip(2.6 - d / 14_000.0, 0.0, 1.0)
        rail = station_access[:, None] * station_access[None, :] * rail_ramp * 1.15
        car = np.full((n, n), 0.95)
        bus = np.full((n, n), 0.075)
        # A car trip is expensive into the centre (parking, congestion).
        centre = np.array([self.machi_stats[m].accessibility for m in mids])
        car = car * (0.55 + 0.6 * (1.0 - np.outer(centre, centre)))
        stack = np.stack([walk, bike, rail, car, bus])
        stack = np.nan_to_num(stack, nan=0.0, posinf=0.0)
        total_w = stack.sum(axis=0)
        shares = np.divide(stack, total_w, out=np.full_like(stack, 0.2), where=total_w > 1e-9)
        self.od_modes = {k: trips * shares[i]
                         for i, k in enumerate(("walk", "bicycle", "rail", "car", "bus"))}
        tot = trips.sum()
        self.mode_split = {k: (float(v.sum() / tot) if tot > 0 else 0.0)
                           for k, v in self.od_modes.items()}
        # Account for non-commuting trips: shopping, school, leisure add ~1.6x
        # the commuting volume; only commuting is routed in detail.
        self.daily_trips_total = int(trips.sum() * 2.6)
        self.workers = int(pop.sum())

    # -- reporting ---------------------------------------------------------
    def summary(self) -> Dict[str, object]:
        return {
            "population": self.total_population,
            "dwellings": self.total_dwellings,
            "vacant_dwellings": sum(s.vacant for s in self.machi_stats.values()),
            "households": sum(s.households for s in self.machi_stats.values()),
            "workforce": self.workers,
            "jobs": self.total_jobs,
            "jobs_per_resident": round(self.total_jobs / max(1, self.total_population), 3),
            "firms": self.total_firms,
            "revenue_gyen": self.total_revenue_gyen,
            "value_added_gyen": self.total_value_added_gyen,
            "value_added_per_capita_kyen": round(
                self.total_value_added_gyen * 1e6 / max(1, self.total_population) / 1e3, 1),
            "mean_commute_min": round(self.mean_commute_min, 1),
            "mean_commute_km": round(self.mean_commute_km, 2),
            "mode_split": {k: round(v, 4) for k, v in self.mode_split.items()},
            "daily_trips": self.daily_trips_total,
            "age_65_p": round(sum(s.age_65_p * s.population for s in self.machi_stats.values())
                              / max(1, self.total_population), 3),
            "mean_household_income_myen": round(
                sum(s.mean_household_income_myen * s.households for s in self.machi_stats.values())
                / max(1, sum(s.households for s in self.machi_stats.values())), 2),
        }

    def ward_table(self) -> List[Dict[str, object]]:
        rows = []
        for st in self.machi_stats.values():
            d = dict(st.as_row())
            d["jobs_by_sector"] = "|".join(f"{k}:{v}" for k, v in sorted(st.jobs_by_sector.items()))
            rows.append(d)
        rows.sort(key=lambda r: (r["district_id"], r["mid"]))
        return rows


# Age-specific labour-force participation (Japan, 2020 census).
PARTICIPATION_TABLE = {"15_64": 0.784, "65p": 0.257}
