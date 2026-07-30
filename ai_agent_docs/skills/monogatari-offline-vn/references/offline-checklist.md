# Pre-ship offline audit checklist

Run this entire list before calling a Monogatari game folder "done". Every
item below has bitten this project at least once.

## A. Static audit (no browser needed)

- [ ] `grep -nE 'https?://' index.html` → ONLY comments/meta text, zero live
      tags (`<script src>`, `<link href>`, `url(...)`, `@import`).
- [ ] `grep -nE 'fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource' index.html` →
      zero (game code) — the net guard covers engine/vendor surprises.
- [ ] Every `<script src>`/`<link href>` resolves to an existing local file
      (check spelling AND case — file:// is case-sensitive on Linux).
- [ ] `assets/fonts/fonts.css` uses relative `url(...)`s to local woff2 files.
- [ ] Engine settings contain `'ServiceWorkers': false` and `'Preload': false`.
- [ ] No `<div id="monogatari">` (hijacks `window.monogatari`); container is
      `id="vn-root"`.
- [ ] `vendor/` contains monogatari.js + monogatari.css + failsafe.js +
      icons-offline.css + icons-offline.js — all local, all referenced.
- [ ] No `service-worker.js` registration anywhere; no manifest.json link.

## B. Boot audit (browser, DevTools offline mode)

- [ ] Network panel shows only `file://` entries; zero failed requests.
- [ ] Console shows `[FailSafe] script lint: CLEAN` (or plan to fix listing).
- [ ] Console shows the net guard banner; zero violations recorded.
- [ ] All icons render (quick menu, HUD, settings, choices) — no empty boxes;
      `Object.keys(IconsOffline.missing)` is empty in the console.
- [ ] Fonts render (no fallback-serif flash) with the network disabled.

## C. Rollback audit (browser or tests/test_rewind.py)

- [ ] Advance past a `vn.reversible()` stat award, press Back: the stat is
      restored to its exact previous value (not merely decremented).
- [ ] Choose a flagged choice twice in a row (forward, back, forward): the
      flag's pre-choice value survives rewind (snapshot, not boolean-NOT).
- [ ] Rollback across a `goTo()` restores the HUD location to where the player
      actually was.
- [ ] A `vn.branch()` gate respects live stats (hack gate at LVL 3 fails,
      LVL 5 passes in the reference game).
- [ ] No console errors while rewinding through the longest route.

## D. Repo hygiene

- [ ] `git status` clean except intended files; no node_modules/.venv/OS junk
      (.gitignore covers them — keep it that way).
- [ ] `node --test tests/failsafe.test.mjs tests/icons-offline.test.mjs` all pass.
- [ ] `node tests/offline-smoke.mjs` passes (with dev-only jsdom installed).
- [ ] README sections updated when behavior/architecture changed.
