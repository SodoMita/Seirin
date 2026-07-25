# Seirin

Visual-novel project assets and design documents for **Seirin: Night Shift — Resonance 2030**.

## Directories
- `cyber-nexus/` — runnable Monogatari example VN ("Cyber-Nexus: The Static Singularity"). **Runs with no server, no CDN and no runtime fetch**: double-click `index.html`. Guarded by `vendor/failsafe.js` (schema validation, rollback-safe mutations, state machine, lint, no-fetch guard) and `vendor/icons-offline.*` (local icon glyphs — no font CDN).
- `backgrounds/` — generated scene backgrounds
- `characters/` — character references and iterations
- `cg/` — event CG art
- `references/` — source reference crops
- `plans/` — apartment and location plans
- `archives/` — small asset archives, checksums and portable Git bundle
- `tools/` — local asset storage scripts
- `ai_agent_docs/` — design doc, image prompts, agent-skill research, and loadable Agent Skills (`skills/`)

## For AI agents
**Start at [`AGENTS.md`](AGENTS.md)** — project invariants (offline purity,
FailSafe mutation routing, asset policy), commands to run, and conventions.
Research notes on AGENTS.md / SKILL.md standards and the Monogatari docs this
project follows: [`ai_agent_docs/AGENT_SKILLS_RESEARCH.md`](ai_agent_docs/AGENT_SKILLS_RESEARCH.md).

## Quick checks
```bash
node --test cyber-nexus/tests/failsafe.test.mjs cyber-nexus/tests/icons-offline.test.mjs  # zero-dependency unit tests
node cyber-nexus/tests/offline-smoke.mjs          # file:// boot test (needs dev-only jsdom)
```
