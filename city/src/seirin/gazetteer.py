"""Gazetteer generation: the city written up as a reference document.

This is the bridge between the generator and the writers working on the visual
novel. Everything in it is read out of the generated world — the districts, the
wards, the canon landmarks, the transit network, the economy — so the prose can
never drift from the geometry.
"""

from __future__ import annotations

import os
from typing import Dict, List

from .buildings import ZONING
from .society import SECTORS


def _fmt_int(v) -> str:
    return f"{int(v):,}".replace(",", " ")


def _mode_table(mode_split: Dict[str, float]) -> str:
    names = {"walk": "пешком", "bicycle": "велосипед", "rail": "рельсы",
             "car": "автомобиль", "bus": "автобус"}
    rows = ["| Режим | Доля поездок |", "|---|---|"]
    for k, v in sorted(mode_split.items(), key=lambda kv: -kv[1]):
        rows.append(f"| {names.get(k, k)} | {v * 100:.1f} % |")
    return "\n".join(rows)


def write_gazetteer(world: Dict, path: str) -> str:
    terrain = world["terrain"]
    districts = world["districts"]
    roads = world["roads"]
    city = world["city"]
    landmarks = world["landmarks"]
    census = world["census"]
    names = world["names"]
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)

    s = census.summary()
    st = roads.stats()
    out: List[str] = []
    A = out.append

    A("# Сэйрин — географический справочник города")
    A("")
    A("*Сгенерировано процедурным генератором города (`city/`). Все числа получены "
      "из одной и той же модели: районы, кварталы, здания, население, экономика и "
      "транспорт считаются из одного набора геометрии, поэтому справочник и карты "
      "не могут противоречить друг другу.*")
    A("")
    A(f"**Сид генерации:** `{world['seed']}` · "
      f"**время сборки:** {world.get('elapsed_s', 0)} с · "
      f"**проекция:** местная равнопромежуточная, {census.total_population and ''}"
      "34.8072° с. ш., 138.4419° в. д.")
    A("")

    A("## 1. Город в цифрах")
    A("")
    A("| Показатель | Значение |")
    A("|---|---|")
    A(f"| Население | {_fmt_int(s['population'])} чел. |")
    A(f"| Домохозяйства | {_fmt_int(s['households'])} |")
    A(f"| Жилые единицы (всего) | {_fmt_int(s['dwellings'])} |")
    A(f"| Пустующие жилые единицы | {_fmt_int(s['vacant_dwellings'])} "
      f"({s['vacant_dwellings'] / max(1, s['dwellings']) * 100:.1f} %) |")
    A(f"| Рабочая сила | {_fmt_int(s['workforce'])} чел. |")
    A(f"| Рабочие места | {_fmt_int(s['jobs'])} |")
    A(f"| Рабочих мест на жителя | {s['jobs_per_resident']:.3f} |")
    A(f"| Доля жителей 65+ | {s['age_65_p'] * 100:.1f} % |")
    A(f"| Средний доход домохозяйства | {s['mean_household_income_myen']:.2f} млн иен/год |")
    A(f"| Зданий | {_fmt_int(len(city.buildings))} |")
    A(f"| Земельных участков | {_fmt_int(len(city.parcels))} |")
    A(f"| Кварталов | {_fmt_int(len(city.blocks))} |")
    A(f"| Общая площадь пола | {city.stats.get('floor_km2', 0):.1f} км² |")
    A(f"| Площадь пола на жителя | {city.stats.get('floor_area_per_capita', 0):.1f} м² |")
    A(f"| Доля деревянных зданий | {city.stats.get('wood_share', 0) * 100:.1f} % |")
    A(f"| Доля зданий до 1981 года (старый сейсмонорматив) | "
      f"{city.stats.get('pre1981_share', 0) * 100:.1f} % |")
    A(f"| Улицы | {st['length_km']:.0f} км, {_fmt_int(st['segments'])} сегментов |")
    A(f"| Мосты | {_fmt_int(st['bridges'])} |")
    A(f"| Станции | {_fmt_int(len(landmarks.stations))} |")
    A(f"| Поездки на общественном транспорте | "
      f"{_fmt_int(sum(x.daily_boardings for x in landmarks.stations))}/сутки |")
    A(f"| Предприятия | {_fmt_int(s['firms'])} |")
    A(f"| Оборот | {s['revenue_gyen']:.0f} млрд иен/год |")
    A(f"| Добавленная стоимость | {s['value_added_gyen']:.0f} млрд иен/год, "
      f"{s['value_added_per_capita_kyen']:.1f} млн на жителя |")
    A(f"| Суша / вода в рамке модели | "
      f"{terrain.land_union().area / 1e6:.0f} / {terrain.water_polygon().area / 1e6:.0f} км² |")
    A("")

    A("## 2. География")
    A("")
    A("Город стоит на тихоокеанском побережье центрального Хонсю, на берегу "
      "бухты Сэйрин. Бухта открыта к югу и **не имеет моста**: любое сообщение "
      "между северным и южным берегом — паром или объезд вокруг бухты. Это "
      "обстоятельство определяет и планировку, и драматургию.")
    A("")
    A("| Река | Тип | Расход | Длина | Примечание |")
    A("|---|---|---|---|---|")
    for rv in terrain.rivers:
        length = rv.line().length / 1000.0
        A(f"| {rv.name_kanji} ({rv.name_romaji}) | {rv.kind} | "
          f"{rv.discharge_m3s:g} м³/с | {length:.1f} км | "
          f"{'впадает в бухту' if rv.kind != 'creek' else 'приток Камикуры'} |")
    A("")
    A("Высотные пояса: прибрежная равнина 0–40 м, морская терраса 40–120 м, "
      "предгорья 120–400 м, хребет Тэнро/Камикура до 1 100 м. "
      "Источник Камикуры на отметке "
      f"{terrain.height_at(landmarks.by_id['kamikura_spring'].x, landmarks.by_id['kamikura_spring'].y):.0f} м "
      "питает город и является предметом конфликта вокруг «Шельфа-4».")
    A("")

    A("## 3. Районы")
    A("")
    A("| Район | Функция | Население | Рабочие места | Плотность | Средний доход |")
    A("|---|---|---|---|---|---|")
    for d in districts.districts:
        ds = census.district_stats.get(d["id"])
        if not ds:
            continue
        A(f"| **{d['romaji']}** ({d['kanji']}) | {d['english']} | "
          f"{_fmt_int(ds['population'])} | {_fmt_int(ds['jobs'])} | "
          f"{_fmt_int(ds['density_per_km2'])} чел/км² | "
          f"{ds['mean_income_myen']:.2f} млн иен |")
    A("")
    for d in districts.districts:
        if d["id"].startswith("rural"):
            continue
        A(f"### {d['romaji']} — {d['kanji']}")
        A("")
        A(f"*{d['english']}.* {d['character']}")
        A("")
        nb_list = [nb for nb in districts.neighbourhoods if nb.district_id == d["id"]]
        if nb_list:
            A("Кварталы (町, machi):")
            A("")
            A("| Мати | Тип | Население | Рабочие места | Зонирование | Год застройки |")
            A("|---|---|---|---|---|---|")
            for nb in sorted(nb_list, key=lambda n: -n.polygon.area):
                m = census.machi_stats.get(nb.id)
                if m is None:
                    continue
                zone = ZONING.get(getattr(nb, "zoning", "1shu"), ZONING["1shu"])
                A(f"| {nb.romaji} ({nb.kanji}) | {nb.kind} | {_fmt_int(m.population)} | "
                  f"{_fmt_int(m.jobs)} | {zone['label']} | {nb.built_year_median} |")
            A("")
    A("")

    A("## 4. Канонические объекты")
    A("")
    A("| Объект | Тип | Координаты | Этажей | Рабочих мест | Примечание |")
    A("|---|---|---|---|---|---|")
    for p in landmarks.canon:
        A(f"| **{p.romaji}** ({p.kanji}) | {p.kind} | "
          f"{p.x:.0f}, {p.y:.0f} | {p.floors} | {_fmt_int(p.jobs)} | {p.note} |")
    A("")

    A("## 5. Транспорт")
    A("")
    A("| Линия | Тип | Станций | Длина | Пассажиров/сутки | Открыта |")
    A("|---|---|---|---|---|---|")
    for line in landmarks.lines:
        A(f"| {line.romaji} ({line.kanji}) | {line.kind} | {len(line.stations)} | "
          f"{line.length_km:g} км | {_fmt_int(line.daily_riders)} | {line.opened} |")
    A("")
    A("| Станция | Тип | Линии | Пассажиров/сутки | Население в 900 м |")
    A("|---|---|---|---|---|")
    for stn in sorted(landmarks.stations, key=lambda x: -x.daily_boardings):
        A(f"| {stn.romaji} ({stn.kanji}) | {stn.kind} | {len(stn.lines)} | "
          f"{_fmt_int(stn.daily_boardings)} | {_fmt_int(stn.catchment_pop)} |")
    A("")
    A("### Мосты")
    A("")
    A("| Мост | Река | Длина | Год |")
    A("|---|---|---|---|")
    for br in sorted(roads.bridges, key=lambda b: -b.length_m)[:24]:
        A(f"| {br.name_romaji} ({br.name_kanji}) | {br.river} | "
          f"{br.length_m:.0f} м | {br.year_built} |")
    A("")

    A("## 6. Передвижение")
    A("")
    A(f"Средняя поездка на работу — **{s['mean_commute_min']} мин / "
      f"{s['mean_commute_km']} км**. Всего поездок в сутки (включая нерабочие "
      f"цели): **{_fmt_int(s['daily_trips'])}**.")
    A("")
    A(_mode_table(s["mode_split"]))
    A("")

    A("## 7. Экономика")
    A("")
    A(f"Рабочих мест {_fmt_int(s['jobs'])} при населении {_fmt_int(s['population'])}. "
      f"Предприятий {_fmt_int(s['firms'])}; крупнейшие работодатели — "
      "обрабатывающая промышленность и портовая логистика.")
    A("")
    A("| Отрасль | Доля рабочих мест |")
    A("|---|---|")
    for k, v in sorted(SECTORS.items(), key=lambda kv: -kv[1]):
        A(f"| {k} | {v * 100:.1f} % |")
    A("")

    A("## 8. Жильё и риск")
    A("")
    A("Сейсмический риск считается по сочетанию материала, года постройки "
      "(сейсмонормативы: 1950, 1971, 1981 «новый сейсмостандарт», 2000) и "
      "грунта: старый деревянный дом на засыпанном грунте — самое опасное "
      "сочетание, и именно оно определяет распределение риска на карте.")
    A("")
    bl = city.buildings
    if bl:
        import numpy as np
        risk = np.array([b.risk_quake for b in bl])
        A(f"| Показатель | Значение |")
        A("|---|---|")
        A(f"| Средний риск | {risk.mean():.3f} |")
        A(f"| Доля зданий с риском > 0.5 | {(risk > 0.5).mean() * 100:.1f} % |")
        A(f"| Доля деревянных зданий | {city.stats['wood_share'] * 100:.1f} % |")
        A(f"| Доля до 1981 года | {city.stats['pre1981_share'] * 100:.1f} % |")
    A("")

    A("## 9. Топонимика")
    A("")
    A(f"Генератор имён построил {len(set(names.used))} уникальных топонимов из "
      "фиксированного набора японских элементов (光, 月, 鉄, 港, 天, 上, 倉 …). "
      "Каждое имя существует в двух видах — кандзи и ромадзи — и они всегда "
      "соответствуют друг другу.")
    A("")
    A("## 10. Как читать данные")
    A("")
    A("* `data/districts.csv`, `data/neighbourhoods.csv` — административная статистика.")
    A("* `data/buildings.csv` — каждое здание: тип, этажность, материал, год, "
      "площади, население, рабочие места, риск.")
    A("* `data/streets.csv`, `data/bridges.csv` — уличная сеть.")
    A("* `data/stations.csv`, `data/transit_lines.csv` — транспорт.")
    A("* `data/od_matrix_top.csv` — матрица трудовых корреспонденций.")
    A("* `data/seirin.geojson` — вся геометрия в WGS84.")
    A("")

    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out))
    return path
