# Seirin — procedural city

A complete generative model of **Seirin**, the city the visual novel is set in:
terrain and hydrology, districts and neighbourhoods, an arterial road network
with bridges, a zoned building stock of ~170 000 buildings, the 22 canonical
locations from the design document, public services sited from demand, a rail
and metro network with station-level ridership, and a demography-and-economy
model that produces the numbers a real municipality publishes.

Total output is **vector geometry**: SVG for the atlas, GeoJSON and CSV for the
data, OBJ/MTL and glTF/GLB for the 3-D model. **No raster image is produced or
consumed anywhere in the pipeline** — every map is paths and text, every 3-D
surface is a triangle mesh with per-vertex colour, so nothing is ever rendered
to a bitmap on the way.

```
city/
  src/seirin/        the generator (16 modules, ~8 000 lines)
  requirements.txt   numpy, scipy, shapely, networkx
  generated/         the built city: atlas/, data/, 3d/     (not in git)
  docs/              method notes
```

## Run it

```bash
cd city
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
PYTHONPATH=src .venv/bin/python -m seirin all          # ~6 minutes
```

That writes three trees under `city/generated/`:

| Directory | What it is |
|---|---|
| `atlas/*.svg` | 25 vector maps: regional setting, city plan (dark and print), zoning, five thematic choropleths, transit diagram, hydrology, night plate, axonometric extrusion, port plan, and one detail sheet per district |
| `data/*.csv`, `*.geojson`, `*.json` | every number behind the maps: 173 663 buildings, 25 266 streets, 111 machi, the OD matrix, the economy, and the whole geometry in WGS84 |
| `3d/*.glb`, `*.obj` + `.mtl`, `import_seirin.py` | the same city as a 3-D model, plus a Blender import script (`import_seirin.py` recreates the materials and scales metres to Blender units) |

Individual stages, when iterating on a map rather than the city:

```bash
PYTHONPATH=src .venv/bin/python -m seirin maps   # atlas only (uses the cache)
PYTHONPATH=src .venv/bin/python -m seirin stats  # tables + printed summary
PYTHONPATH=src .venv/bin/python -m seirin 3d
PYTHONPATH=src .venv/bin/python -m seirin check  # 23 invariant checks on the city
PYTHONPATH=src .venv/bin/python -m seirin all --gazetteer generated/GAZETTEER.md
```

Generating the city takes minutes; every exporter takes seconds. Because they
all need the same world, the CLI caches it (`--cache .cache/world.pkl`,
`--refresh` to rebuild) so a map style can be changed without regenerating a
city. The cache is not part of the deliverable and is not committed.

`seirin check` is worth running after any change to the generator: it asserts
that no building stands in water, that streets cross water only on bridges,
that FAR and coverage never exceed the district plan, that the road network is
one connected system, that travel demand is conserved, that the age structure,
mode split and jobs-per-resident ratios match Japan, and that the road density
is that of a real Japanese city. See `docs/CHECKS.md`.

## How it is built

The generator runs in eight phases, and the order matters — each phase consumes
the ones before it:

1. **Terrain** — a 1 166 × 1 151 height field at 20 m, a bay with a fractal
   shoreline, a coastal plain, terrace, foothills and a ridge to 1 146 m; four
   rivers carved with graded beds and flood plains; dykes, quays, a bathymetry
   field; land/water/shore polygons via marching squares.
2. **Districts** — 16 districts, 12 urban and 4 rural, sub-divided into 111
   *machi* by weighted Voronoi plus Lloyd-relaxed k-means; each machi gets a
   density, a use district, a built era and a character.
3. **Roads** — arterial corridors routed with A\* over a cost surface that
   prices slope and direction change, a warped lattice of local streets per
   machi, bridges where arterials cross water, and a centrality index.
4. **Buildings** — 263 000 parcels by recursive long-axis subdivision of
   blocks, then buildings under the Japanese use-district envelope (FAR, BCR,
   storey caps, shadow limits), with 30 redevelopment sites as the only source
   of towers; quake and fire risk from structure, year and soil.
5. **Landmarks** — the 22 canonical locations placed by hand from the design
   document, then 660 demand-sited public services.
6. **Census** — population, households, age structure, income and land value
   per machi, calibrated to Japanese census ratios.
7. **Services and transit** — POIs sited from the census; four rail/metro
   corridors and a ferry, with stations only where the catchment justifies one.
8. **Travel demand** — a doubly-constrained gravity model of commuting (40 IPF
   iterations), a five-mode split, and ward tables.

Full method, formulas and calibration constants: **`docs/METHOD.md`**.
The generated gazetteer (`--gazetteer`) writes the city up as a reference
document in Russian, for the writers.

## Design decisions worth knowing

* **Nothing is random per-run.** A single seed (`20320401`) feeds a splittable
  RNG whose sub-streams are keyed by phase, so changing the map style, the
  exporter or an unrelated phase cannot move the city.
* **The canon is an input, not an output.** The 22 locations are placed at
  coordinates from the design document; everything else is generated around
  them. `Akatomi Dynamics` is the tallest building because the document says
  so, not because the generator favoured it.
* **Statistics are calibrated, geography is emergent.** Jobs per resident
  (0.561), the 65-and-over share (24.9 %), the modal split and the household
  income distribution are pinned to Japanese figures; *where* the jobs and the
  elderly are is produced by the model.
* **The map is the drawing, not a picture of one.** SVG paths, stroke widths in
  metres, a scale bar, a north arrow, layer names — the sheets are editable
  drawings, which is why they are worth generating in the first place.
