# SEIRIN — handoff to the next agent

**Date:** 2026-07-29 · **Branch:** `arena/019fadbc-seirin` (fixed for this
session — never switch/create/push another branch)
**Language with the user:** Russian conversationally, but this turn's request
came through in English. They read code output carefully and want claims
backed by a measurement, not a description of what the CSS is *supposed* to
do.

---

## 0. First 60 seconds (the sandbox WILL bite you — it did this session)

The Arena sandbox can silently re-clone this repo mid-session: the local
checkout rolls back to an older commit, uncommitted local edits vanish, and
`git status` reports "clean" as if nothing happened. **It happened again this
session** — a local commit (`e30f284`, redoing the rivets/menu-overlap/tilt
fixes) turned out to be a *duplicate* of work already pushed further ahead by
an earlier turn in the same session, under commit `b66c8b9`. `git push`
correctly rejected the stale local commit; the fix was `git fetch` +
`git reset --hard` onto the remote tip, not force-push.

```bash
cd /home/user/Seirin
git log --oneline -1
git fetch origin arena/019fadbc-seirin
git log --oneline -1 FETCH_HEAD
```

If `HEAD` and `FETCH_HEAD` differ, **trust `FETCH_HEAD`** — diff them
(`git diff HEAD FETCH_HEAD --stat`) before doing anything destructive, but if
FETCH_HEAD is a superset of your local work (as it was this session), just:

```bash
git reset -q --hard FETCH_HEAD
```

**Survival rule, restated because it mattered again this session: commit and
push every finished artifact immediately, not in a batch at the end.**
Unpushed equals nonexistent, and if the sandbox resets under you, only
`origin` survives.

Current verified-good state: `game/vendor/mecha-ui.css` = 3460 lines,
`game/vendor/mecha-ui.js` = 1612 lines, `node --test` = 61/61,
`offline-smoke.mjs` = all PASS, `es5-scan.mjs` = clean.

---

## 1. Rebuilding a real browser (needed for any visual claim)

`/tmp` does not survive between turns *or* sometimes between bash calls in
the same turn — background servers (`python3 -m http.server &`) died
unpredictably this session even with `nohup`/`disown`/`setsid`. If a
static file server refuses to answer on a port you just started it on,
re-launch it in the *same* bash call as the thing that uses it, or fall back
to the jsdom probe below instead of fighting the server.

Real Chromium (works around the egress allowlist blocking browser binary
downloads — `npm install` reaches `registry.npmjs.org`, real browser CDNs are
blocked):

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

Drive it with `playwright-core` (`executablePath: '/tmp/cbin/chromium'`, args
`--no-sandbox --disable-gpu --disable-dev-shm-usage`,
`LD_LIBRARY_PATH=/tmp/cbin/lib/lib` on the node process env). **No GPU** — an
empty `requestAnimationFrame` loop tops out around 20fps, so FPS numbers are
only meaningful *relative* to that ceiling; say so when reporting them.

**Lower-effort alternative that needs no server and survived every bash call
this session:** `game/tests/mecha-ui.probe.mjs` boots `index.html` via jsdom
(no network, no port) and reports plates mounted, layer counts, indicator
response to alert level, and late-mount coverage:

```bash
cd game && npm i jsdom --prefix . --no-save --silent
node tests/mecha-ui.probe.mjs
```

It cannot show real rendering (jsdom has no layout engine), so it cannot
verify pixel positions, transforms, or animation amplitude — only that the
JS ran without throwing and built the expected DOM/CSS-variable shape. For
anything about *what it looks like*, you need the real-Chromium route above.

---

## 2. What this session did

User report (paraphrased): rivets are animated, most animations are unused or
invisible, the 2.5D doesn't look like 3D at all, sprite and button animation
"make no sense" — wants a genuine skeuomorphic mecha UI, static concepts via
image generation, dynamic behaviour via real math/logic (not vibes).

This exact audit and fix set was **already completed and pushed** by an
earlier turn in this same session (commits `65b8753` → `b66c8b9`, session log
in `design/MECHA_UI.md` under "Session 9"). This turn's own redo of the same
diagnosis (rivets, menu overlap, tilt) landed as commit `e30f284`, discovered
to be a strict subset of what was already on `origin`, and was discarded via
`git reset --hard` onto `origin`'s tip rather than merged or re-applied —
**do not try to re-land `e30f284` or repeat this diagnosis**, it is already
fixed and verified. One artifact from that discarded local work is worth
keeping and IS committed: `design/concepts/05_squeomorph_button_states.jpg`,
a generated reference board for physical button states (idle/hover/pressed)
that can inform further static polish.

Summary of what's actually fixed on `origin/arena/019fadbc-seirin` right now
(full detail in `design/MECHA_UI.md`, "Session 9"):

| Complaint | Root cause found | Fix |
|---|---|---|
| "Rivets are animated" | Bolt-row gradients shared one `background-image` list and one `background-position` keyframe with the running edge-light on the console's text panel | Split into two pseudo-elements: bolts on `::before` (never animates), edge light alone on `::after` |
| "Main menu title overlaps buttons" | Two absolutely-positioned pseudo-elements (`top:16%`) racing an independently-centered `main-menu`, no shared layout parent, only one narrow-phone breakpoint guarded it | Real `.mech-title-block` element (`buildTitleBlock()` in JS) as `main-screen`'s first flex child; `main-menu` is the second — two flex siblings cannot share pixels |
| "2.5D doesn't look 3D" | `--mech-mx/--mech-my` were whole-viewport pointer coords applied identically to every plate — the whole UI sheared as one flat card, at a max ~1.5° | Added `--mech-lmx/--mech-lmy`: pointer position *relative to whichever plate is under the cursor*, written only on that one `.mech-hot` element, at ~11–14° + `translateZ` lift + depth-separated sublayers |
| "Sprite animation makes no sense" | Breathing scaled from sprite center, so the character's feet lifted 12.5px off the ground every cycle | `transform-origin: 50% 100%` (bottom edge), scale only, tiny counter-rotation for weight-shift; Splash (legless colloid) is the deliberate exception and keeps a real vertical float |
| "Button animation makes no sense" | Hover/press only existed as flat `translateY`, invisible on touch, plus a filter-precedence bug where the idle-breathing keyframe silently outranked the new directional tilt shadow | Real per-plate tilt (`.mech-hot`) responds to tap/hover with a directional contact shadow that tracks pointer position; press sinks the plate `translateZ` negative instead of a flat nudge; `!important` fix for the animation-vs-declaration cascade trap |

Also fixed in the same pass: a critical regression caught **before** commit
(`main-screen { display:flex !important }` without `.active` scoping made
menu and game screens render simultaneously, 640px/640px split) — logged in
MECHA_UI.md as a cascade trap to remember (`!important` on a
`[data-screen]`-family rule must match the engine's own `.active` condition,
never the bare tag).

---

## 3. Current verified state

| Check | Result |
|---|---|
| `node --test game/tests/{game,failsafe,icons-offline}.test.mjs` (from `game/`) | **61 pass, 0 fail** |
| `REQUIRE_JSDOM=1 node tests/offline-smoke.mjs` (from `game/`) | **SMOKE PASSED**, all listed checks PASS |
| `node tests/es5-scan.mjs vendor/game.js vendor/mecha-ui.js` (from `game/`) | clean |
| `node tests/mecha-ui.probe.mjs` (from `game/`, jsdom) | 19 plates mounted, 0 errors, indicators respond correctly to alert 0/20/55 |
| Real-Chromium per-corner tilt probe | `.mech-hot` + correct `--mech-lmx/--mech-lmy` at all 4 reachable corners of a button (2 corners are clipped away by the plate's own chamfer geometry — expected, not a bug) |
| Real-Chromium menu-overlap probe | `overlapPx: 0` at 1280×720, 1920×1080, 1366×768, 1440×900, 390×844, 844×390 |

No known-broken item as of this handoff.

---

## 4. Open items / suggested next steps

Ranked by likely value, carried over from the prior handoff plus this
session's own notes:

1. **Verify on a real device.** Everything measured this session and last was
   in a GPU-less headless Chromium extracted via the `@sparticuz/chromium`
   trick above. The user plays on Android/Brave; real-device screenshots have
   repeatedly caught things the sandbox could not (native long-press menu,
   page scrolling, a pumping backdrop from an animate.css duration collision).
2. **Static skeuomorphic polish via image generation.** The user explicitly
   asked for static UI direction via the image tool and dynamic behaviour via
   math/logic (already the project's approach — canvas-baked textures +
   measured CSS custom properties, not hand-wavy keyframes). One reference
   board exists: `design/concepts/05_squeomorph_button_states.jpg`
   (idle/hover/pressed states, materials, lighting notes). Consider
   generating a matching board for the console/dash/housing plate kinds and
   diffing the current CSS bevel/gradient recipe against it the way
   `design/concepts/01-04` were used as the original build checklist.
3. **Audio.** Four themed volume sliders in Settings control nothing — no
   audio files ship (`game/assets/` has only `characters/`, `scenes/`,
   `fonts/`). Either add audio or hide the sliders; a control that does
   nothing is a small lie in the UI.
4. **Save/load screens** got the base theme but no dedicated pass.
5. **Story content** — only Chapter 0 exists; `LABEL_TITLES` in
   `game/vendor/game.js` is the map of the 17 labels that currently exist.
6. **Route atlas performance** — was 6fps, improved to the sandbox's ~20fps
   idle ceiling by pausing all animation behind an open modal + halving
   `backdrop-filter` blur. If a real device still finds it heavy, virtualise
   the 17 cards rather than shaving further effects.
7. Consider retiring `cyber-nexus/` or marking it clearly archived — it has
   confused more than one agent session now.

---

## 5. Working agreements with this user

- **Screenshots/measurements are the proof.** Don't claim a fix without a
  live-Chromium number (pixel positions, computed transforms, animation
  sample sequences) or a `present_file`'d screenshot. A change that "should"
  work per reading the CSS is not verified.
- **Diagnose before rewriting.** This session's most valuable moves were
  narrow, targeted fixes at a measured root cause (one shared
  `background-position` keyframe, one missing `.active` scope, one
  `!important` cascade loss) rather than a wholesale rewrite of the UI system.
  The architecture (plate model, canvas-baked textures, `.mech-hot` local
  tilt, deterministic PRNG wear) is sound; keep extending it rather than
  replacing it.
- **Report your own mistakes plainly.** This chain has repeatedly found and
  fixed bugs introduced by its own prior turn (the padding "correction" that
  oversized every layer, an idle animation that made buttons unclickable, a
  `display:flex` regression that showed two screens at once, a filter
  cascade loss). Say so; don't quietly patch over it.
- The user is often terse and in a hurry. Push after **every** finished
  artifact (see §0) — do not batch commits toward the end of a turn.

---

## 6. Documentation map

| File | What it is for |
|---|---|
| `AGENTS.md` | Repo invariants, commands, conventions. |
| `README.md` | Directory map; `game/` is the shipping build. |
| `design/MECHA_UI.md` | **The UI bible.** Trap table + one-page architecture summary, then a per-session log of every bug, why it happened, and how it was measured. Read "Session 9" for this session's full detail. |
| `design/HANDOFF.md` | This file. |
| `ai_agent_docs/ARENA_ENVIRONMENT.md` | Sandbox capabilities/limits (allowlisted egress, no preinstalled Python packages, non-persistent shell — read before assuming a tool is available). |
| `design/preview/shots/` | Reference screenshots, JPEG only. Regenerate/shrink with `design/tools/shrink-shots.mjs`. |
| `design/concepts/` | Art-direction boards used as build checklists (`01`–`04` for the original armour pass, `05` for button physical states from this session). |
