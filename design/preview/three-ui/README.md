# Seirin «Holoframe» — UI mockup (AI textures + three.js + shaders)

**DEV-ONLY harness.** Like `design/preview/mecha-ui-preview.html`, the shipping
game never loads this file. It is a standalone proposal for replacing the flat /
2.5D-CSS mecha skin with real 3D material: AI-baked armour textures, nine-slice
3D plates, shader surfaces and runtime procedural textures — while HTML/CSS
keeps everything it is genuinely better at (layout, flow, type scale, focus,
responsive ladder, accessibility).

## Run it

```bash
# double-click works: all scripts are classic tags, every texture is an inlined
# data URI, so file:// has nothing to fetch and nothing to taint.
open index.html

# or serve the REPO ROOT (the mockup references game/assets + backgrounds by
# relative path for its scene photos); serve.py also redirects / to the mockup:
python3 design/preview/three-ui/serve.py 8124
#   -> http://localhost:8124/  (302 -> /design/preview/three-ui/index.html)
```

Screens: **ТИТУЛ · ДИАЛОГ · НАСТРОЙКИ · ПАМЯТЬ · МАТЕРИАЛЫ** (top-right nav).
The last one is the proof bench: GPU plate vs pure-CSS plate vs a deliberately
stretched anti-example, the seamless tile wall, and the texture manifest.

## Layer contract

| Layer | Owns | Never does |
|---|---|---|
| `.hf-stage` (CSS) | night scene photo, `background-size: cover` (browser-native aspect-correct fit), vignette | stretch, fetch |
| `#hf-canvas` (three.js) | environment shaders, 3D nine-slice plates anchored to DOM rects, holo radar/photo, motes, shards | layout, text, input |
| `.hf-ui` (HTML/CSS) | boxes, flow, type, focus rings, tap targets, responsive ladder, ARIA | raster material |

Armour **follows** the DOM: each `[data-plate]` element keeps its normal box; a
plate mesh is anchored to `getBoundingClientRect()` and **rebuilt, not scaled**,
whenever the box changes (ResizeObserver + resize). The camera is calibrated so
1 CSS px == a constant world length on the plate plane, which is what makes
"rect → mesh" exact at every viewport.

## Why there are no seams and no stretching

1. **Seamless tiles.** AI art is never periodic. `design/tools/three-ui/build-textures.mjs`
   offset-crossfades each tile until the wrap seam is statistically
   indistinguishable from ordinary grain (`seam/base ≈ 1`, printed at build and
   asserted), and renders a 2×2 QA sheet (`tex/qa/seam_*.png`).
2. **Measured nine-slice.** The frame plate is auto-sliced (flat-centre region
   grow + glowing-channel arc scan) into corner / edge / centre at three UI
   scales (`plate`, `chip`, `btn`). Corners are **never scaled and never
   repeated**; edges repeat only along their own axis by
   `innerLength / tileLength` (fractional → the last tile is *cropped*, never
   squeezed); the centre carries no image at all.
3. **Constant texel density.** Plate geometry is built in CSS px; tiling maps
   are sampled in **px space** (`vPx / tilePx`), so a 200 px and a 1200 px panel
   show identical grain. Box shards get `retileBoxUVs()` for the same guarantee
   on 3D volumes.
4. **Wrap modes per part.** `RepeatWrapping` only on parts the builder made
   periodic; `ClampToEdge` on corners (wrapping a corner would pull its opposite
   side into the filtered border texels). One part per texture → no atlas bleed
   at any mip level; anisotropy ≤ 8.
5. **Aspect-correct photos.** CSS `cover` for the stage and save thumbnails;
   `hfCoverUV()` (the same maths) for the shader hologram card.
6. **Runtime procedural textures.** Animated material (energy rim, scanlines,
   grid floor, radar sweep, motes, fresnel core) is computed in GLSL; canvas
   bakes only what raster beats shaders at — dial tick rings with numerals,
   cartridge labels, plate grain (mirror-padded so `Repeat` cannot show a clamp
   seam). Deterministic PRNG → identical art every run.

## Files

| Path | Role |
|---|---|
| `index.html` | semantic markup for all five screens |
| `css/tokens.css` · `layout.css` · `components.css` | tokens + layer contract + components; `.hf-css9` is the pure-CSS nine-slice twin of the GPU plate |
| `js/plates.js` | nine-slice geometry builder (UMD: pure, unit-tested in Node) |
| `js/shaders.js` | GLSL library + material factories |
| `js/textures.js` | texture service: baked data-URI parts + runtime canvas bakes |
| `js/scene.js` | renderer, camera calibration, DOM anchoring, render loop |
| `js/ui.js` | screen router, dial/sliders, publishes slice metrics to CSS |
| `js/tex-data.js` | **generated**: data-URI bundle + measured manifest |
| `vendor/three.iife.min.js` | three r186 (MIT) bundled as a classic-script IIFE so `file://` works |
| `tex/src/` | AI-generated source art |
| `tex/qa/` | seam sheets, nine-slice ladders, CPU render of the real geometry |
| `tests/` | `plates.test.mjs` (slice/UV invariants), `shaders.test.mjs` (GLSL parse), `offline-smoke.mjs` (jsdom boot + no-WebGL ladder), `render-plate.mjs` (CPU raster of geometry UVs) |

## Verify

```bash
cd design/preview/three-ui
npm i sharp jsdom @shaderfrog/glsl-parser --prefix . --no-save --silent   # dev-only
node --test tests/plates.test.mjs tests/shaders.test.mjs     # 27 assertions
node tests/render-plate.mjs                                  # tex/qa/geometry_render_*.png
node tests/offline-smoke.mjs                                 # SMOKE PASSED
node ../../tools/three-ui/build-textures.mjs                 # rebuild textures + QA
```

## Degradation ladder

No WebGL → `html.no-webgl`: every `[data-plate]` is repainted by the **same**
slices in pure CSS (`.hf-css9`, variant chosen per box size), boxes below the
smallest nine-slice minimum get a machined flat frame, and a notice explains
it. `prefers-reduced-motion` freezes shader time and pointer tilt while keeping
the full material.

## Path to shipping (not done here)

See [`design/THREE_UI.md`](../../THREE_UI.md): vendoring strategy for `game/`
(classic-script three, data-URI textures to survive `file://` + the no-fetch
invariant), the ES5 constraint, and which pieces migrate first.
