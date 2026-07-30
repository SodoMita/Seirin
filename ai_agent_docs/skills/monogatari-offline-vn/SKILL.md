---
name: monogatari-offline-vn
description: >-
  Build and edit Monogatari-engine visual novels that ship as a no-server,
  no-CDN, no-fetch folder runnable by double-clicking index.html (file://).
  Use when creating or modifying a Monogatari VN, fixing "needs a web server"
  or rollback/Back-button bugs, wiring stats/flags/choices safely, or
  vendoring fonts/icons locally — it enforces offline purity, routes every
  state mutation through rollback-safe helpers, and machine-checks the script.
license: CC-BY-4.0
metadata:
  project: "Seirin: Night Shift — Resonance 2030"
  applies-to: cyber-nexus/ and any new Monogatari game folder in this repo
  version: "1.0.0"
---

# Monogatari Offline VN

Rules and workflows for Monogatari games in this repo. The reference
implementation is `cyber-nexus/` — read it while applying these rules.

## The three invariants

1. **Offline purity.** Double-clicking `index.html` must run the whole game.
   No CDN tags, no `http(s)` asset URLs, no `fetch`/XHR/WebSocket/sendBeacon
   at runtime, no service workers, no webfont hotlinks. Engine settings must
   include `'ServiceWorkers': false` and `'Preload': false`.
2. **Rollback-safe state.** Monogatari cannot invert your JS. Every mutation
   of story state (stats, flags, location) goes through
   `vendor/failsafe.js`'s `FailSafe.vn` facade:
   - `vn.reversible(spec)` — script steps (Function action, snapshot restore)
   - `vn.choiceEffect(deltas, flags)` — choice `onChosen`/`onRevert` pairs
   - `vn.goTo(location)` — location changes
   - `vn.branch(cond, { True, False })` — stat-gated branching
3. **Machine-checked rules.** `vn.lintScript()` runs on boot and logs any
   bare function step, dead jump target, `onChosen` without `onRevert`, or
   Conditional missing `False`. Keep the game CLEAN; treat warnings as errors.

## How to do common tasks

- **Add a stat change**: put `vn.reversible({ karma: 20 })` (deltas) or
  `vn.reversible({ flags: { met_x: true } })` (sets) in the label array.
- **Add a choice with side effects**: `Object.assign({ Text, Do: 'jump X' },
  vn.choiceEffect({ karma: 20 }, { side_flag: true }))`. `Do` MUST be a
  statement string — a function there silently discards its return value.
- **Branch on stats**: `vn.branch(function(){ return engine.storage('player').hacking >= 4; }, { True: 'jump Win', False: 'jump Lose' })`.
- **Add an icon**: extend `vendor/icons-offline.css` with one
  `.fa-name::before { content: "…" }` rule AND add the name to `KNOWN_ICONS`
  in `vendor/icons-offline.js`. Never add a CDN font link — the vendored
  `monogatari.css` intentionally ships without the icon font.
- **Add fonts**: drop woff2 files under `assets/fonts/`, declare them in
  `assets/fonts/fonts.css` with relative URLs.
- **Add storage fields**: extend `STORAGE_SCHEMA` in `index.html`; the boot
  validator repairs old/corrupt saves from your declared defaults.
- **Validate changes**: run the commands in **Verification** below.

## Traps this skill exists to prevent (observed, not hypothetical)

- Container `id="monogatari"` hijacks `window.monogatari` (named-element
  global) and silently breaks engine glue — use `id="vn-root"`.
- A bare `function(){}` script step makes the Back button silently stop.
- `onChosen` without `onRevert`: stats stay applied after rewind.
- Hand-written inverses (subtract delta / boolean-NOT flag) corrupt state when
  a flag was already true before the choice — snapshot restore is the fix and
  is what `FailSafe.vn` does.
- `show scene` already hides characters; a following `hide character X` throws
  "Attempted to hide a character that was not being shown."
- "Preload" + fetch-based features need HTTP; leaving defaults on is the
  classic reason a game "still needs a server".
- Mini-games/external widgets are meta-state: mutate via plain functions
  OUTSIDE the script timeline, never through rollback-tracked actions.

## Verification (run all that apply — commands assume repo root cwd)

1. `node --test cyber-nexus/tests/failsafe.test.mjs cyber-nexus/tests/icons-offline.test.mjs` — unit tests, zero deps.
2. `node cyber-nexus/tests/offline-smoke.mjs` — file:// boot; asserts no
   remote requests, no fetch calls, lint CLEAN, icons mapped, snapshot
   restore works. Needs dev-only `jsdom`.
3. `python3 cyber-nexus/tests/test_rewind.py` — real-browser rollback
   regression (playwright).
4. Manual: open `index.html` in a browser with DevTools offline mode; expect
   zero failed requests and the `[FailSafe] script lint: CLEAN` banner.

## References

- `references/failsafe-api.md` — FailSafe module-by-module API cheat sheet.
- `references/offline-checklist.md` — the full pre-ship offline audit list.
- Upstream docs: developers.monogatari.io (script-actions/*, building-blocks/*),
  github.com/Monogatari/Monogatari (offline/server caveats). Project research:
  `../../AGENT_SKILLS_RESEARCH.md`.
