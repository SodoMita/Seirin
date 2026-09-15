# Method

How the Seirin generator works, phase by phase, with the formulas and the
calibration constants. Read this before changing a parameter: most of the
numbers are anchored to a published Japanese figure, and moving one usually
means the invariant checks in `docs/CHECKS.md` will fail.

Everything below is deterministic. The seed is `20320401`; `Rng` splits into
named sub-streams per phase (`rng.sub("roads")`), so a change in the atlas or
in the 3-D exporter cannot move the city and a change in one phase cannot move
the next unless it changes that phase's geometry.

---

## 1. Terrain

The model frame is 23 × 23 km: `X0=−11 000 … X1=+12 000`, `Y0=−8 800 …
Y1=+14 500` metres, +x east, +y north, projected about **34.8072° N,
138.4419° E** with an equirectangular projection (the city is fictional; the
anchor puts it on the Pacific coast of central Honshu, which is what makes the
climate, the landscape and the hydrology of the design document plausible).

* Height field: 1 166 × 1 151 samples at `GRID = 20 m`, built from fractal
  value noise plus three structural terms — a coastal plain, a marine terrace
  and a ridge line to 1 146 m. Elevation runs −255 m (bay floor) to +1 146 m.
* The bay is a 4 350 m radius circle at (2 400, −4 400) with a fractal
  shoreline perturbation of ±26 %; the coast south of it opens onto the ocean.
  There is **no bridge over the bay**: the design document forbids one, and the
  road generator is not allowed to route across open water.
* Rivers: Kamikura-gawa, Nagare-gawa and the Tetsuba canal, plus four creeks.
  Beds are graded, i.e. the carve is a smoothstep blend to bank height rather
  than a hard clamp, with a flood-plain width proportional to discharge.
  Discharges are set between 4 and 46 m³/s.
* Land and water polygons are extracted with marching squares over the flooded
  field (`contour_polygons`), then `land = frame − union(wet cells)`. Contours
  are polygonised from raw segments, never from `linemerge`d rings: merging
  fuses point-touching loops into figure-eights and the polygonisation then
  loses regions.

## 2. Districts and machi

16 districts: 12 urban (`hikari`, `tsukimachi`, `tetsuba`, `port`, `minami`,
`naka`, `higashi`, `nishi`, `minato_kita`, `tenro`, `kamikura`, `shelf4`) and
4 rural. Weights feed a Voronoi partition with exponent 0.72, which is what
gives the urban districts their reach into the valley floors; rural districts
take everything that is left.

Each district is sub-divided into *machi* (町) by Lloyd-relaxed k-means on a
population-weighted point set, k chosen from the district's area and density.
The 111 machi carry the attributes the rest of the pipeline reads: `kind`
(`commercial`, `residential_mid`, `residential_low`, `industrial`, `port`,
`warehouse`, `farmland`, `forest`, `village`, `construction`), a use district
(`zoning`), a median built year and a density.

## 3. Roads

* Arterials are routed with A\* on a cost surface whose cost is
  `length × (1 + slope_weight × slope² + curve_penalty × |Δdirection|)`, with
  `slope_weight = 6.0` for roads and `24.0` / `curve_penalty = 1.8` for rail.
  That single difference is why the metro keeps to the valleys while arterial
  roads climb.
* Local streets come from a lattice warped by the terrain, with per-machi
  spacing: 60–90 m in the commercial core, 110–150 m in residential areas,
  220 m+ in farmland.
* Bridges are found by intersecting *routed* arterials (pre-split at
  junctions) with water ribbons and requiring both banks to be on land, then
  de-duplicated; 39 to 40 bridges over four water bodies.
* The junction graph snaps endpoints within 4 m and then links any remaining
  fragment that comes within 900 m of the main component, so the network is one
  connected system (98 % of junctions in the largest component; the rest are
  legitimately unreachable hill tracks).

Result: 25 265 segments, 1 889 km, of which 100 km arterial and 1 552 km local.
Road density 4.5 km/km² of land — the middle of the range for a Japanese city.

## 4. Buildings

Parcels by recursive long-axis subdivision of blocks, cutting at the long
axis' midpoint until the parcel is below its target size (which depends on the
use district), with rear-setback and frontage constraints.

Buildings are then fitted inside the legal envelope of the parcel:

```
foot_m2 ≤ BCR × parcel_area        BCR: 60 – 80 % by use district
floor_m2 ≤ FAR × parcel_area       FAR: 100 – 800 % by use district
storeys ≤ storey cap               caps: 1 (farmland) … 46 (commercial core)
```

A type model maps (use district, era, density) onto a building type
(house, apart, shop, office, tower, factory, warehouse, plant, tank, barn),
and each type has its own footprint-to-floor relationship, roof shape,
material palette and occupancy. `_fit_area` solves the largest rectangle that
fits inside the (possibly non-convex) parcel analytically, falling back to
bisection.

Towers are the exception: the only buildings above 12 storeys are the **30
redevelopment sites**, scored by
`(land_value/1000)^1.15 × (area/500)^0.55` on parcels of at least 450 m²,
at least 480 m apart, with storeys log-normal(21, 0.40) capped at 46. That is
deliberate — a Japanese regional city does not have towers in the suburbs, and
the generator will not invent them.

Results: 173 662 buildings, 263 429 parcels, 8 602 blocks, 46.2 km² of floor,
mean height 9.8 m, p99 30 m, tallest 131 m (Akatomi HQ), 53 % timber, 36 %
pre-1981.

Earthquake risk = `f(structure, year_code, soil)` where the year codes are the
Japanese seismic standards (1950, 1971, **1981 new seismic standard**, 2000) and
the soil is soft-reclaimed / terrace / rock. Fire risk = structure + density of
neighbouring timber.

## 5. Canon

The 22 locations of the design document are placed at their canonical
coordinates (`landmarks.CANON`) — Akatomi Dynamics HQ, Stardome, Seirin
Station, the Kogare-no-Inu tea house, the archives, Tenro shrine, the Kamikura
spring, the SHelf-4 works, the CSR lab, the shipyard, the port terminal and dry
dock, customs, the hospital, the police HQ, city hall, the studio, the hangar,
the baths, the market, the theatre. Everything else in the city is generated
around them.

## 6. Society

Per machi, from the dwellings the building model produced:

| Quantity | Value | Source of the anchor |
|---|---|---|
| Persons per household | 2.21 | Japan 2020 census |
| Vacancy rate | 13.6 % | Japan 2023 housing survey |
| Share 65+ | 29.1 % (model) / 24.9 % (city) | Japan 2023, aged-urban |
| Average household income | 5.62 M¥ → 6.17 M¥ | Japan 2023 mean |
| Labour participation | 0.784 (15–64), 0.257 (65+) | Japan 2023 |
| Jobs per resident | 0.582 | Japan: jobs / working-age population |

Age structure is a full seven-bracket distribution (0–5 … 65+) with `SHARE_65P`
controlling the ageing tail; income is log-normal per machi with a Gini
consistent with Japan, with an urban-core premium and a rural discount.

The economy is 27 738 firms in 16 sectors (`SECTORS`: manufacturing,
construction, wholesale/retail, transport, information, finance, real estate,
professional, public service, education, health, hospitality, utilities …)
with sector mixes biased by district kind, employment per firm by sector and
size class, turnover per worker, and founded years. Firm revenue per worker is
coefficient-anchored so the city total lands at ~6.6 trillion yen of revenue,
42 % of which is value added (5.0 M¥ per capita — Japan's figure is 5.2).

Jobs are reconciled *before* the economy is built: per-building job weights
(`KIND_JOB_WEIGHT` — an office contributes 1.0, a house 0.012) are scaled so
that the city total hits `0.582 × population`.

## 7. Services and transit

Public services are sited from demand, not by placement:

* convenience store per ~2 400 residents, at street junctions
* primary school per ~420 children (6–14)
* clinic per ~950 residents aged 65+
* shrine per ~5 000 residents, banks and post offices where > 30 shops cluster
* fire stations in industrial and port districts
* 3 universities, 4 ward offices, substations, reservoirs, a treatment works,
  a landfill, cemeteries — at district scale

Transit: four rail/metro corridors plus a bay ferry, with opened dates 1901,
1932, 1954, 1978 and 1961. A station is only built where the catchment
(`pop × 1.05 + jobs × 0.55` within 900 m) reaches 2 200, and the siting first
snaps to the local peak of that demand function; new stations are also pushed
away from existing ones within 2 400 m by a competitor penalty. Station
boarding = `catchment_pop^0.9 × line_factor × interchange_bonus`, which is a
demand model, not an arbitrary number: 35 stations, 301 300 boardings/day.

## 8. Travel demand

Doubly-constrained gravity model over 111 machi, with

* deterrence `f(d) = exp(−0.115 × min)`,
* distance = `1.35 × crow-flies` at 22 km/h plus 6 minutes per trip,
* 40 IPF iterations solving
  `a_i = pop_i / Σ_j b_j·attract_j·f_ij`,
  `b_j = attract_j / Σ_i a_i·pop_i·f_ij`,
  `trips_ij = a_i · f_ij · b_j · attract_j`,
  with attractions `min(jobs_j, pop_j × 2.6)` rescaled so that
  `Σ attract = Σ pop`,
* a final row normalisation so that the matrix accounts for exactly the
  workforce.

Mode split is a per-O-D normalised stack of walk / bicycle / rail / car / bus
weights, where rail availability is the outer product of station accessibility
with a distance ramp, and car is damped toward the centre (parking, congestion).
Result: 68 % car, 11 % rail, 11 % bicycle, 5 % walk, 5 % bus; mean commute
19.1 min / 4.9 km.

A note for the future: the version of this model that scaled the *trip matrix*
by row and column factors diverges instead of converging. The correct form
re-derives the factors from the margins on every iteration, as above.

---

## Output: the atlas

Maps are drawn in metres with `SvgDoc`, so stroke widths are real widths, the
scale bar is exact and the layers are named (`land`, `roads`, `buildings`,
`labels`, `furniture`). Several sheets batch hundreds of thousands of small
polygons into one `<path>` per colour; building outlines are delta-encoded to
tenths of a metre, which is why the city plan is 12 MB instead of 30 MB for the
same drawing.

* 25 sheets: regional setting, city plan (dark and print plate), zoning, five
  thematic choropleths, the transit diagram, hydrology, the night plate, the
  axonometric extrusion, the port, and one detail sheet per urban district.
* Labels are placed by `LabelPlacer`, a deterministic first-fit placer with a
  priority order and per-map candidate offsets, so the same city always
  produces the same sheet and no label overlaps another.
* The transit diagram is a *diagram*: a spring layout pulls stations to even
  spacing, the real geography acts as a weak anchor, and segments are drawn
  octilinearly (horizontal, vertical or 45°) the way every metro map is.

## Output: the 3-D model

`export3d` writes Wavefront OBJ + MTL and a glTF 2.0 GLB (Y-up, per-vertex
colour, one primitive per material) plus `import_seirin.py`, a Blender script
that imports the OBJ, rebuilds the materials and scales metres to Blender
units. Blender is not required to *produce* the model — it is a consumer.

Geometry: terrain as a decimated mesh (`--terrain-step`), quays, bathymetry,
one extruded prism per building (pitched or hipped roofs for houses and barns,
parapets on flat roofs, rooftop plant above 24 m), roads as ribbons with lane
markings, rail with ballast and sleepers, bridges with deck and pylons, the
canon landmarks as shaped masses (an arena is a cylinder, a shrine has a
torii and a hall, the shipyard has gantry cranes).

Meshes are flat typed arrays, not lists of tuples: the full city is 2.3 million
vertices and 3.2 million triangles, which is 0.4 GB as arrays and 3.6 GB as
Python tuples (measured). The GLB is ~73 MB.
