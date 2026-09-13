# Seirin city atlas

`game/vendor/city-map.js` and `game/vendor/city-map.css` add the in-game
**СЭЙРИН · УРБАННЫЙ АТЛАС**. It is opened from the HUD `ГОРОД` button or from
the main menu's `КАРТА ГОРОДА · СЭЙРИН` entry.

## Vector-first pipeline

The map is intentionally not a background image:

1. The canonical setting districts are data in `city-map.js` (Мountain
   settlements, Tsukimachi, Seirin City, Hikari-no-Machi, Midori-Heights,
   Tetsuba and Port).
2. A deterministic seed (`SEIRIN-2032|<district>`) generates building
   footprints, local streets, roof details and solar units from SVG primitives.
3. SVG paths draw the coastline, arterial roads, rail lines, stations, parks,
   district boundaries and points of interest. The map ships with **no raster
   map asset, canvas texture, network request or WebGL dependency**.
4. `2D / ПЛАН` is the planning view. `AXO / 3D` uses the same vector model with
   SVG building side faces and a CSS perspective camera. This keeps the map
   reviewable and portable while leaving a clean path to export the geometry to
   Blender later if the project needs a full navigable scene.

The seed and generation rules are stable so a save, screenshot or future
Blender exporter can refer to the same city layout rather than receiving a new
random city on every boot.

## Soft social/economy signals

The inspector is a read-only observation layer, not a second game economy. For
each district it shows residents, jobs, commerce, cohesion, transit and
pressure. The values derive from canonical district baselines plus the current
VN state:

- route affinity / empathy gives small local cohesion lifts;
- Akatomi alert raises pressure and slightly reduces commerce/transit;
- philosophical depth softens pressure;
- time of day changes night commerce and transit;
- money and inventory provide small economic/footfall signals.

The model never calls `storage()` with a write, never creates a new save field,
and never changes story outcomes. It exists to make the city's human and
logistical consequences legible while the player is reading the route.

## Controls

- **ВСЕ СЛОИ** — normal cartographic presentation.
- **ЭКОНОМИКА** — districts are recoloured by commerce signal.
- **СОЦИУМ** — districts are recoloured by cohesion signal.
- **ДАВЛЕНИЕ** — districts are recoloured by alert/security pressure.
- Click a district, building, station or point of interest to update the
  inspector. The amber `YOU` marker follows the current story location.
- `Escape`, the close button or the scrim closes the atlas.

The implementation remains ES5 and offline-compatible with the rest of the
shipping VN. The map is registered as an ordinary main-menu action and does
not require the story to have started.
