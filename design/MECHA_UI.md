# Mecha UI — 2.5D skeuomorphic armour skin

A visual layer for `game/` that reskins the Monogatari VN as a piece of
battle-machinery: shaded metal plates, decorative wear ("bruises"), live
indicators, and animated illumination.

Ships as exactly two new files, both loaded last so they win the cascade:

| File | Role |
|---|---|
| `game/vendor/mecha-ui.css` | all paint: bevels, chamfers, indicators, keyframes, responsive ladder |
| `game/vendor/mecha-ui.js` | bakes textures, injects layer markup, drives indicators from game state |

Nothing else in the game changed except four `<link>`/`<script>` lines in
`game/index.html`. The previous flat reskin in `vendor/custom-ui.css` is left
untouched on purpose — it carries geometry regression pins (panel positions,
the sprite world-scale table, mobile breakpoints) that this layer repaints
rather than replaces.

---

## The plate model

A real armour panel is a stack, not a rectangle. Every themed element gets
`data-mech="<kind>"` and up to five empty `<i class="mech-l">` children.
Painting order, bottom to top:

| Layer | What it draws |
|---|---|
| host background | the **rim** — bright machined edge |
| `.mech-l-face` | inset face: two-light bevel + brushed steel |
| `.mech-l-wear` | **the bruises**: scratches, dents, paint chips, rust, grease, stencilled serial |
| `.mech-l-gloss` | moving specular sweep + pointer-tracked highlight |
| `.mech-l-rivets` | bolt rows, top and bottom |
| `.mech-l-edge` | running edge light / status glow |
| real text | always on top, always readable |

Layers sit at `z-index: -1` inside a stacking context created by the host
(`isolation: isolate`). That is what lets them paint above the host's
background but below a bare text node — choice buttons have no element
wrapping their label, so a positive z-index would bury the text.

Five plate kinds tune the chamfer and depth: `dash` (top HUD), `console`
(dialogue), `plate` (menu + choice buttons), `chip` (small buttons),
`housing` (modals).

### Why the depth is built the way it is

`clip-path` kills `box-shadow`, so shadows are `filter: drop-shadow()` applied
after the clip — they follow the 45° cuts instead of boxing them. The rim is
not a border; it is the host's own background revealed by insetting the face
by `--mech-rim`.

---

## Textures: baked, not committed

`mecha-ui.js` draws the metal grain and three "bruise" sheets on an offscreen
`<canvas>` at boot and publishes them as `--mech-tex-*` custom properties
holding PNG data URIs.

* No binary asset is added to Git, and nothing is ever fetched.
* A deterministic PRNG (mulberry32) means the wear is *identical on every
  run* — stable art, reproducible screenshots.
* Every use is `var(--mech-tex-x, <css fallback>)`, so a browser without
  canvas still renders a plausible surface.
* Each plate picks one of three sheets and its own stencil serial from a hash
  of its identity, so no two plates on screen wear the same damage, and a
  given plate always looks the same.

The damage vocabulary — scratch, dent, chip, rust bloom, grease — is drawn
with a dark cut plus a light lip one pixel offset. That two-light rule is what
makes damage read as *carved into* metal rather than printed on it.

---

## Animation

| Motion | Where |
|---|---|
| `mechSpecular` | light bar crossing each plate, phase-offset per element |
| `mechEdgeRun` | running light chasing the lit edge |
| `mechPulse` / `mechStrobe` | LED heartbeat; strobe at critical alert |
| `mechGaugeLive` | segmented gauge breathing while data is live |
| `mechRadar` | conic radar sweep |
| `mechChevron` | hazard chevron drift on armed surfaces |
| `mechTicker` | telemetry strip marquee |
| `mechPowerUp` | plates energise from their lit edge on mount |
| `mechAmbientLight` | slow key light drifting across the chrome |
| `mechBeacon` / `mechAlarmWash` | rotating red emergency cone |
| `mechBootWipe` | one diagnostic wipe at start-up |

**2.5D**: pointer position is written to `--mech-mx/--mech-my` (−1..1); plates
take a small perspective rotation and the specular highlight slides the
opposite way, so the metal reads as a tilted physical surface.

---

## Live indicators

The HUD grows an instrument bay driven read-only from `engine.storage()`:

* **LEDs** RDY / ACT / ALR — ACT lights once a route commits, ALR strobes at critical.
* **Gauges** RES (resonance coupling, from affinity + philosophical depth),
  PWR (rig readiness), HEAT (`akatomi_alert` — the real danger number).
* **Radar disc** and a scrolling **telemetry strip** of in-world chatter.

Three illumination states escalate with `akatomi_alert`:

| Alert | State | Effect |
|---|---|---|
| 0–14 | nominal | cyan edge lights |
| 15–39 | `html.mech-caution` | amber wash on the dashboard |
| 40+ | `html.mech-alarm` | red edges, strobing LED, rotating beacon cone |

---

## Guarantees

* **Offline purity** — no fetch, no CDN, no external asset. Smoke test passes.
* **Read-only** — the skin never mutates game state; all writes still go
  through `FailSafe.vn`.
* **Never throws** — every entry point is wrapped; if canvas, MutationObserver
  or the engine is missing it degrades to plain CSS.
* **ES5** — passes the repo's `es5-scan` (no arrow functions, `let/const`,
  template literals, classes).
* **Self-healing** — a `MutationObserver` skins late-rendered engine markup
  (choice buttons, save slots), and re-skins any plate whose layers were wiped
  by an `innerHTML` re-render.
* **Accessible** — injected nodes are `aria-hidden`; text contrast measured at
  **12.9–15.2:1** (WCAG AAA is 7:1); `prefers-reduced-motion` stops all motion
  while keeping the full material design.
* **Responsive** — verified clean with no clipped read-outs at 360, 420, 560,
  700, 820, 960, 1100, 1280, 1440, 1600 and 1920px.

### Degradation ladder

The dashboard is a fixed-height octagon that must not wrap, so as width runs
out it *drops decoration in priority order* rather than squeezing read-outs:
serial plate → radar → gauge digits → whole instrument bay → button labels →
two-row wrap. A truncated alert level would be a lie, so numeric read-outs are
never allowed to shrink below their own text.

---

## Reviewing changes

`design/preview/mecha-ui-preview.html` is a dev-only harness: it loads the real
CSS against hand-written markup mirroring what the engine emits, so the skin
can be reviewed without booting the VN. Double-click it. The game never loads
this file.

`game/tests/mecha-ui.probe.mjs` boots the real `index.html` in jsdom and reports
what got built (plates mounted, layers, serials, gauge response to alert level,
late-mount coverage). Run it with `node tests/mecha-ui.probe.mjs`.

Reference screenshots of every state live in `design/preview/shots/`, and the
art-direction boards this skin was built against are in `design/concepts/`.

---

## Screenshot index (`design/preview/shots/`)

| File | Shows |
|---|---|
| `game_menu.jpg` / `game_menu_hover.jpg` | title screen; hover arms the hazard chevrons |
| `game_dialogue.jpg` | cockpit console with speaker plate |
| `game_choices.jpg` / `game_choices_hover.jpg` | numbered choice plates, rest and hover |
| `game_alarm.jpg` / `z_hud_alarm.jpg` / `z_alert_65.jpg` | critical-alert illumination |
| `game_mobile.jpg` | 390px phone layout |
| `game_reduced_motion.jpg` | `prefers-reduced-motion` — full material, zero motion |
| `z_textbox.jpg` / `z_hover.jpg` | close-ups of console and hovered plate |

Concept boards in `design/concepts/` (generated as art direction, then used as
the build checklist):

| File | Shows |
|---|---|
| `01_annotated_critique_board.jpg` | annotated critique: bevels, rivet rows, scratch layer, contrast |
| `02_material_study.jpg` | six armour materials incl. "scuffed paint + bruises" |
| `03_motion_spec.jpg` | motion vocabulary and timings |
| `04_hud_detail.jpg` | HUD widget anatomy: bolt shadows, segment gaps, LED bloom |

---

# Session 2 — recovery + system-screen coverage

## The data-loss incident (read this before any future merge)

Merge `904fa18` resolved conflicts by taking main's stale side wholesale and
silently destroyed **1,292 lines**:

| File | Before | After |
|---|---|---|
| `game/vendor/game.js` | 965 | 170 |
| `game/tests/game.test.mjs` | 331 | 49 |
| `game/tests/offline-smoke.mjs` | 270 | 94 |

Gone with them: all 17 story labels, the route atlas, the archives codex,
`LABEL_TITLES`, the boot watchdog. `index.html` still shipped the modal markup,
so Archives and the atlas were dead UI pointing at deleted handlers. The
long-standing `labels is not defined` unit failure was the same merge
truncating a test mid-file.

Recovered verbatim from `aba98eb`. **Unit suite went 37/1 → 61/61.**

**Lesson:** after any merge touching `game/`, run
`wc -l game/vendor/game.js` (expect ~965+) and `npm test` (expect 61) before
committing. A merge that *deletes* 1,292 lines while reporting success is the
failure mode to watch for.

## What this session added

| Area | Before | After |
|---|---|---|
| Settings | white text on near-black, default blue-circle sliders | bolted panels, machined tracks, hex knurled knobs, visible fill |
| Quick menu / Quit | unstyled engine chrome, English | bolted rail, Russian, Quit in danger red |
| Icons | Font Awesome / Unicode shim (tofu, emoji, stray "х") | custom CSS-mask vectors everywhere |
| 8-way fork | 4 of 8 options visible, no indication | amber "ЕЩЁ n ▼" counter, reserved space, machined scrollbar |
| Dialogue field | static | breathing sprites, Ken Burns, pulsing speaker, motes, caret |
| Engine strings | English | Russian |

## Traps worth remembering

- **Font Awesome rewrites `<i class="fas">` into `<svg class="svg-inline--fa">`**,
  so rules keyed on `.fas` stop matching once FA runs. `retagIcons()` re-tags
  each replacement. The injected span must *not* carry `fas` — `monogatari.css`
  has `.fas`-scoped rules that force it to `display:none`.
- **WebKit slider tracks ignore `border` and clip the thumb with `clip-path`.**
  Draw the channel with background layers only.
- **WebKit has no `::-moz-range-progress`.** The fill must be a background
  gradient sized from JS.
- **`cssRules` is unreadable over `file://`** — a probe reporting "0 rules" is a
  CORS false negative, not a CSS error.
- **The route atlas is a main-menu entry, never a HUD button** — `game.test.mjs`
  asserts `index.html` contains no `id="btn-graph"`.
- Sprite motion uses `translate:`, never `transform:` (the engine owns
  transform for left/center/right anchoring), and Ken Burns must be scoped to
  the background element or it silently overrides sprite breathing.
