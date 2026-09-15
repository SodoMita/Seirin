# Invariant checks

`PYTHONPATH=src .venv/bin/python -m seirin check` generates (or loads) the
city and asserts 23 properties on it. They are not unit tests of functions —
they are properties of the *city*, and they exist because every one of them
was violated by a bug at some point during development.

Run them after any change to the generator. A city that fails a check is a city
that will look wrong on the map, and the failure is usually visible in the
output long before it is visible in the drawing.

## Geography

| Check | What it caught |
|---|---|
| land and water are disjoint | an off-by-one in the wet-cell extraction |
| land + water covers the model frame | a hole left in the frame by the sentinel padding |
| no building stands in water | buildings placed from a single interior sample point that straddled a quay |
| streets cross water only at bridges | arterial routing straight through the bay; the check tolerates a bridge zone of 30 m |
| every river reaches the sea | a river bed carved above sea level at its mouth |
| **the bay is not bridged for rail** | the design document forbids it; this is a canon check, not a physics one |

## Streets

| Check | Threshold |
|---|---|
| street network is connected | largest component > 90 % of junctions |
| road density is plausible | 2.0 – 9.0 km of street per km² of land (Japanese cities: 3–8) |
| bridges exist where roads cross rivers | at least 8 |

## Buildings

| Check | Threshold |
|---|---|
| FAR respects the applied envelope | 0 violations over 173 662 buildings |
| BCR respects the applied envelope | 0 violations |
| height distribution is that of a Japanese regional city | median 5–14 m, p99 < 80 m, max > 60 m |
| pre-1981 stock is a realistic minority | 18 – 55 % |

The envelope check compares against the limits *actually applied* to each lot
(recorded on the building as `far_applied` / `bcr_applied`), which is the
district plan where a redevelopment site raises it. Checking a global default
instead reports false violations and hides real ones.

## Society

| Check | Threshold |
|---|---|
| population is in the range the design document implies | 250 000 – 900 000 |
| jobs per resident matches the national ratio | 0.45 – 0.70 |
| ageing share matches Japan | 20 – 36 % |
| **travel demand is conserved** | the OD matrix sums to the workforce within 1 % |
| mode split is a plausible Japanese split | car < 78 %, rail > 3 %, walk > 2 % |
| mean commute is sane | 8 – 40 minutes |

## Naming and geometry

| Check | Threshold |
|---|---|
| neighbourhood names are unique | 0 duplicates |
| street names come from the toponym generator | > 100 distinct, all well-formed |
| the name bank never exhausted its combinations | 0 numbered placeholder names |
| projection round-trips | origin → 34.8072 N 138.4419 E → (0, 0) |

The name-bank check exists because the two-element Japanese toponym space is
only 51 × 50 = 2 550 names, and the city needs more than that: streets past
about 2 350 silently fell back to `Chōme-4825`, and so did every station, POI
and machi named after them. Qualifier prefixes (Kita-, Minami-, Shin-, Ō- …)
took the space past 60 000 names per kind.
