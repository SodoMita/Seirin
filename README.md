# Seirin

Visual-novel project assets and design documents for **Seirin: Night Shift — Resonance 2030**.

## Directories
- **`game/` — the shipping visual novel.** Double-click `game/index.html`; runs
  with no server, no CDN and no runtime fetch. Story arcs live in `game/vendor/story/`
  (prologue, procrastination, the anime descent, Miya, AI, Momo — plus one
  hidden beat, `nyan.js`) and are assembled by the small
  engine/UI bootstrap in `game/vendor/game.js`. The route atlas is runtime-generated
  with jump-to-node, an archives codex, and a 2.5D skeuomorphic mecha UI
  (`vendor/mecha-ui.css` + `mecha-ui.js`). UI design notes, engine traps and
  session history: [`design/MECHA_UI.md`](design/MECHA_UI.md).
- `design/` — UI art direction (`concepts/`), reference screenshots
  (`preview/shots/`, JPEG only) and `tools/shrink-shots.mjs`.
- `cyber-nexus/` — older runnable Monogatari example VN, kept for reference ("Cyber-Nexus: The Static Singularity"). **Runs with no server, no CDN and no runtime fetch**: double-click `index.html`. Game code lives in `vendor/game.js` (story script, HUD, codex, mini-game); guarded by `vendor/failsafe.js` (schema validation, rollback-safe mutations, state machine, lint, no-fetch guard) and `vendor/icons-offline.*` (local icon glyphs — no font CDN).
- `backgrounds/` — generated scene backgrounds
- `characters/` — character references and iterations
- `cg/` — event CG art
- `references/` — source reference crops
- `plans/` — apartment and location plans
- `archives/` — small asset archives, checksums and portable Git bundle
- `tools/` — local asset storage scripts
- `ai_agent_docs/` — design doc, image prompts, agent-skill research, and loadable Agent Skills (`skills/`)
  - `skills/seirin-character-art/` — character design + sprite production skill:
    hard limits (`LEGAL.md`, `OPERATIONS.md`, indexed by `CONSTRAINTS.md`),
    the cast registry (`assets/cast.json`),
    per-character art-direction briefs (`briefs/`), design grammar, sprite spec,
    iteration loop; matting tools live in `tools/`
  - `skills/monogatari-offline-vn/` — offline VN engine rules

## For AI agents
**Start at [`AGENTS.md`](AGENTS.md)**, then
[`ai_agent_docs/ARENA_ENVIRONMENT.md`](ai_agent_docs/ARENA_ENVIRONMENT.md)
(sandbox capabilities and limits — allowlisted network, no preinstalled Python
packages, non-persistent shell).

`AGENTS.md` covers project invariants (offline purity,
FailSafe mutation routing, asset policy), commands to run, and conventions.
Research notes on AGENTS.md / SKILL.md standards and the Monogatari docs this
project follows: [`ai_agent_docs/AGENT_SKILLS_RESEARCH.md`](ai_agent_docs/AGENT_SKILLS_RESEARCH.md).

## Quick checks
```bash
# The shipping game (game/) — 67 tests, zero dependencies
node --test game/tests/game.test.mjs game/tests/failsafe.test.mjs game/tests/icons-offline.test.mjs
cd game && npm i jsdom --prefix . --no-save --silent && REQUIRE_JSDOM=1 node tests/offline-smoke.mjs

# The older reference build
node --test cyber-nexus/tests/failsafe.test.mjs cyber-nexus/tests/icons-offline.test.mjs
```
