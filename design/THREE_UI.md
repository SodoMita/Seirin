# Holoframe UI — 3D material skin (mockup session)

Proposal skin for `game/`: AI-baked armour textures + three.js plates/shaders,
built as a **separate mockup** first at
[`design/preview/three-ui/`](preview/three-ui/) (see its README for the
technique index). Nothing in `game/` changed in this session. The existing
2.5D CSS skin ([MECHA_UI.md](MECHA_UI.md)) stays the shipping truth until a
migration is approved.

---

## The one-paragraph idea

The DOM keeps every job it is good at — layout, flow, type scale, focus,
tap targets, the responsive ladder, ARIA — and stays fully readable with the
GPU switched off. three.js keeps every job raster is good at — metal, energy,
depth. The bridge is a calibrated camera (1 CSS px == constant world length on
the plate plane) plus a ResizeObserver: each `[data-plate]` box gets a
nine-slice 3D plate **rebuilt at the box's exact pixel size**, never scaled, so
the armour inherits the responsive layout instead of fighting it.

## Decisions worth remembering

| Decision | Why |
|---|---|
| Nine-slice in 3D, not a stretched quad | A single quad with the frame texture is exactly the "болты разъехались" anti-example kept in the lab screen. Corners must never scale. |
| Slice metrics **measured**, not authored | `build-textures.mjs` grows the flat-centre rect and scans the glowing channel arc to find the corner size. Regenerating the plate art re-slices correctly with no hand-tuning. |
| Fractional edge repeat (crop, don't squeeze) | `repeat = innerLen / tileLen`. Rounding to whole tiles would re-introduce stretch of up to one tile; cropping the last tile keeps density exact. |
| One part per texture, no atlas | Mip-level bleed across atlas cells is a seam factory. Four draw calls per plate is cheap; seams are not. |
| Data-URI texture bundle (`tex-data.js`) | `game/` may never `fetch()`, and `file://` images can taint WebGL uploads in some browsers. `data:` URIs are same-origin-clean, fetch-free and double-clickable. Cost: ~190 KB base64 for the whole UI set. |
| three vendored as an **IIFE classic script** | ES modules do not load from `file://`; the repo's whole philosophy is "double-click index.html". r186 bundled with esbuild, MIT header kept. |
| CSS twin (`.hf-css9`) of the GPU plate | The no-WebGL ladder and the lab parity column use the *same* slices via 8 background layers; JS publishes the measured metrics as custom properties so CSS and GPU cannot drift. |
| Px-space UVs in shaders | `vPx / tilePx` makes grain density independent of panel size — the shader-side half of "no stretching". |
| QA is executable | seam/base ratio asserted at build; slice/UV invariants in `node --test`; GLSL parsed (no GPU in CI); the real geometry CPU-rasterised to PNG so the UV mapping is reviewable without a browser. |

## Traps found this session (add to the MECHA_UI table when migrating)

| Trap | Symptom | Rule |
|---|---|---|
| Row/column-variance "flat" detection | Every row of a frame sheet crosses the border, so no row is ever flat; the detector collapsed to one pixel and the slice came out as half the sheet. | Grow a rect from the centre while perimeter pixels match the centre colour. |
| `rotate90cw` puts the outer face at +X | Left/right edges rendered with their dark inner side outboard (visible gap in the first QA ladder). | The left edge reads the rotated strip mirrored, the right edge straight; asserted in the sampler and in the CPU raster. |
| Nine-slice minimum | A box shorter than `2×corner` makes corner bands overlap and the frame pinches into a hexagon. | `buildPlate` throws below the minimum; the runtime **switches variant** (plate→chip→btn) and falls back to a flat machined frame below `btn`. Never scale corners. |
| Coplanar overlapping plates | Nested/overlapping `[data-plate]` boxes at the same z z-fight (speaker over console, chips inside the title plate). | Plate z = DOM nesting depth × 10 px + optional `data-plate-z`. |
| Adjacent-pixel seam metric | Absolute wrap-delta thresholds fail even perfect tiles on grainy metal (grain itself is ~0.02). | Compare seam delta to interior adjacent-pixel delta; ratio ≈ 1 means no seam. |
| `NODE_PATH` does not work for ESM | Dev tools importing `sharp` failed outside a `node_modules` walk. | Install with `npm i --prefix <tool dir> --no-save`, like `game/` does with jsdom. |

## Verification performed

```
build-textures.mjs   tile metal  seam/base 1.213 -> 1.014  OK   (hazard 3.882 -> 1.147)
                     frame plate sheet=410 border=74 corner=84  (chip 40, btn 20)
plates.test.mjs      8/8   corners exact, mirroring exact, density exact, min-size throws
shaders.test.mjs     19/19 every GLSL ES source parses; px-space + cover assertions
offline-smoke.mjs    14/14 boot, no-WebGL ladder, router, metrics, sliders (jsdom)
render-plate.mjs     CPU raster of the shipped geometry+UVs -> tex/qa/geometry_render_*.png
```

No headless browser exists in this sandbox (Chromium/Playwright downloads are
off the network allowlist), so the live WebGL frame is reviewed in the Arena
preview / a local browser; the CPU raster plus the parse gate cover the parts a
black screen would hide.

## Path to shipping into `game/` (proposal, not started)

1. **Keep the invariants.** `game/` ships ES5, zero-dep, no fetch. The mockup's
   `plates.js` math is already ES5-shaped and dependency-free; `shaders.js`
   too. `scene.js`/`textures.js` need an ES5 pass or a small build step that
   concatenates + transpiles into one `vendor/holo-ui.js`.
2. **Vendor three once**, as the same IIFE bundle (~725 KB). That is the only
   new binary-weight decision and it needs a human yes: it is 3× `mecha-ui.js`
   but less than the already-vendored `monogatari.js`.
3. **Migrate in slices, like mecha-ui did.** First: plate geometry + frame
   materials behind `[data-mech]` hosts, CSS skin still on top (kill switch via
   one attribute). Second: environment layer behind the game screen only.
   Third: widgets (dial, radar). The mecha skin's traps table still applies —
   especially `clip-path` clipping descendants and animate.css's 1 s
   `.animated` override.
4. **Texture budget.** The whole baked set is ~190 KB base64. If that is too
   rich for a target platform, drop `trace` and centre grain first (both have
   procedural fallbacks in the shader).
5. **Tests to carry over:** `plates.test.mjs` and `shaders.test.mjs` as-is;
   extend `game/tests/offline-smoke.mjs` with the no-WebGL ladder assertions.

## Open questions for the next session

- Should the dialogue console keep a photo-real centre (AI albedo) or the
  current procedural one? Procedural wins on weight and on alert-state recolour.
- Route atlas and archives codex are not mocked yet; both are scroll-heavy and
  will need the plate rebuild throttled (currently per-RO-callback).
- Decide whether `tex/qa/` stays tracked (evidence, ~2 MB) or moves to
  `design/preview/shots/` JPEG policy.
