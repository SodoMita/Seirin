# Seirin — Aurora glass UI

The shipping skin of `game/` since 2026-09-19. It replaces the 2.5D "mecha"
armour skin (history: [`archive/MECHA_UI.md`](archive/MECHA_UI.md)). The
visual source of truth was a static mockup (`visual-novel-interface-mockup`,
one self-contained `index.html`); this document records how that mockup was
mapped onto the Monogatari engine, the contracts other code may rely on, and
the engine traps met on the way.

Nothing in the skin talks to the network: no CDN, no web fonts beyond the
already-vendored `assets/fonts/`, no `fetch()`. All shipped JS is ES5
(`node game/tests/es5-scan.mjs game/vendor/aurora-ui.js` must print nothing).

## Architecture

```
game/index.html
├── vendor/monogatari.{js,css}    engine + animate.css (vendored, do not edit)
├── vendor/failsafe.js            all story-state mutation goes through FailSafe.vn
├── vendor/icons-offline.{js,css} Font-Awesome-class → local glyph shim
├── vendor/custom-ui.css          engine geometry / atlas layout pins only
├── vendor/game.js                story, HUD text, archives codex, route atlas
├── vendor/aurora-ui.css          THE SKIN — loaded last, wins the cascade
└── vendor/aurora-ui.js           presentation driver (prefs, icons, menu, states)
```

`index.html` is a "shell" around the engine container (`<div id="vn-root">`,
never `id="monogatari"`):

| Region | Element | Content |
|---|---|---|
| Header | `#shell-header` (fixed, z 70) | location + route (`#hud-location`, `#hud-route`), resources (`#hud-money`, `#hud-items`, `#hud-alert-level` → open the archives), actions (`#btn-skip`, `#btn-archives`, `#btn-mute`, `#btn-menu`), DSEG7 clock (`#hud-time`, `#hud-date`) |
| Stage | `#vn-root > visual-novel` | untouched engine skeleton (screens, `text-box`, `quick-menu`, modals) |
| Footer rail | `#shell-footer` (fixed, z 60) | `#hud-player-name`, the engine's `quick-menu` (re-positioned into the middle column, z 61), `#hud-status` |
| Overlays | `#game-menu-overlay`, `#archives-overlay`, `#graph-overlay` | in-game menu (`data-menu="…"` buttons), codex, debug route atlas |

The inline `<svg><symbol id="i-…">` sprite at the top of `index.html` is the
only icon source. `aurora-ui.js` decorates engine buttons with `<use>` clones
(`.aurora-ico`) and hides the Font Awesome `<svg class="svg-inline--fa">`
that the engine injects.

## Contracts (safe to depend on)

Preferences (localStorage):

| Key | Range / values | Applied as |
|---|---|---|
| `SeirinGame_Theme` | `aurora` (default) `tidal` `dusk` `amber` `gray` | `html[data-aurora-theme]` → `--accent-rgb`, `--surface-rgb` |
| `SeirinGame_GlassTransparency` | 0–100 (default 95) | `--density` = 1 − pct/100 |
| `SeirinGame_TextScale` | 70–160 % (default 100) | `--reading-scale` (dialogue only) |
| `SeirinGame_UIScale` | 35–230 % (default 100) | `html { font-size }` — every `rem` in the shell follows |
| `SeirinGame_Muted`, `SeirinGame_MutedVolumes` | `1` / saved volumes | mute toggle restores the engine `Volume` preference |

State classes on `<html>`: `aurora-playing` (game screen active),
`aurora-screen` (an engine screen other than main/game is open),
`aurora-hidden` (distraction-free), `aurora-modal-open` (dialog log, alert,
codex, atlas or game menu up — decorative motion should pause).

Buttons: `.aurora-decorated` = icon already injected; `is-on` /
`aria-pressed="true"` = toggle engaged (auto-play, skip, hide-UI, mute).

`window.AuroraUI` exposes `setTheme(id)`, `setGlass(pct)`, `setTextSize(pct)`,
`setScale(pct)`, `setMuted(bool)`, `openMenu()`, `closeMenu()`, `refresh()`,
`prefs()` and the `themes` table; everything else is private. `aurora-ui.js` never writes story state — the only engine calls
are read-only getters, `showScreen`/`runListener`, `rollback` (same path as
the Back button) and `preference('Volume')`.

Text is Russian throughout; the mockup's English strings were preview copy.
Engine strings that had no Russian entry (help screen, quick-menu titles,
slot deletion prompts, loading) were added to the `engine.translation`
block in `game.js`.

## How the mockup maps onto engine markup

| Mockup | Engine element | Note |
|---|---|---|
| Title panel + menu list | `main-screen > .aurora-title + main-menu` | `.aurora-title` is static markup in `index.html`, so CSS owns its placement and animation; the engine still owns the button list |
| Dialogue glass (name tab, text) | `text-box > [data-content=name]`, `[data-content=text]` | text-box is repositioned to sit on the footer rail; text is outlined (4-way shadow + `-webkit-text-stroke`) because the glass is 95 % transparent by default |
| Quick actions rail | `quick-menu` | moved into `#shell-footer`'s middle column; icons via sprite |
| Choice panel | `choice-container` | fixed, centred, z 100; `::before/::after` supply the "Развилка / Ваш ответ" heading |
| Settings panel | `settings-screen` | `.aurora-appearance` fieldset (theme picker, glass, text size, UI scale) is injected before the engine's audio/speed blocks |
| Save/Load | `save-screen`, `load-screen`, `slot-container`, `save-slot` | slots become a 3-column grid; save-screen has no engine `<h2>`, so the heading is `save-screen::before/::after` |
| Help | `help-screen [data-content=help]` | engine markup is nested `.row` grids; flattened into key rows |
| Dialog log | `dialog-log .modal__content` | rows tagged `[data-spoke]`; clicking a row rewinds to it |
| Confirm / quit | `alert-modal` | `.modal` z-index raised to 120 (above choices) |
| Game menu | `#game-menu-overlay` (ours) | build stamp from `window.SeirinBoot.BUILD` in the footer |
| Route atlas (debug) | `#graph-overlay` (ours) | generated from `engine.script()`; see below |

## Route atlas: a map, not a dialog (2026-09-19)

`renderGraph()` (in `game.js`) derives the whole map from `engine.script()`:
one card per label, one column per *distance from the prologue* (BFS depth over
every jump / choice / branch edge). What the layout has to survive is the data:
**205 labels over 55 depth columns**, with a prologue fan-out of up to 17 labels
sharing a single depth and 24 labels (Solo1Extra_*, Solo1PC_Chat, …) that no
edge leads into at all.

The version shipped on 2026-09-18 laid that out as one horizontal strip
(`.graph-cols { display:flex; overflow-x:auto }`, `.graph-col { min-width:
235px; flex: 1 0 235px }`) inside a panel capped at `min(1100px, 100%)`. What
that produced, and what replaced it:

| Symptom | Cause | Fix |
|---|---|---|
| ~170 px of empty window on *each* side of a 1440 px landscape | `.graph-panel { width: min(1100px, 100%) }` | `width: 100%` — the overlay's 12 px padding is the only margin |
| Every card sat at its 235 px minimum, text cut to 34/26/44 chars ("…" in 178 elements) | one 25 000 px strip of 100 columns: the viewport only ever showed four of them | columns are now equal tracks of a wrapped grid — `repeat(auto-fill, minmax(min(var(--graph-track), 100%), 1fr))` |
| Depths 55-98 (44 slots) rendered as blank columns of nothing | empty depth slots were rendered as columns | empty depths are skipped; the depth badge above each column carries the axis instead |
| One 17-card tower per dense depth, five tracks beside it empty | one column per depth, however wide the fan-out | depths wider than `GRAPH_STACK_MAX` (6) split into even stacks, badged "1 / 3" |
| 24 unreachable labels dumped in a mystery column at the far right | BFS sentinel depth 99 used as a column index | they have no depth: they render in their own "Вне маршрута" section |

`--graph-track` (300 px; 250 px ≤900 px wide, 230 px in short landscape,
240 px ≤600 px) is the only knob: it sets the *minimum* card width, and
`auto-fill` — never `auto-fit`, which would stretch a lone card across the
whole row — decides how many tracks the width affords. Try 12 → auto-fill picks
5 tracks of 355 px; at 844×390 (phone on its side, `max-height: 620px`) it picks
3 of 249 px, and the `.graph-panel` chrome above the map tightens up so the map
keeps the little height there is.

Nothing in the atlas talks to the network or writes story state: it reads
`engine.script()` / `engine.storage()`, opens targets with `scrollIntoView` and
teleports through `jumpToLabel()` (which wipes presentation + history first —
see the teleport regression test).

### Making it render fast (2026-09-19)

The first version of this map was visibly slow. Three independent causes, all
measured before and after (jsdom probes counting `requestAnimationFrame`
callbacks named `pass`, `getComputedStyle` calls and MutationObserver records):

| Cause | Measured symptom | Fix |
|---|---|---|
| `aurora-ui.js` observes the DOM it decorates (`MutationObserver` on `#vn-root` with `attributeFilter: ['class', …]`), and it wrote classes unconditionally | **a self-sustaining rAF loop**: a no-op `classList.add()` still queues a mutation record, so every pass scheduled the next one — 225 class writes / 3 s on the decorated buttons, 71 on `main-screen`, ~20 passes/s idle in jsdom (60/s in a browser), each with ~50 querySelectors **and a forced style recalculation** | `toggleClass()` writes only on change; buttons carry a `data-aurora-decorated` marker instead of being re-decorated; while a full-screen overlay is open the pass runs only `syncModalFlag` + `syncScreens`; `syncBackdrop()` reads the engine's inline `background-image` before falling back to `getComputedStyle()` |
| The panel is `.panel`, i.e. a full-window `backdrop-filter: blur(14px)` holder, and it animated its own transform on open | the compositor re-blurs the whole viewport every frame: during the entrance animation, while scrolling, and any time something behind it moves (title glow, HUD brand, clock colon) | `.graph-panel` gets an opaque surface (`rgb(var(--surface-rgb) / calc(.94 + var(--density) * .06))`), `backdrop-filter: none`, `animation: none`; decorative motion behind any open overlay is paused (`.aurora-modal-open`) |
| `renderGraph()` ran from `updateHUD()` on every `vn.*` change and did `body.innerHTML = <130 KB>` | ~2 000 nodes re-parsed and replaced per change | structure is built once and kept (keyed by the label set); each call first compares a cheap state signature and returns without touching the DOM; a state-only change patches the 5 chips (text nodes) and moves the "you are here" marker (~4 mutation records) |

Plus `content-visibility: auto` + `contain-intrinsic-size: auto 1100px` on
`.graph-col`, so scrolled-out columns are not laid out or painted at all.

Idle with the atlas open now costs **zero** rAF passes, zero class writes and
zero forced style recalcs (pinned by an assertion in `tests/offline-smoke.mjs`:
the skin must write nothing while idle, and the map must be patched, not
rebuilt). The first open shows the panel shell immediately and defers the one
initial build by a task, so the overlay never waits for 130 KB of markup.

## Engine traps (measured, not assumed)

| Trap | Symptom | Rule |
|---|---|---|
| `.row--spaced > .row__column { margin: .75rem }` and `.row__column--desktop--3 { width: 25% }` | save slots collapsed to a 25 px column inside our grid; help rows indented 12 px | override with `!important` on `slot-container > save-slot[class]`; zero margins under `[data-content=help]` |
| Help sections carry **both** `.row__column--tablet--6` and `.row__column--12.row` | a `help-screen .row__column--12.row { display:flex }` rule flattens the sections too | target `[data-content=help] > .row__column--tablet--6` and `> .row__column--12.row` explicitly |
| `settings-screen label { justify-content: space-between }` | injected theme options had their label pushed to the far edge | set `justify-content: flex-start` on `.aurora-theme-option` |
| Font Awesome copies `data-action` onto the replacement `<svg>` | `quick-menu [data-action=x]` matches two elements (Playwright strict-mode violation) | query `quick-menu button[data-action=x]` |
| `.modal { z-index: 99 }` vs our `choice-container` (100) | quit confirmation rendered *behind* an open choice panel | `.modal { z-index: 120 }`; overlays: menu 150, screens 90, header 70, quick-menu 61, footer 60, text-box 50 |
| Footer above quick-menu | `#shell-footer` (z 62) swallowed clicks meant for the quick menu (z 61) | keep the rail *below* the quick menu; the rail is only a backdrop |
| Nested `backdrop-filter` | every `.button` inside a blurred panel drew a visible frosted rectangle | blur only top-level surfaces (panels, text-box, footer); buttons are plain translucent glass, as in the mockup |
| animate.css `.animated` pins `animation-duration: 1s` | long loops on engine-managed elements run in 1 s | pin duration with `!important` on anything the engine tags `.animated` |
| `custom-ui.css` is loaded before the skin | legacy geometry can silently win if the files are reordered | keep `aurora-ui.css` last; `custom-ui.css` must remain structural and theme-free |
| `cssRules` is unreadable over `file://` | probes reporting "0 rules" | verify with `getComputedStyle` |
| `classList.add('x')` on an element that already has `x` **still queues a MutationObserver record** (same for `setAttribute` with an equal value) | the driver observed `class` on `#vn-root` and wrote classes unconditionally → it scheduled itself: 60 fps of decoration + forced style recalcs, worst with the atlas open | every skin write must be write-on-change (`toggleClass` checks `classList.contains`); never add a blind `classList.add`/`remove` to `aurora-ui.js` |
| `getComputedStyle()` in a rAF pass | flushes pending style changes → a full recalculation per frame | read the engine's inline style (`bg.style.backgroundImage`) first; only fall back to computed |
| Bad merges delete silently | `904fa18` once dropped 1,292 lines while reporting success | after any merge touching `game/`: `wc -l game/vendor/game.js` (~1000+) and run the suite |

## Verification

```bash
node --test game/tests/game.test.mjs game/tests/failsafe.test.mjs game/tests/icons-offline.test.mjs   # 71 pass
node game/tests/es5-scan.mjs game/vendor/aurora-ui.js game/vendor/game.js                        # no output
cd game && npm i jsdom@25 --prefix . --no-save --silent && REQUIRE_JSDOM=1 node tests/offline-smoke.mjs  # SMOKE PASSED
```

Visual checks were done with Playwright + Chromium over `file://` at
1440×900 and 844×390 (phone landscape): main menu, settings, help, game,
game menu, save (with a real slot), load, dialog log, archives, hidden UI,
auto-play state, choice panel, quit confirmation and a theme switch. Console
must show no errors (the two engine "Persistent Storage / no settings saved"
warnings are expected on first boot).
