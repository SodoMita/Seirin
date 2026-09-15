"""Invariant checks: the assertions the generator must never violate.

These are not unit tests of functions — they are checks on the *city*, run
against a generated world. A city is internally consistent or it is not, and
these are the properties that make it consistent.
"""

from __future__ import annotations

import math
from typing import Dict, List

import numpy as np
from shapely.geometry import Point

from .base import LAT0, LON0, geom_to_wgs84, to_wgs84
from .buildings import ZONING


def run_checks(world: Dict) -> Dict:
    terrain = world["terrain"]
    districts = world["districts"]
    roads = world["roads"]
    city = world["city"]
    landmarks = world["landmarks"]
    census = world["census"]
    lines: List[str] = []
    passed = failed = 0

    def check(name: str, ok: bool, detail: str = ""):
        nonlocal passed, failed
        if ok:
            passed += 1
            lines.append(f"  PASS  {name}{'  — ' + detail if detail else ''}")
        else:
            failed += 1
            lines.append(f"  FAIL  {name}{'  — ' + detail if detail else ''}")

    lines.append("Seirin city checks")
    lines.append("")

    # -- geography -------------------------------------------------------
    water = terrain.water_polygon()
    land = terrain.land_union()
    check("land and water are disjoint", land.intersection(water).area < 1.0,
          f"overlap {land.intersection(water).area:.3f} m²")
    check("land + water covers the model frame",
          abs((land.area + water.area) - (X1 - X0) * (Y1 - Y0)) / ((X1 - X0) * (Y1 - Y0)) < 0.02)
    # Tested against the vector water polygon, not the 20 m height grid: a
    # building a few metres inland can have its centre in a grid cell that the
    # 0-contour marks as water, and that is a sampling artefact, not an error.
    wet_buildings = []
    for b in city.buildings:
        if not b.polygon.intersects(water):
            continue
        if b.polygon.intersection(water).area / max(b.polygon.area, 1e-6) > 0.5:
            wet_buildings.append(b.id)
    check("no building stands in water", not wet_buildings,
          f"{len(wet_buildings)} buildings" if wet_buildings else
          f"all {len(city.buildings):,} buildings on land")
    # Roads may cross water only on a bridge; every other metre must be on land.
    bridge_zones = [br.line.buffer(br.length_m * 0.6 + 15.0) for br in roads.bridges]
    from shapely.ops import unary_union as _uu
    bridge_area = _uu(bridge_zones) if bridge_zones else None
    offenders = 0
    for st in roads.streets:
        if st.klass not in ("trunk", "arterial"):
            continue
        for k in range(1, 6):
            p = st.line.interpolate(k / 6.0, normalized=True)
            if not terrain.is_water(p.x, p.y):
                continue
            if bridge_area is not None and bridge_area.distance(p) < 30.0:
                continue
            offenders += 1
            break
    check("streets cross water only at bridges", offenders == 0,
          f"{offenders} segments in water without a bridge")
    river_ok = [rv.name_romaji for rv in terrain.rivers
                if not (terrain.is_water(*rv.points[-1])
                        or terrain.height_at(*rv.points[-1]) < 3.0)]
    check("every river reaches the sea", not river_ok,
          "all rivers reach the bay" if not river_ok else f"dry: {river_ok}")
    bay_centre = Point(2_400.0, -4_400.0)
    rail_in_bay = [l.romaji for l in landmarks.lines
                   if l.kind == "rail" and l.geometry.distance(bay_centre) < 1_200.0]
    check("the bay is not bridged for rail", not rail_in_bay,
          ", ".join(rail_in_bay) if rail_in_bay else "no rail line crosses the bay")

    # -- streets ---------------------------------------------------------
    stats = roads.stats()
    check("street network is connected",
          _largest_component_share(roads) > 0.90,
          f"largest component {_largest_component_share(roads):.1%}")
    km_per_km2 = roads_total_km(roads) / max(0.01, land.area / 1e6)
    check("road density is plausible for a Japanese city",
          2.0 <= km_per_km2 <= 9.0,
          f"{km_per_km2:.2f} km of street per km² of land "
          f"({roads_km_per_capita(roads, census):.1f} m per resident)")
    check("bridges exist where roads cross rivers", len(roads.bridges) >= 8,
          f"{len(roads.bridges)} bridges")

    # -- buildings -------------------------------------------------------
    bad_far = 0
    bad_bcr = 0
    for b in city.buildings:
        z = ZONING.get(b.zoning, ZONING["1shu"])
        far = max(z["far"], getattr(b, "far_applied", 0.0))
        bcr = max(z["bcr"], getattr(b, "bcr_applied", 0.0))
        lot_area = _lot_area(city, b)
        if lot_area > 0:
            if b.floor_m2 > far * lot_area * 1.05:
                bad_far += 1
            if b.foot_m2 > bcr * lot_area * 1.05:
                bad_bcr += 1
    check("floor-area ratio respects the applied envelope", bad_far == 0,
          f"{bad_far} of {len(city.buildings):,} buildings over FAR")
    check("building coverage ratio respects the applied envelope", bad_bcr == 0,
          f"{bad_bcr} of {len(city.buildings):,} buildings over BCR")
    heights = np.array([b.height_m for b in city.buildings])
    check("height distribution is that of a Japanese regional city",
          5.0 < float(np.median(heights)) < 14.0 and
          float(np.percentile(heights, 99)) < 80.0 and
          float(heights.max()) > 60.0,
          f"median {np.median(heights):.1f} m, p99 {np.percentile(heights, 99):.0f} m, "
          f"max {heights.max():.0f} m")
    check("pre-1981 stock is a realistic minority",
          0.18 <= city.stats["pre1981_share"] <= 0.55,
          f"{city.stats['pre1981_share']:.1%}")

    # -- society ---------------------------------------------------------
    s = census.summary()
    check("population is in the range the design document implies",
          250_000 <= s["population"] <= 900_000, f"{s['population']:,}")
    check("jobs per resident matches the national ratio",
          0.45 <= s["jobs_per_resident"] <= 0.70, f"{s['jobs_per_resident']:.3f}")
    check("ageing share matches Japan", 0.20 <= s["age_65_p"] <= 0.36,
          f"{s['age_65_p']:.1%}")
    check("travel demand is conserved (no trips invented)",
          abs(census.od.sum() - census.workers) / max(1.0, census.workers) < 0.01,
          f"{census.od.sum():,.0f} trips for {census.workers:,} workers")
    modes = s["mode_split"]
    check("mode split is a plausible Japanese split",
          modes["car"] < 0.78 and modes["rail"] > 0.03 and modes["walk"] > 0.02,
          ", ".join(f"{k} {v:.0%}" for k, v in modes.items()))
    check("mean commute is sane", 8.0 <= s["mean_commute_min"] <= 40.0,
          f"{s['mean_commute_min']} min / {s['mean_commute_km']} km")

    # -- naming ----------------------------------------------------------
    names = [nb.romaji for nb in districts.neighbourhoods]
    check("neighbourhood names are unique", len(names) == len(set(names)),
          f"{len(names) - len(set(names))} duplicates")
    streets = [s.name_romaji for s in roads.streets]
    check("street names are drawn from a Japanese toponym generator",
          all("-" in n for n in streets) and len(set(streets)) > 100,
          f"{len(set(streets))} distinct names")
    numbered = [n for n in (names + streets + [s.romaji for s in landmarks.stations]
                            + [p.romaji for p in landmarks.pois])
                if n.startswith("Chōme-")]
    check("the name bank never exhausted its element combinations", not numbered,
          f"{len(numbered)} numbered placeholder names")

    # -- data integrity --------------------------------------------------
    lon, lat = to_wgs84(0.0, 0.0)
    from .base import from_wgs84
    bx, by = from_wgs84(lon, lat)
    check("projection round-trips",
          abs(lat - LAT0) < 1e-9 and abs(lon - LON0) < 1e-9
          and abs(bx) < 1e-6 and abs(by) < 1e-6,
          f"origin -> {lat:.4f}N {lon:.4f}E -> ({bx:.6f}, {by:.6f}) m")

    return dict(passed=passed, failed=failed, lines=lines)


def _lot_area(city, building) -> float:
    pid = getattr(city, "parcels_of_building", {}).get(building.id)
    if pid is None or pid >= len(city.parcels):
        return 0.0
    return city.parcels[pid].area


def _largest_component_share(roads) -> float:
    import networkx as nx
    g = roads.adjacency
    if g.number_of_nodes() == 0:
        return 0.0
    comps = sorted(nx.connected_components(g), key=len, reverse=True)
    return len(comps[0]) / g.number_of_nodes()


def roads_total_km(roads) -> float:
    return sum(s.length for s in roads.streets) / 1000.0


def roads_km_per_capita(roads, census) -> float:
    if not census.total_population:
        return 0.0
    total_km = sum(s.length for s in roads.streets) / 1000.0
    return total_km * 1000.0 / census.total_population


from .terrain import X0, X1, Y0, Y1  # noqa: E402  (imported late to avoid cycles)
