# SEIRIN — handoff to the next agent

**Date:** 2026-07-29 · **Branch:** `arena/019faf00-seirin` (fixed for this
session — never switch/create/push another branch)
**Language with the user:** Russian conversationally, English is fine too.
They read code output carefully and want claims backed by a measurement, not
a description of what the CSS is *supposed* to do.

---

## 0. First 60 seconds (sandbox survival)

The Arena sandbox can silently re-clone the repo mid-session. **Commit and
push every finished artifact immediately** — unpushed equals nonexistent.

```bash
cd /home/user/Seirin
git log --oneline -1
git fetch origin arena/019faf00-seirin
# If HEAD ≠ FETCH_HEAD, trust FETCH_HEAD:
git reset -q --hard FETCH_HEAD
```

Current verified-good state: `mecha-ui.css` ~3690 lines, `mecha-ui.js`
~1640 lines, `node --test` = 61/61, `offline-smoke.mjs` = SMOKE PASSED,
`es5-scan.mjs` = clean, `mecha-ui.probe.mjs` = 19 plates, 0 errors.

---

## 1. Rebuilding a real browser (needed for visual claims)

`/tmp` does not survive between turns. Re-launch in the same bash call:

```bash
mkdir -p /tmp/pw /tmp/cbin
cd /tmp/pw && npm i --no-audit --no-fund --prefix /tmp/pw \
  playwright-core@1.49.0 @sparticuz/chromium@131.0.1
node -e "
const fs=require('fs'),z=require('zlib');
fs.writeFileSync('/tmp/cbin/chromium', z.brotliDecompressSync(fs.readFileSync('/tmp/pw/node_modules/@sparticuz/chromium/bin/chromium.br')));
['al2023','swiftshader'].forEach(n=>fs.writeFileSync('/tmp/cbin/'+n+'.tar',
  z.brotliDecompressSync(fs.readFileSync('/tmp/pw/node_modules/@sparticuz/chromium/bin/'+n+'.tar.br'))));
"
chmod +x /tmp/cbin/chromium
cd /tmp/cbin && mkdir -p lib && tar xf al2023.tar -C lib && tar xf swiftshader.tar -C .
LD_LIBRARY_PATH=/tmp/cbin/lib/lib /tmp/cbin/chromium --version   # Chromium 131
```

Drive with `playwright-core` (`executablePath: '/tmp/cbin/chromium'`, args
`--no-sandbox --disable-gpu --disable-dev-shm-usage`,
`LD_LIBRARY_PATH=/tmp/cbin/lib/lib`). **No GPU** — empty rAF loop ~20fps.

**Lower-effort alternative** (jsdom, no server):
```bash
cd game && npm i jsdom --prefix . --no-save --silent
node tests/mecha-ui.probe.mjs
```

---

## 2. What this session did (Session 10)

Continued from Session 9 handoff. Three items tackled:

### 2a. Save/Load screen dedicated pass

Save/load slots were engine-default (coloured rectangles, white input). Now
styled as "data cartridges":

| Element | Treatment |
|---|---|
| `[data-content="background"]` | Viewport window: cyan top-lip, inset shadow, CRT scanline overlay |
| `.badge` | Orbitron stencil label on dark steel strip |
| `figcaption` | Amber timestamp readout |
| `[data-delete]` | Red indicator rivet (26×26, radial gradient) |
| `input[data-input="slotName"]` | Dark recessed field, cyan glow on focus |
| `button[data-action="save"]` | Chamfered plate with proper padding |
| `slot-container p[data-string]` | Stencilled empty-state message |
| `slot-container` | Flex-wrap grid (280px base, 200–320px range) |

### 2b. Audio status note

Four volume sliders work (wired to engine Volume preferences) but no audio
files ship. Added `buildAudioNote()` in mecha-ui.js — injects a dashed-amber
"Аудиофайлы ещё не добавлены" note in the audio settings panel.

### 2c. Concept boards 06–08

Three reference boards for the build checklist:
- `06_plate_taxonomy.jpg` — 6 plate types with material callouts
- `07_settings_dashboard.jpg` — settings screen concept
- `08_save_load_cartridges.jpg` — data cartridge save slots

---

## 3. Open items / suggested next steps

Ranked by likely value:

1. **Verify on a real device.** Everything was measured in headless Chromium.
   The user plays on Android/Brave; real-device screenshots have repeatedly
   caught things the sandbox cannot.
2. **Audio content.** The audio note says "coming soon" — adding even one
   ambient loop and one click SFX would let the sliders do real work and the
   note be removed.
3. **Story content.** Only Chapter 0 exists; `LABEL_TITLES` in
   `game/vendor/game.js` maps the 17 labels.
4. **Route atlas performance.** Was 6fps, improved to sandbox ceiling (~20fps)
   by pausing animation behind modals + halving backdrop-filter blur.
5. **Retire `cyber-nexus/`** or mark it clearly archived — it has confused
   more than one agent session.
6. **CSS polish against concept boards.** Diff the current CSS bevel/gradient
   recipes against `design/concepts/06-08` the way `01-04` drove the original
   armour pass.

---

## 4. Working agreements with this user

- **Screenshots/measurements are the proof.** Don't claim a fix without a
  live-Chromium number or a `present_file`'d screenshot.
- **Diagnose before rewriting.** Targeted fixes at measured root causes.
  The architecture (plate model, canvas-baked textures, `.mech-hot` local
  tilt, deterministic PRNG wear) is sound.
- **Report your own mistakes plainly.** Say so; don't quietly patch over it.
- Push after **every** finished artifact — do not batch.

---

## 5. Documentation map

| File | What it is for |
|---|---|
| `AGENTS.md` | Repo invariants, commands, conventions. |
| `README.md` | Directory map; `game/` is the shipping build. |
| `design/MECHA_UI.md` | **The UI bible.** Trap table + architecture + per-session log. |
| `design/HANDOFF.md` | This file. |
| `ai_agent_docs/ARENA_ENVIRONMENT.md` | Sandbox capabilities/limits. |
| `design/preview/shots/` | Reference screenshots, JPEG only. |
| `design/concepts/` | Art-direction boards (01–08). |
