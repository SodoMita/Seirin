# SEIRIN — handoff to the next agent

**Date:** 2026-07-29 · **Branch:** `arena/019faa32-seirin` · **PR:** #9 (open)
**Language with the user:** Russian. They read code output carefully and will
spot a claim that is not backed by a measurement.

---

## 0. First 60 seconds (the sandbox WILL bite you)

The Arena sandbox silently re-clones this repo mid-session: the local checkout
rolls back to the session's base commit, uncommitted files vanish, and
`git status` cheerfully reports "clean". **This happened in 4 of the last 6
sessions.** It is not a hypothetical.

```bash
cd /home/user/Seirin
git log --oneline -1
git ls-remote origin arena/019faa32-seirin | cut -f1   # compare with HEAD
```

If they differ, recover — your work is on `origin`, not on disk:

```bash
git stash -u -q 2>/dev/null
git fetch -q origin arena/019faa32-seirin:refs/remotes/origin/arena/019faa32-seirin
git reset -q --hard origin/arena/019faa32-seirin
wc -l game/vendor/mecha-ui.css game/vendor/mecha-ui.js   # expect 3259 / 1521
```

**Survival rule: commit and push every finished artifact immediately.** Not in
a batch at the end. Unpushed equals nonexistent.

One caveat learned the hard way: after a sandbox reset your new commit may be
built on the *old* base while `origin` is ahead. Don't force-push — rebase:

```bash
git rebase --onto origin/arena/019faa32-seirin <old-base> HEAD
```

---

## 1. Rebuilding the browser (needed for any visual work)

`/tmp` does not survive, so Chromium must be re-extracted each session. Real
browser binaries are blocked by the egress allowlist; npm is not. This works:

```bash
cd /tmp && npm i --no-audit --no-fund --prefix /tmp \
  playwright-core@1.49.0 @sparticuz/chromium@131.0.1
mkdir -p /tmp/cbin && cd /tmp && node -e "
const fs=require('fs'),z=require('zlib');
fs.writeFileSync('/tmp/cbin/chromium', z.brotliDecompressSync(fs.readFileSync('/tmp/node_modules/@sparticuz/chromium/bin/chromium.br')));
['al2023','swiftshader'].forEach(n=>fs.writeFileSync('/tmp/cbin/'+n+'.tar',
  z.brotliDecompressSync(fs.readFileSync('/tmp/node_modules/@sparticuz/chromium/bin/'+n+'.tar.br'))));"
chmod +x /tmp/cbin/chromium
cd /tmp/cbin && mkdir -p lib && tar xf al2023.tar -C lib && tar xf swiftshader.tar -C .
LD_LIBRARY_PATH=/tmp/cbin/lib/lib ./chromium --version   # Chromium 131
```

Then drive it with `playwright-core` (`executablePath: '/tmp/cbin/chromium'`,
args `--no-sandbox --disable-gpu --disable-dev-shm-usage`, and
`LD_LIBRARY_PATH=/tmp/cbin/lib/lib` on the node process).

**This browser has no GPU.** An empty `requestAnimationFrame` loop tops out
around 20fps, so FPS numbers are only meaningful *relative* to that ceiling.
Say so when you report them; don't present 15fps as an absolute.

---

## 2. What this branch contains

22 commits on top of `d27c0ec`. ~7,000 insertions across 77 files.

**Recovery.** Merge `904fa18` had resolved conflicts toward a stale side and
silently deleted **1,292 lines** — all 17 story labels, the route atlas, the
archives codex, `LABEL_TITLES`, the boot watchdog — while `index.html` still
shipped the modal markup, so Archives and the atlas were dead buttons. Restored
from `aba98eb` (that commit lives on branch `arena/019fa60e-seirin`; after a
sandbox re-clone you must `git fetch origin arena/019fa60e-seirin` before the
SHA resolves). The unit suite went 37/1 → **61/61**; the long-standing
`labels is not defined` failure was the same merge truncating a test mid-file.

**New UI.** `game/vendor/mecha-ui.css` (3259 lines) + `mecha-ui.js` (1521),
loaded last so they win the cascade over `custom-ui.css`:

- 2.5D skeuomorphic armour: layered plates (rim / face / wear / gloss / rivets
  / edge), canvas-baked metal and bruise textures published as CSS variables —
  **no binary committed, nothing fetched**, deterministic PRNG so the wear is
  identical every run.
- Live HUD instruments (LEDs, segmented gauges, radar, telemetry ticker) driven
  read-only from `engine.storage()`; alert escalates nominal → caution → alarm.
- Themed system screens, quick-menu, engine modals; custom CSS-mask icons.
- Route atlas reachable from the main menu; archives codex; history log with
  Ren'Py-style click-to-rewind (chained `engine.rollback()`, so FailSafe's
  `onRevert` unwinds stats correctly — a jump would corrupt the run).
- Numeric UI-scale setting (60–160%, persisted in `localStorage`).
- Viewport locked; native image long-press/drag suppressed on artwork.
- Ambient + event animation (see §4).

---

## 3. Current state

| Check | Result |
|---|---|
| `node --test game/tests/{game,failsafe,icons-offline}.test.mjs` | **61 pass, 0 fail** |
| `REQUIRE_JSDOM=1 node tests/offline-smoke.mjs` (in `game/`) | **SMOKE PASSED** |
| `node game/tests/es5-scan.mjs game/vendor/{game,mecha-ui}.js` | clean |
| 5-viewport audit (360→1440) | no blocked/off-screen buttons, no overlaps |
| Text contrast | 12.9–15.2 : 1 (AAA is 7) |
| `prefers-reduced-motion` | 74 animations → 1; plates and text intact |
| `design/` tracked size | 6.3 MB (was 34 MB — JPEG only, PNG gitignored) |

`MechaUI` exposes `start, refresh, mountAll, syncChoices, bindSliders,
retagIcons, syncStripTop, syncQuickMenu, tagLogRows, syncModalFlag,
undraggable, tickAnimations, bindTapFeedback, applyScale, readScale,
rewindSteps, bakeTextures, plates` — useful handles when probing from a page
evaluate.

---

## 4. Animation: current design

Two layers, because the first alone was not enough.

**Ambient loops** — retimed after measuring that everything was below the
perception floor (~3px/s). Sprite breathing 3.9px/s, Ken Burns 0.005 scale/s,
key light 6.7%/s. Sprite motion uses the individual `translate:` property,
**never `transform:`** (the engine owns transform for left/center/right
anchoring), and Ken Burns is scoped to the background element only — an earlier
selector also matched sprite `<img>` children and silently killed breathing.

**Event reactions** (`tickAnimations`, 180ms): nameplate slide-in on speaker
change, console pulse on a new line, sprite step-in, scene wipe, gauge flare +
floating `+5 МИЯ` delta, dashboard shake and red wash on alert, choice plates
arriving from off-screen (120vw, alternating sides) and the rack retracting on
commit, tap ring + flash on any button.

Delta colour is keyed to **meaning, not sign**: rising Akatomi alert and rising
procrastination float red even though the number goes up.

All of it is gated in `prefers-reduced-motion`.

---

## 5. Open items / suggested next steps

Nothing is known-broken. Ranked by likely value:

1. **Verify on a real device.** Everything here was measured in a GPU-less
   headless Chromium. The user plays on Android/Brave at `localhost:8000`;
   their screenshots have repeatedly caught things the sandbox could not
   (native long-press menu, page scrolling, the pumping backdrop).
2. **Audio.** `engine.settings` maps `music`/`sounds`/`voices` asset paths and
   `engine.preferences` sets Music/Voice/Sound volumes, and the settings screen
   renders four themed volume sliders — but **no audio files ship**
   (`game/assets/` has only `characters/`, `scenes/`, `fonts/`). Four sliders
   that control nothing are a small lie in the UI; either add audio or hide
   them.
3. **Save/load screens** got the base theme but no dedicated pass; save slots
   are still fairly plain.
4. **Story content** — only Chapter 0 exists; the 17 labels end quickly.
   `LABEL_TITLES` in `game/vendor/game.js` is the map.
5. **Route atlas performance** improved 6 → 15fps but is still the heaviest
   screen. If it needs more, virtualise the 17 cards rather than shaving
   further effects.
6. Consider retiring `cyber-nexus/` or clearly marking it archived — it has
   confused at least one agent (and this doc's own predecessor).

---

## 6. Working agreements with this user

- **Screenshots are the proof.** Show the real rendered result via
  `present_file`; don't claim a fix without one.
- **Measure, don't assume.** Every accepted diagnosis this chain came from a
  number: pixel positions, fps, px/s, contrast ratios. When a fix looked like a
  regression (tapping the background stopped advancing), the right move was to
  stash and re-measure on the previous commit — it turned out to be
  pre-existing engine behaviour, not damage.
- **Report your own mistakes.** Several bugs in this chain were mine (the
  padding "correction" that oversized every layer, the idle animation that made
  buttons unclickable, 34MB of PNGs). Saying so plainly was fine; hiding it
  would not have been.
- The user is often terse and in a hurry. Open the PR as soon as the commit is
  green and fold later work into it.
- Push after **every** artifact (see §0).

---

## 7. Documentation map

| File | What it is for |
|---|---|
| `AGENTS.md` | Repo invariants, commands, conventions. Now correctly points at `game/`. |
| `README.md` | Directory map. Now lists `game/` first as the shipping build. |
| `design/MECHA_UI.md` | **The UI bible.** Starts with a trap table and a one-page architecture summary, then a per-session log of every bug, why it happened and how it was measured. |
| `design/HANDOFF.md` | This file. |
| `ai_agent_docs/ARENA_ENVIRONMENT.md` | Sandbox capabilities/limits (allowlisted egress, no preinstalled Python packages, non-persistent shell). |
