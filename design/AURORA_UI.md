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
├── vendor/custom-ui.css          legacy flat theme; still owns a few layout pins
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
| `SeirinGame_TextScale` | 70–160 % (default 100) | `--text-scale` (dialogue only) |
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

UI text supports Russian (default), English, Simplified Chinese, Japanese,
Hindi and Swahili. The selector is available in the main menu and Appearance
settings. `vendor/locales/ui.js` holds all six UI catalogs;
`vendor/i18n.js` handles persistence, engine chrome, accessible labels and CSS
headings. See [UI_I18N.md](UI_I18N.md) for scope and maintenance details.

## How the mockup maps onto engine markup

| Mockup | Engine element | Note |
|---|---|---|
| Title panel + menu list | `main-screen > main-menu` | `.aurora-title` is injected above the engine's buttons; `custom-ui.css` still has `main-menu … !important` rules the skin has to beat |
| Dialogue glass (name tab, text, meta) | `text-box > [data-content=name]`, `[data-content=text]`, injected `.aurora-meta` | text-box is repositioned to sit on the footer rail; text is outlined (4-way shadow + `-webkit-text-stroke`) because the glass is 95 % transparent by default |
| Quick actions rail | `quick-menu` | moved into `#shell-footer`'s middle column; icons via sprite |
| Choice panel | `choice-container` | fixed, centred, z 100; `::before/::after` supply the "Развилка / Ваш ответ" heading |
| Settings panel | `settings-screen` | `.aurora-appearance` fieldset (theme picker, glass, text size, UI scale) is injected before the engine's audio/speed blocks |
| Save/Load | `save-screen`, `load-screen`, `slot-container`, `save-slot` | slots become a 3-column grid; save-screen has no engine `<h2>`, so the heading is `save-screen::before/::after` |
| Help | `help-screen [data-content=help]` | engine markup is nested `.row` grids; flattened into key rows |
| Dialog log | `dialog-log .modal__content` | rows tagged `[data-spoke]`; clicking a row rewinds to it |
| Confirm / quit | `alert-modal` | `.modal` z-index raised to 120 (above choices) |
| Game menu | `#game-menu-overlay` (ours) | build stamp from `window.SeirinBoot.BUILD` in the footer |

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
| `main-menu` rules in `custom-ui.css` use `!important` | skin styles silently lost | the skin's main-menu block also uses `!important`; do not add more |
| `cssRules` is unreadable over `file://` | probes reporting "0 rules" | verify with `getComputedStyle` |
| Bad merges delete silently | `904fa18` once dropped 1,292 lines while reporting success | after any merge touching `game/`: `wc -l game/vendor/game.js` (~1000+) and run the suite |

## Verification

```bash
node --test game/tests/game.test.mjs game/tests/failsafe.test.mjs game/tests/icons-offline.test.mjs   # 65 pass
node game/tests/es5-scan.mjs game/vendor/aurora-ui.js game/vendor/game.js                        # no output
cd game && npm i jsdom@25 --prefix . --no-save --silent && REQUIRE_JSDOM=1 node tests/offline-smoke.mjs  # SMOKE PASSED
```

Visual checks were done with Playwright + Chromium over `file://` at
1440×900 and 844×390 (phone landscape): main menu, settings, help, game,
game menu, save (with a real slot), load, dialog log, archives, hidden UI,
auto-play state, choice panel, quit confirmation and a theme switch. Console
must show no errors (the two engine "Persistent Storage / no settings saved"
warnings are expected on first boot).
