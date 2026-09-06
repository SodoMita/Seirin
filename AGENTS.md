# AGENTS.md — Seirin

Instructions for AI coding agents working in this repository. Read this before
making changes. (Tool-agnostic [AGENTS.md](https://agents.md) format; deeper
skill docs live in `ai_agent_docs/`.)

## What this is

`Seirin: Night Shift — Resonance 2030` — a visual-novel/media-franchise project.
Two halves share the repo:

1. **The game**: `game/` — a Monogatari-engine VN that must ship as a
   single folder that runs by double-clicking `index.html`. **No server. No
   CDN. No runtime `fetch()`. Ever.**

   > **`game/` is the live product, not `cyber-nexus/`.** `cyber-nexus/` is the
   > earlier reference build (7 labels, no mecha skin) and is effectively
   > frozen — it was last touched before the current UI work began. Everything
   > shipping lives in `game/`: 17 story labels, the route atlas, the archives
   > codex and the 2.5D mecha skin (`vendor/mecha-ui.{css,js}`). Read
   > [`design/MECHA_UI.md`](design/MECHA_UI.md) before touching the UI — it
   > documents the engine traps that have already cost several sessions.

2. **The asset set**: `backgrounds/`, `characters/`, `cg/`, `references/`,
   `plans/`, `archives/` — AI-generated art and snapshots. These are the
   product; they stay tracked in Git on purpose.

Design canon: `ai_agent_docs/SEIRIN_Design_Document_edited.md` (Russian), image
prompts in `ai_agent_docs/IMAGE_PROMPTS.md`.

## Environment

Before planning work, read
[`ai_agent_docs/ARENA_ENVIRONMENT.md`](ai_agent_docs/ARENA_ENVIRONMENT.md) —
sandbox capabilities and limits, verified rather than assumed. The ones that
most often cause a wasted turn:

- Bash egress is **allowlisted**: pypi/npm/GitHub work, general web does not.
  `curl` cannot fetch a docs page, and `raw.githubusercontent.com` is blocked.
- **No Python packages are preinstalled** and system `pip` is PEP 668-blocked.
  Use a venv (the art matting tools need Pillow + numpy; dev-only, never shipped).
- Each bash call is a fresh non-interactive shell: `cd`, env vars and background
  jobs do not persist, and stdin is closed. Default timeout 30s, max 1800s.
- Only `/home/user` persists — `/tmp` does not, and `build/`, `dist/`, `out/`,
  `node_modules/`, `.venv/` are never captured.

## Non-negotiable invariants (will fail tests if broken)

- **Offline purity**: every resource referenced by `game/index.html`
  must be a relative local path. No `http(s)://` links, no CDN tags, no Google
  Fonts, no `service-worker` registration, no `fetch`/XHR/WebSocket calls.
  Engine settings must keep `'ServiceWorkers': false` and `'Preload': false`.
- **Icons come only from `vendor/icons-offline.css`** — the vendored
  `monogatari.css` has FA class names but no icon font; a CDN link is NOT the
  fix. Add new icons by extending the glyph map (CSS + `KNOWN_ICONS`).
- **All story state mutation goes through `FailSafe.vn`** (`vendor/failsafe.js`):
  `vn.reversible()` / `vn.goTo()` / `vn.choiceEffect()` / `vn.branch()`.
  Never ship a bare `function(){...}` script step, an `onChosen` without
  `onRevert`, or a Conditional without a `False` arm. `vn.lintScript()` runs
  on every boot and reports violations as console errors.
- Keep `id="vn-root"` on the container (never `id="monogatari"` — the DOM
  global hijacks the engine object).
- **A sprite that leaves mid-scene needs the exit override in
  `custom-ui.css`** (`[data-visibility="invisible"].animated`). The mecha skin
  pins `animation: none` on sprites, which also cancels the engine's exit
  animation — without the override `hide character X with fadeOut` leaves a
  ghost `<img>` until the next `show scene`. Measured in Chromium; the balcony
  cat (`story/nyan.js`) is the regression case.

## Commands

```bash
# The shipping game lives in game/. Expect 67 passing tests.
node game/tests/es5-scan.mjs game/vendor/game.js        # ES5 shape of shipped JS
node game/tests/es5-scan.mjs game/vendor/mecha-ui.js
node --test game/tests/game.test.mjs \
             game/tests/failsafe.test.mjs \
             game/tests/icons-offline.test.mjs          # -> 67 pass, 0 fail

# Offline smoke test of the real page over file:// (dev-only jsdom)
cd game && npm i jsdom --prefix . --no-save --silent
REQUIRE_JSDOM=1 node tests/offline-smoke.mjs            # -> SMOKE PASSED

# Screenshots are JPEG-only in Git (see design/MECHA_UI.md, session 5)
CHROMIUM_PATH=/tmp/cbin/chromium node design/tools/shrink-shots.mjs

# The older reference build keeps its own suite:
node --test cyber-nexus/tests/failsafe.test.mjs cyber-nexus/tests/icons-offline.test.mjs
```

**After any merge that touches `game/`, sanity-check that nothing was silently
reverted** — a bad merge once deleted 1,292 lines while reporting success:

```bash
wc -l game/vendor/game.js     # expect ~1000, NOT ~170
node --test game/tests/game.test.mjs   # expect 27 pass
```

There is no build step. Do not add npm/bundler tooling to the game folder;
new vendor code must be plain ES5-compatible browser JS with zero deps.

## Code conventions

- Game code (story script, HUD, codex, route atlas, boot) lives in
  `game/vendor/game.js`, not in an inline `<script>`. `index.html` is
  markup + CSS only. Editing rules for the story script are encoded as
  machine-checkable comments in `vendor/game.js` — keep them accurate when you
  change behavior.
- UI skin: `game/vendor/mecha-ui.css` + `mecha-ui.js`, loaded **last** so they
  win the cascade over `custom-ui.css`. The JS half is read-only with respect
  to game state — it injects decoration, measures layout and reacts to state,
  but never mutates it. Same ES5/no-dependency rules as the rest of `vendor/`.
- `vendor/failsafe.js`: ES5, UMD (`window.FailSafe` + `module.exports`), no
  dependencies, every public function documented in the header block.
- Docs/prompts for AI agents go in `ai_agent_docs/`; ready-to-load Agent
  Skills (SKILL.md format) in `ai_agent_docs/skills/`.

## Asset & archive workflow

- **Character art**: load the `seirin-character-art` skill
  (`ai_agent_docs/skills/seirin-character-art/`) before designing or generating
  any character asset. Its `OPERATIONS.md` (never destroy committed work, generation discipline) are
  binding and outrank this file** for art work; `CONSTRAINTS.md` indexes both
  and gives the precedence order. `assets/cast.json` is the single source of
  truth for the cast; `briefs/<id>.md` is the art-direction brief per character
  (generator prompts are written by a separate prompt agent into the brief's
  handoff block). There is no linter — an unanswered brief is the gate, and a
  human reviews the safety rules on every character.
- **Save every prompt you send.** Character prompts and their result notes live
  in `characters/<id>/prompts/` and are committed alongside the art — they are
  part of the product. Work-in-progress generations go in `characters/*/_wip/`
  and are not committed.
- Generated art lands in `backgrounds/`, `characters/`, `cg/` or `references/`;
  after a generation session run
  `./tools/archive_and_commit_assets.sh "what changed"` — it tars the asset
  dirs into `archives/`, checksums them, and commits.
- Do not commit OS junk or tooling caches (see `.gitignore`). Do not `.gitignore`
  the asset dirs; they are intentional.

## Security

- Never commit tokens/credentials. `tools/commit_and_push_asset.sh` reads
  `GITHUB_TOKEN` from the environment only — keep it that way.
