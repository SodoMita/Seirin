# AGENTS.md — Seirin

Instructions for AI coding agents working in this repository. Read this before
making changes. (Tool-agnostic [AGENTS.md](https://agents.md) format; deeper
skill docs live in `ai_agent_docs/`.)

## What this is

`Seirin: Night Shift — Resonance 2030` — a visual-novel/media-franchise project.
Two halves share the repo:

1. **The game**: `cyber-nexus/` — a Monogatari-engine VN that must ship as a
   single folder that runs by double-clicking `index.html`. **No server. No
   CDN. No runtime `fetch()`. Ever.**
2. **The asset set**: `backgrounds/`, `characters/`, `cg/`, `references/`,
   `plans/`, `archives/` — AI-generated art and snapshots. These are the
   product; they stay tracked in Git on purpose.

Design canon: `ai_agent_docs/SEIRIN_Design_Document_edited.md` (Russian), image
prompts in `ai_agent_docs/IMAGE_PROMPTS.md`.

## Non-negotiable invariants (will fail tests if broken)

- **Offline purity**: every resource referenced by `cyber-nexus/index.html`
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

## Commands

```bash
# Failsafe + icon-shim unit tests — zero dependencies
node --test cyber-nexus/tests/failsafe.test.mjs cyber-nexus/tests/icons-offline.test.mjs

# Offline smoke test of the real page over file:// (dev-only jsdom;
# install with `npm i jsdom` into cyber-nexus/node_modules — gitignored)
node cyber-nexus/tests/offline-smoke.mjs

# Full browser rollback regression (optional; needs playwright + chromium)
python3 cyber-nexus/tests/test_rewind.py
```

There is no build step. Do not add npm/bundler tooling to the game folder;
new vendor code must be plain ES5-compatible browser JS with zero deps.

## Code conventions

- Editing rules for `cyber-nexus/index.html` are encoded as machine-checkable
  comments in the file itself — keep them accurate when you change behavior.
- `vendor/failsafe.js`: ES5, UMD (`window.FailSafe` + `module.exports`), no
  dependencies, every public function documented in the header block.
- Docs/prompts for AI agents go in `ai_agent_docs/`; ready-to-load Agent
  Skills (SKILL.md format) in `ai_agent_docs/skills/`.

## Asset & archive workflow

- Generated art lands in `backgrounds/`, `characters/`, `cg/` or `references/`;
  after a generation session run
  `./tools/archive_and_commit_assets.sh "what changed"` — it tars the asset
  dirs into `archives/`, checksums them, and commits.
- Do not commit OS junk or tooling caches (see `.gitignore`). Do not `.gitignore`
  the asset dirs; they are intentional.

## Security

- Never commit tokens/credentials. `tools/commit_and_push_asset.sh` reads
  `GITHUB_TOKEN` from the environment only — keep it that way.
