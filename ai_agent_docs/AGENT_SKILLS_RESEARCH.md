# Agent skill docs & project-relevant prompts — research notes

Collected for the Seirin project so future AI agents (and humans directing
them) know which external conventions this repo follows and which docs matter.
Summaries here are distilled from public documentation found on 2026-07-25;
follow the links for the living versions.

---

## 1. AGENTS.md — the "README for AI agents" (used at repo root)

**What it is.** An open, tool-agnostic Markdown file at the repository root
containing operational instructions for coding agents — setup, commands, code
style, testing, invariants, security. It was proposed by OpenAI (Aug 2025),
formalized with Google/Cursor/Factory/Sourcegraph, donated to the Linux
Foundation's Agentic AI Foundation, and is read natively by Codex, Cursor,
GitHub Copilot, Gemini CLI, Aider, Windsurf, Zed, Devin, Amp, Factory, Jules,
VS Code and 20+ other tools.

Best practices (distilled):
- Plain Markdown, no mandatory schema; organize with headers/lists.
- Lead with **exact, copy-pasteable commands** (setup, build, test — ideally
  file-scoped test commands), then code style, testing rules, security.
- State **prohibited patterns** explicitly — agents follow explicit
  constraints far better than inferred ones.
- Start at 20–30 lines, grow from real failures. Per-directory AGENTS.md files
  override the root one for monorepos.
- Some older tools use CLAUDE.md / .cursorrules — symlink them to AGENTS.md if
  that ever matters here.

**Seirin uses it** as `/AGENTS.md` with the project's non-negotiable
invariants (offline purity, FailSafe.vn mutation routing, vendored-assets
policy).

Sources:
- https://agents.md (canonical site)
- https://tessl.io/blog/the-rise-of-agents-md-an-open-standard-and-single-source-of-truth-for-ai-coding-agents/
- https://kilo.ai/docs/customize/agents-md
- https://www.productbuilder.net/learn/agent-config-files
- https://gist.github.com/0xfauzi/7c8f65572930a21efa62623557d83f6e

---

## 2. Agent Skills / SKILL.md — packaged capabilities (used in ai_agent_docs/skills/)

**What it is.** Anthropic's Agent Skills format (late 2025), now an open
standard at https://agentskills.io and read by many agents: a **folder** named
after the skill, containing a `SKILL.md` (required) plus optional `scripts/`,
`references/`, `assets/`. Adopters listed by the spec site include GitHub
Copilot, Cursor, OpenAI Codex, Gemini CLI, Goose, Roo Code, VS Code and more.

Format rules that matter:
- `SKILL.md` = YAML frontmatter + Markdown body. Only **two required fields**:
  - `name` — kebab-case, ≤64 chars, must equal the folder name;
  - `description` — ≤1,024 chars; states WHAT the skill does and WHEN to use
    it (this text alone drives agent triggering — include trigger keywords).
- Optional frontmatter: `license`, `compatibility`, `metadata`,
  `allowed-tools`. Unknown fields are ignored → skills stay portable.
- **Progressive disclosure**: agent loads name+description first, the body on
  activation (~≤500 lines / ~5,000 tokens recommended ceiling), and
  `references/` files only on demand. Push rare detail into references.
- Authoring guidance: numbered steps, concrete code templates over prose,
  specify edge cases and what to skip; use forward slashes in paths.

**Seirin uses it** for two skills:
- `skills/monogatari-offline-vn/` — offline-VN engine rules.
- `skills/seirin-character-art/` — character design and sprite production.
  Follows the same spec: `SKILL.md` under 500 lines with the five design
  levers and the workflow, detail pushed into `references/` (design canon,
  prompt grammar, sprite spec, appeal/safety, QA, sources) loaded on demand,
  and per-character art-direction briefs in `briefs/`. It ships NO validator
  scripts: two were written and then deleted, because a linter over a
  hand-written question file only restates what an editor already sees, and a
  passing structural check invites the belief that the safety rules were
  verified when they were not. Only `tools/check_matte.py` survives, because
  it measures pixel values a human cannot eyeball.
  Adds hard-limit documents that declare their own precedence over the rest of
  the skill: `LEGAL.md` (liability — depiction of minors, IP, disclosure) and
  `OPERATIONS.md` (repository and workflow), indexed by a one-page
  `CONSTRAINTS.md`. Splitting them matters because the two have different
  audiences and review cadences: legal limits are reviewed by a human and change
  with law and platform policy, operational limits accrete from incidents. A
  pattern worth reusing for any skill an autonomous agent runs unsupervised,
  since it gives the agent one short file to check before acting rather than
  inferring limits from scattered prose. Its
  design grammar is distilled from the professional Japanese character-design
  literature and Chinese gacha production practice — citations and fetchable
  links in that skill's `references/sources.md`.

Sources:
- https://agentskills.io (spec)
- https://github.com/anthropics/skills (official repo; also `/plugin marketplace add anthropics/skills`)
- https://deepwiki.com/anthropics/skills/2.2-skill.md-format-specification
- https://agentman.ai/blog/build-your-first-agent-skill-skillmd-anatomy
- https://strapi.io/blog/what-are-agent-skills-and-how-to-use-them
- https://localskills.sh/blog/anthropic-skills-explained

---

## 3. Monogatari engine documentation that governs this project

The game's invariants come straight from these pages; an agent editing
`cyber-nexus/` should treat them as spec:

- **Functions** (reversible `Function` actions):
  https://developers.monogatari.io/documentation/script-actions/javascript —
  bare JS functions can't be reverted, block Back, and "give the impression of
  a bug"; use `{'Function': {'Apply': ..., 'Revert'/'Reverse': ...}}` so
  rollback works. (This repo wraps them: `FailSafe.vn.reversible()`.)
- **Choices**:
  https://developers.monogatari.io/documentation/script-actions/choices —
  `onChosen` **requires** `onRevert` or the choice is non-reversible; rewound
  stats otherwise stay applied. (Wrapped by `FailSafe.vn.choiceEffect()`.)
- **Conditionals**:
  https://developers.monogatari.io/documentation/script-actions/conditionals —
  every branch must be defined; a condition resolving to a missing branch key
  errors. Always ship the `False` arm. (Guaranteed by `FailSafe.vn.branch()`.)
- **Action life cycle**:
  https://developers.monogatari.io/documentation/building-blocks/actions/life-cycle —
  mounting (setup/bind/init), application (willApply/apply/didApply), revert
  cycle (willRevert/revert/didRevert), and onStart/onLoad/onSave/reset events.
- **Placeholders / dynamic actions**:
  https://developers.monogatari.io/documentation/script-actions/placeholder —
  advanced; you become responsible for your own rollback markers.
- **Running without a server** (official README):
  https://github.com/Monogatari/Monogatari — double-clicking index.html works,
  but *"offline support and service workers, asset preloading, and anything
  that loads files through fetch"* need HTTP. Hence this project's pinned
  settings: `ServiceWorkers: false`, `Preload: false`, all assets inline or
  relative, no fetch anywhere — plus `FailSafe.net.guard()` to keep it so.

---

## 4. Failsafe library shortlist (the "why" behind vendor/failsafe.js)

`ai_agent_docs/additionallibs1.md` contains a curated shortlist of safety
libraries for Monogatari projects: built-in reversible primitives first, then
**Zod** (schema validation), **XState** (route/phase state machines),
**ts-pattern** (exhaustive branching), **Immer** (nested updates),
**neverthrow** (explicit Result errors), **Vitest + fast-check** (tests) and
**Dexie** (only if outgrowing built-in storage).

Those are the right picks **when a bundler/npm is available**. This project
ships a no-build, file://-only page, so `cyber-nexus/vendor/failsafe.js`
vendors the smallest useful ES5 form of each — `schema` (zod), `machine`
(xstate), `match` (ts-pattern), `immut` (immer), `result` (neverthrow),
`vn` (Monogatari built-in glue), `net` (offline guard) — with zero
dependencies and `node --test` unit tests. If the project ever moves to a
bundled setup, migrate module-for-module back to the originals.

---

## 5. Prompt assets already in this repo

- `IMAGE_PROMPTS.md` — the full image-generation prompt set (backgrounds,
  Splash character, artifact-cleanup edit prompts; English prompts inside
  Russian explanations). Reuse its preamble block for any new background.
- `SEIRIN_Design_Document_edited.md/.docx` — world/character/tone canon for
  writing prompts (sections 4–6: tech base, factions, characters; section 10:
  visual & sound language).

**Filled since**: character art is now driven by per-character briefs in
`skills/seirin-character-art/briefs/`, derived from a validated cast registry.
The briefs carry design intent and acceptance criteria; generator prompts are
written into their handoff blocks by a separate prompt agent, so art direction
and prompt engineering stay independently ownable. `IMAGE_PROMPTS.md` remains the source for
*backgrounds* and the artifact-cleanup edit prompt.

**Gap worth filling later**: a writing-prompt pack for *script/dialogue*
generation (tone rules from design doc §1, §10, per-character voice cards from
§6). The character registry already carries each character's logline, role and
banned list, so a voice-card skill could derive from the same source of truth.
