"""Tabular and geographic data exports.

What a production actually needs alongside the art: the city as open data.

* `GeoJSON` in real WGS84 coordinates (the local metre frame projected through
  a documented equirectangular mapping), so the city opens in QGIS, kepler.gl,
  Mapbox or geojson.io next to real Japanese geography.
* `CSV` tables for the wards, neighbourhoods, buildings, streets, bridges,
  stations, firms and the economy — the numbers behind every map.
* `JSON` — the whole world state, so the pipeline can be re-run for exports
  without regenerating the city.
"""

from __future__ import annotations

import csv
import json
import math
import os
from typing import Dict, Iterable, List, Optional, Sequence

import numpy as np
from shapely.geometry import mapping

from .base import LAT0, LON0, geom_to_wgs84, to_wgs84
from .buildings import City
from .districts import DistrictSystem
from .landmarks import Landmarks
from .roads import RoadNetwork
from .society import Census
from .terrain import Terrain


def write_geojson(path: str, terrain: Terrain, districts: DistrictSystem,
                  roads: RoadNetwork, city: City, landmarks: Landmarks,
                  census: Census) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    features: List[Dict] = []

    def add(geom, props: Dict):
        if geom is None or geom.is_empty:
            return
        features.append(dict(type="Feature",
                             geometry=mapping(geom_to_wgs84(geom)),
                             properties=props))

    # Administrative boundaries
    for d in districts.districts:
        if d["polygon"] is None:
            continue
        props = dict(layer="district", id=d["id"], name=d["romaji"],
                     name_ja=d["kanji"], kind=d["kind"],
                     canon=bool(d.get("canon")),
                     english=d["english"])
        # census stats are merged last but must not clobber the identity keys
        for k, v in census.district_stats.get(d["id"], {}).items():
            props.setdefault(k, v)
        add(d["polygon"], props)
    for nb in districts.neighbourhoods:
        st = census.machi_stats.get(nb.id)
        props = dict(layer="neighbourhood", id=nb.id, name=nb.romaji,
                     name_ja=nb.kanji, district=nb.district_id, kind=nb.kind,
                     zoning=getattr(nb, "zoning", ""),
                     area_m2=round(nb.polygon.area, 1))
        if st:
            props.update(dict(population=st.population, dwellings=st.dwellings,
                              jobs=st.jobs, households=st.households,
                              vacancy_rate=round(st.vacancy_rate, 4),
                              mean_income_myen=round(st.mean_household_income_myen, 2),
                              age_65_share=round(st.age_65_p, 4),
                              land_value_kyen_per_m2=round(st.land_value_myen_per_sqm * 1000, 1)))
        add(nb.polygon, props)

    # Hydrology and landform
    add(terrain.land_union(), dict(layer="land", name="Seirin land area"))
    add(terrain.water_polygon(), dict(layer="water", name="Seirin Bay and Pacific",
                                      kind="sea"))
    for rv in terrain.rivers:
        add(rv.line(), dict(layer="river", name=rv.name_romaji, name_ja=rv.name_kanji,
                            kind=rv.kind, discharge_m3s=rv.discharge_m3s))
    # River water surfaces are separate polygons from the river centre lines, and
    # both are needed: the line carries the hydrology, the polygon is what the
    # water actually covers.
    for g in terrain.river_water_polygons():
        add(g, dict(layer="river_surface"))
    for lv in (50, 200, 500):
        for ln in terrain.contours([lv])[lv]:
            add(ln, dict(layer="contour", elevation_m=lv))

    # Streets, bridges, rail
    for st in roads.streets:
        if st.klass in ("service", "alley") and st.length < 25.0:
            continue
        add(st.line, dict(layer="street", name=st.name_romaji, name_ja=st.name_kanji,
                          klass=st.klass, width_m=st.width, speed_kmh=st.speed,
                          lanes=st.lanes, oneway=st.oneway,
                          length_m=round(st.length, 1),
                          centrality=round(roads.centrality.get(st.id, 0.0), 6)))
    for br in roads.bridges:
        add(br.line, dict(layer="bridge", name=br.name_romaji, name_ja=br.name_kanji,
                          river=br.river, deck_width_m=br.deck_width,
                          length_m=round(br.length_m, 1), year_built=br.year_built))
    for line in landmarks.lines:
        add(line.geometry, dict(layer="transit_line", id=line.id, name=line.romaji,
                                name_ja=line.kanji, kind=line.kind,
                                length_km=line.length_km, daily_riders=line.daily_riders,
                                opened=line.opened))

    # Stations, landmarks, POIs
    for st in landmarks.stations:
        add(st.point, dict(layer="station", id=st.id, name=st.romaji, name_ja=st.kanji,
                           kind=st.kind, lines=len(st.lines),
                           daily_boardings=st.daily_boardings,
                           catchment_population=st.catchment_pop, opened=st.opened))
    for poi in landmarks.canon:
        add(poi.point, dict(layer="landmark", id=poi.id, name=poi.romaji,
                            name_ja=poi.kanji, kind=poi.kind, canon=True,
                            floors=poi.floors, jobs=poi.jobs, note=poi.note))
    for poi in landmarks.pois:
        add(poi.point, dict(layer="poi", id=poi.id, kind=poi.kind,
                            machi=poi.machi_id, jobs=poi.jobs,
                            capacity=poi.capacity))

    # Buildings: exported in four bands so a viewer can load by level of detail.
    bands = {"small": (0.0, 12.0), "mid": (12.0, 30.0), "tall": (30.0, 60.0),
             "high_rise": (60.0, 1000.0)}
    counts = {k: 0 for k in bands}
    for b in city.buildings:
        for name, (lo, hi) in bands.items():
            if lo <= b.height_m < hi:
                counts[name] += 1
                if counts[name] > 40_000 and name in ("small",):
                    break        # cap the smallest band; the CSV carries all of them
                add(b.polygon, dict(layer="building", band=name, kind=b.kind,
                                    height_m=round(b.height_m, 1), storeys=b.storeys,
                                    year=b.year, zoning=b.zoning,
                                    material=b.material, floor_m2=round(b.floor_m2, 1),
                                    residents=b.occupants, dwellings=b.units,
                                    jobs=b.jobs, address=b.address,
                                    quake_risk=round(b.risk_quake, 3),
                                    value_myen=round(b.value_myen, 1)))
                break

    fc = dict(type="FeatureCollection",
              name="Seirin: Night Shift — Resonance 2030",
              crs=dict(type="name", properties=dict(
                  name="urn:ogc:def:crs:OGC:1.3:CRS84")),
              metadata=dict(generator="Seirin city generator",
                            projection=f"local equirectangular about "
                                       f"{LAT0}N {LON0}E, metres",
                            note="Coordinates are real WGS84 lon/lat; the city is "
                                 "fictional and is anchored on the Pacific coast of "
                                 "central Honshu for geographic plausibility.",
                            layers=sorted({f["properties"].get("layer") for f in features})),
              features=features)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(fc, fh, ensure_ascii=False, separators=(",", ":"))
    return path


def _write_csv(path: str, rows: Iterable[Dict], columns: Optional[Sequence[str]] = None) -> str:
    rows = list(rows)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    if not rows:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("")
        return path
    cols = list(columns) if columns else list(rows[0].keys())
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: (round(v, 4) if isinstance(v, float) else v)
                        for k, v in r.items() if k in cols})
    return path


def write_tables(out_dir: str, terrain: Terrain, districts: DistrictSystem,
                 roads: RoadNetwork, city: City, landmarks: Landmarks,
                 census: Census) -> Dict[str, str]:
    """Every number behind the maps, as CSV."""
    os.makedirs(out_dir, exist_ok=True)
    written: Dict[str, str] = {}

    # 1. Districts
    rows = []
    for d in districts.districts:
        st = census.district_stats.get(d["id"], {})
        rows.append(dict(district_id=d["id"], name=d["romaji"], name_ja=d["kanji"],
                         english=d["english"], canon=d.get("canon"),
                         kind=d["kind"], centre_x=d["centre"][0], centre_y=d["centre"][1],
                         lon=round(to_wgs84(*d["centre"])[0], 6),
                         lat=round(to_wgs84(*d["centre"])[1], 6),
                         area_km2=st.get("area_km2", 0.0),
                         population=st.get("population", 0),
                         dwellings=st.get("dwellings", 0),
                         jobs=st.get("jobs", 0),
                         density_per_km2=st.get("density_per_km2", 0),
                         mean_income_myen=st.get("mean_income_myen", 0.0),
                         age_65_share=st.get("age_65_p", 0.0),
                         floor_per_capita_m2=st.get("floor_per_capita", 0.0),
                         character=d["character"]))
    written["districts"] = _write_csv(os.path.join(out_dir, "districts.csv"), rows)

    # 2. Neighbourhoods (machi)
    written["neighbourhoods"] = _write_csv(
        os.path.join(out_dir, "neighbourhoods.csv"),
        [dict(**(r.as_row()), jobs_by_sector=";".join(
            f"{k}={v}" for k, v in sorted(r.jobs_by_sector.items()) if v))
         for r in census.machi_stats.values()])

    # 3. Buildings (the whole stock: 170 000+ rows)
    rows = (dict(building_id=b.id, kind=b.kind, storeys=b.storeys,
                 height_m=round(b.height_m, 2), foot_m2=round(b.foot_m2, 1),
                 floor_m2=round(b.floor_m2, 1), year=b.year, material=b.material,
                 zoning=b.zoning, district=b.district_id, machi=b.machi_id,
                 address=b.address, x=round(b.centre[0], 1), y=round(b.centre[1], 1),
                 lon=round(to_wgs84(*b.centre)[0], 6), lat=round(to_wgs84(*b.centre)[1], 6),
                 residents=b.occupants, dwellings=b.units, jobs=b.jobs,
                 quake_risk=round(b.risk_quake, 3), fire_risk=round(b.risk_fire, 3),
                 value_myen=round(b.value_myen, 1))
            for b in city.buildings)
    written["buildings"] = _write_csv(os.path.join(out_dir, "buildings.csv"), rows)

    # 4. Streets
    rows = (dict(street_id=s.id, name=s.name_romaji, name_ja=s.name_kanji,
                 klass=s.klass, length_m=round(s.length, 1), width_m=s.width,
                 lanes=s.lanes, speed_kmh=s.speed, oneway=s.oneway,
                 centrality=round(roads.centrality.get(s.id, 0.0), 6))
            for s in roads.streets)
    written["streets"] = _write_csv(os.path.join(out_dir, "streets.csv"), rows)

    # 5. Bridges
    written["bridges"] = _write_csv(
        os.path.join(out_dir, "bridges.csv"),
        [dict(bridge_id=b.id, name=b.name_romaji, name_ja=b.name_kanji, river=b.river,
              length_m=round(b.length_m, 1), deck_width_m=b.deck_width,
              year_built=b.year_built) for b in roads.bridges])

    # 6. Stations and lines
    written["stations"] = _write_csv(
        os.path.join(out_dir, "stations.csv"),
        [dict(station_id=s.id, name=s.romaji, name_ja=s.kanji, kind=s.kind,
              lines=len(s.lines), platforms=s.platforms,
              daily_boardings=s.daily_boardings, catchment_pop=s.catchment_pop,
              catchment_jobs=s.catchment_jobs, opened=s.opened,
              x=round(s.x, 1), y=round(s.y, 1),
              lon=round(to_wgs84(s.x, s.y)[0], 6),
              lat=round(to_wgs84(s.x, s.y)[1], 6))
         for s in landmarks.stations])
    written["transit_lines"] = _write_csv(
        os.path.join(out_dir, "transit_lines.csv"),
        [dict(line_id=l.id, name=l.romaji, name_ja=l.kanji, kind=l.kind,
              stations=len(l.stations), length_km=l.length_km,
              daily_riders=l.daily_riders, headway_s=l.headway_s, opened=l.opened)
         for l in landmarks.lines])

    # 7. Landmarks and POIs
    written["landmarks"] = _write_csv(
        os.path.join(out_dir, "landmarks.csv"),
        [dict(id=p.id, name=p.romaji, name_ja=p.kanji, kind=p.kind, canon=True,
              x=round(p.x, 1), y=round(p.y, 1),
              lon=round(to_wgs84(p.x, p.y)[0], 6),
              lat=round(to_wgs84(p.x, p.y)[1], 6),
              floors=p.floors, footprint_m2=p.footprint_m2, jobs=p.jobs,
              district=p.district_id, machi=p.machi_id, note=p.note)
         for p in landmarks.canon])
    written["pois"] = _write_csv(
        os.path.join(out_dir, "pois.csv"),
        [dict(id=p.id, kind=p.kind, x=round(p.x, 1), y=round(p.y, 1),
              district=p.district_id, machi=p.machi_id, jobs=p.jobs,
              capacity=p.capacity, floors=p.floors, footprint_m2=p.footprint_m2)
         for p in landmarks.pois])

    # 8. Firms
    written["firms"] = _write_csv(
        os.path.join(out_dir, "firms.csv"),
        [dict(firm_id=f.id, name=f.name_romaji, name_ja=f.name_kanji, sector=f.sector,
              size_class=f.size_class, employees=f.employees, machi=f.machi_id,
              x=round(f.x, 1), y=round(f.y, 1), founded=f.founded,
              revenue_myen=round(f.revenue_myen, 1)) for f in census.firms])

    # 9. OD matrix (commuting flows, top pairs only — the full matrix is JSON)
    rows = []
    mids = census.od_mids
    od = census.od
    for i in range(len(mids)):
        for j in range(len(mids)):
            v = od[i, j]
            if v >= 5.0:
                rows.append(dict(origin_machi=mids[i], dest_machi=mids[j],
                                 trips=round(float(v), 2),
                                 origin_name=districts.machi_by_id[mids[i]].romaji,
                                 dest_name=districts.machi_by_id[mids[j]].romaji))
    rows.sort(key=lambda r: -r["trips"])
    written["od_matrix"] = _write_csv(os.path.join(out_dir, "od_matrix_top.csv"),
                                      rows[:200_000])

    # 10. Economy summary
    written["economy"] = _write_csv(
        os.path.join(out_dir, "economy.csv"),
        [dict(metric=k, value=v if not isinstance(v, (dict, list)) else json.dumps(v))
         for k, v in census.summary().items()])

    # 11. City summary (everything else)
    summary = dict(
        generated="Seirin city generator",
        population=census.total_population,
        dwellings=census.total_dwellings,
        buildings=len(city.buildings),
        parcels=len(city.parcels),
        blocks=len(city.blocks),
        street_segments=len(roads.streets),
        street_km=roads.stats()["length_km"],
        bridges=len(roads.bridges),
        stations=len(landmarks.stations),
        transit_lines=len(landmarks.lines),
        landmarks=len(landmarks.canon),
        pois=len(landmarks.pois),
        firms=len(census.firms),
        land_km2=round(terrain.land_union().area / 1e6, 2),
        water_km2=round(terrain.water_polygon().area / 1e6, 2),
        model_frame_km=f"{int((12000 + 11000) / 1000)} x {int((14500 + 8800) / 1000)}",
        population_density_per_km2=round(census.total_population /
                                        max(1.0, terrain.land_union().area / 1e6), 1),
        mode_split=census.mode_split,
        mean_commute_km=round(census.mean_commute_km, 2),
    )
    with open(os.path.join(out_dir, "city_summary.json"), "w", encoding="utf-8") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=2)
    written["summary"] = os.path.join(out_dir, "city_summary.json")
    return written


def _rings(geom) -> List[List[List[float]]]:
    """Geometry -> list of exterior rings in metres, rounded to 0.1 m."""
    if geom is None or geom.is_empty:
        return []
    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    return [[(round(x, 1), round(y, 1)) for x, y in p.exterior.coords]
            for p in polys if p.geom_type == "Polygon" and len(p.exterior.coords) > 3]


def write_world_json(path: str, terrain: Terrain, districts: DistrictSystem,
                     roads: RoadNetwork, city: City, landmarks: Landmarks,
                     census: Census, seed: int) -> str:
    """A compact world state: enough to redraw the city without regenerating it."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    payload = dict(
        seed=seed,
        projection=dict(lat0=LAT0, lon0=LON0, units="metres, +x east, +y north"),
        summary=dict(population=census.total_population, jobs=census.total_jobs,
                     buildings=len(city.buildings), seed=seed),
        districts=[dict(id=d["id"], name=d["romaji"], name_ja=d["kanji"],
                        kind=d["kind"], centre=d["centre"],
                        rings=_rings(d["polygon"]))
                   for d in districts.districts],
        rivers=[dict(name=r.name_romaji, name_ja=r.name_kanji, kind=r.kind,
                     discharge_m3s=r.discharge_m3s,
                     points=[(round(x, 1), round(y, 1)) for x, y in r.points],
                     half_width=r.half_width, bed=r.bed) for r in terrain.rivers],
        stations=[dict(id=s.id, name=s.romaji, name_ja=s.kanji, kind=s.kind,
                       x=s.x, y=s.y, lines=s.lines,
                       daily_boardings=s.daily_boardings) for s in landmarks.stations],
        lines=[dict(id=l.id, name=l.romaji, name_ja=l.kanji, kind=l.kind,
                    stations=l.stations, length_km=l.length_km,
                    daily_riders=l.daily_riders) for l in landmarks.lines],
        landmarks=[dict(id=p.id, name=p.romaji, name_ja=p.kanji, kind=p.kind,
                        x=p.x, y=p.y, floors=p.floors, jobs=p.jobs) for p in landmarks.canon],
    )
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
    return path
