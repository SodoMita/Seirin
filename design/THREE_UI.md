# three-ui — AI plates + three.js 3D parts + GLSL shaders over a CSS skeleton

**Status:** dev-only prototype (session 11, 2026-09-13). Lives entirely in
`design/preview/`; **nothing here is referenced by `game/`** and the shipping
game's invariants (no CDN, no fetch, zero deps, ES5 vendor code) are untouched
— verified: `node --test game/tests/…` = 65/65, `es5-scan` clean, `game.js`
still 909 lines.

Open it by double-clicking `design/preview/three-ui-demo.html`. Add `?nowebgl`
to review the CSS fallback ladder.

| File | Role |
|---|---|
| `three-ui-demo.html` | markup: four screens (title, game, settings, save) + diagnostics |
| `three-ui.css` | all layout, all surfaces, responsive ladder, fallbacks |
| `three-ui.js` | the 3D layer: two WebGL renderers, anchor system, GLSL |
| `three-ui-demo.js` | demo wiring that stands in for the engine (dialogue, alert, screens) |
| `vendor/three.min.js` | three r149 UMD, MIT — **dev-only**, see `vendor/THREE-LICENSE.txt` |
| `assets/ui/*.webp` | the AI-generated plate set (prompts: `assets/ui/prompts/ui-plates-01.md`) |
| `tools/shot-three-ui.mjs` | headless-Chromium verification harness (errors, hit-tests, fps, shots) |

---

## The contract: CSS owns layout, WebGL reads it

Every 3D part is anchored to a **live DOM rect** (`getBoundingClientRect` +
`ResizeObserver`), re-measured on the render loop's dirty tick — never per
frame, never on a timer. The orthographic cameras are in **CSS-pixel space**
(1 world unit = 1 px, origin at viewport centre), so `rect → world` is two
subtractions and stays crisp at any DPR, zoom or font scale. Media queries,
`clamp()`, wrapping and safe-area insets move the 3D parts for free: the
instruments followed the HUD through 1440×900 → 390×844 → 880×400 with zero
special-casing in JS.

### Two canvases, because the DOM must sit *between* them

| Layer | z | Contents |
|---|---|---|
| `#ui3d-bg` | 0 | shader background field (deck grid, fog, resonance pulses, alarm wash, scanlines, grain), dust motes |
| DOM `.stage` | 10 | the AI plates, the art, all text, all hit targets |
| `#ui3d-fg` | 40 | instruments (270° segmented gauge arcs, radar), key rims, instanced corner brackets, emblem holo-rings, title reactor |

The fg canvas is `pointer-events: none` and its geometry only ever occupies
rims, wells and corners — DOM text underneath stays crisp, selectable and
clickable (hit-tested at every viewport: 9/9 keys resolve through
`elementFromPoint` on all three).

### What is AI image, what is shader, what is CSS

- **AI plates (CSS layer):** armour surface on every panel, console band,
  instrument face plate, title key visual, wear sheet and emblem/reactor as
  `mix-blend-mode: screen` (the generator has no alpha; black is our
  transparency), key caps as a measured `border-image` 9-slice.
- **Shaders (WebGL):** background field, plasma core + ring rig, gauge arcs,
  radar sweep with afterglow contacts, rounded-rect SDF key rims with
  pointer-tracked specular, machined instanced brackets, holo rings.
- **CSS:** layout, type ladder (`clamp()`), chamfers, escalation tiers
  (`html[data-alert-tier]`), reduced-motion, focus rings, no-WebGL stand-ins.

One number drives both worlds: the alert slider writes
`data-alert-tier` (CSS accent) and `SeirinThreeUI.setAlert()` (GLSL tint).
The 65% screenshot shows gauge arcs, radar, LEDs, badge, caret and key rims
all red from that single write.

---

## Traps found by measurement (add to the house table)

| Trap | Symptom | Rule |
|---|---|---|
| **`filter`/`transform` on a blending element isolates `mix-blend-mode`** (Chromium 131) | the emblem's black plate came back as a rotated diamond; with `filter:none; animation:none` the same markup blended perfectly | put the glow on a pseudo-element and the motion on the 3D rings; the blending element itself stays bare |
| **ancestors with `z-index` isolate blending too** | same diamond, first attempt | the blend target (the art) must share a stacking context with the blending element; `.title-head` has `position` but no `z-index` |
| **`border-image` slice regions start at the image edge** | keys wore a black foam frame: the slice included the plate's black screen-blend surround | crop the surround at ingest (`convert -crop 631x648+382+50`), then slice inside the bevel |
| **9-slice corners squash when border widths differ per axis** | corner patches (square in source) rendered as smeared ellipses: `border-image-width` was `clamp(…) clamp(…)` | one UNIFORM `border-image-width` (`--key-b`) with a square source slice (`64 fill`): corners scale uniformly, edges stretch along their own axis only — the corner/edge/middle split the technique demands |
| **stale instance matrices** | brackets from hidden screens kept drawing at their last rects | a hidden panel collapses its four instances to scale 0 every measure |
| **measure must run on the dirty tick** | after a screen switch the gauges stayed `visible:false` and a title ring floated over the console | `ResizeObserver`/`show()` only set `dirty`; the loop owns `measure()` |
| **opaque DOM art hides the bg canvas** | the reactor was invisible behind the key visual | the reactor renders in the **fg** scene; art opacity ≤ 0.9 lets the field breathe at the edges |
| **a fixed dev overlay eats taps** | at 390px the diagnostics panel intercepted the menu | collapse it under 760px wide / 520px high, toggle in its place |

---

## Performance budget (measured, headless SwiftShader — a real GPU is far ahead)

| Viewport | fps | draw calls (bg+fg) | triangles |
|---|---|---|---|
| 1440×900 | 19–20 | 2 + 11 (game) / 2 + 11 (title) | ~7.0k |
| 390×844 | 26–32 | same | same |
| 880×400 | 27–28 | same | same |

DPR capped at 2; loop idles on `document.hidden`; `prefers-reduced-motion`
switches the loop to render-on-demand (state changes and re-measures) while
the material design survives; `webglcontextlost` lands on `html.no-webgl`.
Brackets are one `InstancedMesh` (24 instances, 1 draw call). Zero console
errors and zero network requests in every run, including `?nowebgl`.

---

## Why no AI textures inside WebGL

Over `file://` Chromium taints locally loaded images; `texImage2D` from a
tainted source throws `SecurityError`, so a double-clicked page cannot put
the plates into a texture. Everything in WebGL is therefore procedural, and
the plates live in the CSS layer where they are also accessible, cacheable
and free to be responsive. (If the prototype is ever served over http, a
`TextureLoader` bridge can be added without touching the anchor system.)

---

## Session 12 — bevels out, layout recomposed (2026-09-14)

User review: *remove the CSS bevels; the layout was as bad as before.* Both
taken literally:

- **No CSS bevels anywhere.** Every `clip-path` chamfer and painted bevel
  gradient is gone: panels, badges, console nameplate, diagnostics, slider
  thumbs are clean rectangles with a hairline `--line` border. The only
  machined edge left is the one inside the AI plate, applied as a true
  9-slice (`64 fill` / uniform `--key-b`).
- **Layout recomposed, not tweaked.** One shared content measure
  (`--measure: 1160px`) for console, system screens and footer bars; title
  menu is a single vertical column (no wrapped key rows); the HUD is two
  designed rows — identity / instruments / status, then a status strip — with
  the bay dropping to its own full-width row below 1280px (measured: row 1
  needs ~1205px); choices are one centred column above a centred console so
  the scene stays visible beside it; system cards stretch and pin their notes
  to the card bottom so the middle is assigned, not empty; save cartridges
  grow their shot area instead of leaving a hole.

Re-verified after the recomposition: ALL CLEAN (0 console errors, 0 network,
9/9 keys hit-testable at 1440×900 / 390×844 / 880×400), shots refreshed in
`shots/11_*`.

## Port plan into `game/` (not started, by decision)

1. **Keep the contract, drop the dependency.** `game/` ships zero deps and
   ES5: either hand-roll the same two-canvas layer in raw WebGL2 (~30 KB, the
   shaders port verbatim) or take an explicit decision to vendor three there
   and update `AGENTS.md` first.
2. **Plates:** copy the approved webps to `game/assets/ui/`; they are already
   alpha-free by construction (screen-blend / 9-slice), so the matting
   pipeline is not needed.
3. **State:** replace `SeirinThreeUI.setAlert` with a read-only subscription
   to `engine.storage()` exactly like `mecha-ui.js`'s 180 ms tick — the 3D
   layer must stay read-only w.r.t. game state.
4. **Fallback:** `html.no-webgl` ladder ports as-is; `mecha-ui.css` remains
   the no-WebGL skin until the ladder is proven on a real phone.
5. **Tests:** extend `offline-smoke.mjs` expectations only if `game/` gains
   files; the harness in `tools/shot-three-ui.mjs` is the model for a
   visual-regression probe.

---

## Screenshot index (`shots/11_*`, JPEG per house rule)

| File | Shows |
|---|---|
| `11_three_ui_title_{desktop,phone,phone_land}` | key visual + wordmark, blended emblem with 3D holo-rings, plasma reactor over the mecha, 9-sliced keys |
| `11_three_ui_game_{desktop,phone,phone_land}` | HUD with live 3D gauges/radar, sprite, console band, quick menu; phone drops the radar per ladder |
| `11_three_ui_choices_desktop` | choice plates with rims |
| `11_three_ui_alarm_{desktop,phone,phone_land}` | 65% escalation: every surface and shader goes red from one write |
| `11_three_ui_settings_desktop` | shader field + brackets + machined sliders on a system screen |
| `11_three_ui_save_desktop` | data cartridges over the field |
| `11_three_ui_nowebgl_desktop` | `?nowebgl`: CSS conic gauges, conic radar, plates intact |
