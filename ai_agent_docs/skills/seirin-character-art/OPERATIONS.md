# OPERATIONS — rules that protect the repository and the work

**Binding.** These are not legal limits (see `LEGAL.md`) and not style guidance
(see `SKILL.md` and `references/`). They are the rules whose violation destroys
committed work, breaks the shipped game, or wastes generation budget.

Consequences here are usually immediate and often unrecoverable, which is why
they sit above ordinary workflow advice.

Companion documents: `LEGAL.md` (liability) and `CONSTRAINTS.md` (precedence
and index). For sandbox capabilities and limits — network allowlist, absent
Python packages, shell behaviour — see `../../ARENA_ENVIRONMENT.md`.

---

## 1. Never destroy existing work

- **Never delete or overwrite an existing asset** in `backgrounds/`,
  `characters/`, `cg/`, `references/`, `plans/` or `archives/`. These are
  tracked deliberately — they are the product, not build output. New work gets
  a **new filename**.
- **Never overwrite an existing tool** in `tools/` with a different tool that
  happens to share its name. If the name is taken, pick another.

  > This has already happened once in this project: `composite_over.py`
  > (composite an overlay onto a base) was clobbered by a differently-behaving
  > matte checker. Check `ls tools/` before creating a file there.

- **Never `git push --force`**, rewrite history, amend a pushed commit, or
  delete a branch.
- Work only on the branch assigned to the session. Never switch, create or push
  to another branch.
- Before committing, confirm nothing unexpected is staged:

  ```bash
  git status --short         # no unexplained D (deleted) lines
  git diff --cached --stat   # no existing asset or tool rewritten
  ```

## 2. Repository hygiene

- **Never commit secrets, tokens or credentials.** `GITHUB_TOKEN` is read from
  the environment only.
- **Never `.gitignore` an asset directory.** Only `_wip/`, virtualenvs and
  tooling caches are ignored.
- Never commit a virtualenv, `node_modules/`, `__pycache__/` or generated
  caches.
- Approved assets **and** their prompt files (`characters/<id>/prompts/`) are
  committed — the prompts are part of the product. Rejected iterations stay in
  `characters/*/_wip/` and are not committed.
- Keep generated artifacts within existing conventions. Do not commit
  multi-gigabyte outputs; archive via
  `./tools/archive_and_commit_assets.sh "what changed"`.

## 3. Do not break the shipped game

From `AGENTS.md`, which remains authoritative for `cyber-nexus/`:

- **Offline purity.** No CDN, no `http(s)` asset URLs, no runtime
  `fetch`/XHR/WebSocket, no service worker. Every resource is a relative local
  path. `'ServiceWorkers': false`, `'Preload': false`.
- **No build step.** Do not add npm, a bundler, or any runtime dependency to
  the game folder. `node --test` must pass with zero installs.
- Shipped sprites go under `cyber-nexus/assets/characters/<directory>/` at
  delivery resolution. The 2× masters stay in `characters/` as the asset
  product and do not ship.
- Keep `id="vn-root"` on the container; route story-state mutation through
  `FailSafe.vn`.

Python tooling for art (Pillow, numpy) is **dev-only** and must never become a
dependency of the game.

## 4. Canon integrity

Breaking these produces work that has to be redone.

- **`assets/cast.json` is the single source of truth.** Change a design there
  first, then regenerate the brief. Never let two assets disagree about a
  character.
- **The franchise has no real supernatural effect** (design canon §2.1). Every
  apparent miracle is staged, projected or technological. This is the
  franchise's differentiator.
- **Props the story codes as non-weapons are never weaponised** — a performer's
  microphone, a ceremonial or sporting blade, a costume rig, a toy drone, a
  prosthetic limb, a service robot's manipulators.
- Each character's `banned` list is a hard filter, copied into the exclusion
  section of every prompt for that character.
- Do not "improve" `shape_language` ratios toward the middle, or raise
  `visual_density` to signal importance — both exist to keep the roster from
  converging.

## 5. Generation discipline

Protects budget and keeps refinement cumulative rather than circular. Full loop
in `references/iteration.md`.

- **Save every prompt you send**, verbatim, to
  `characters/<id>/prompts/NN_<stage>.txt` **before** looking at the result,
  with a `.result.md` note recording model, verdict and what to change. A
  prompt that lives only in a chat transcript is lost.
- **Change exactly one thing per attempt.** Two changes and an improvement
  teaches nothing.
- **Never chain expression edits.** Generate every differential from the same
  approved sprite; chaining compounds identity drift.
- **Stop rules.** Three attempts at one stage with no improvement means the
  *design* is wrong, not the prompt — re-read the design card. Five attempts
  total means stop and ask. The same defect twice is not randomness; rephrase
  positively rather than restating the negative harder.
- **Matting:** the difference between the white and black plates *is* the
  alpha. Never ask for "identical character pixels" — that flattens the figure
  and destroys the transparency being measured. See `references/sprite-spec.md`.

## 6. Honest reporting

- Do not report work as complete when a check was skipped. State plainly which
  checks ran and which did not.
- Do not fabricate a test result, a file path, or a command's output.
- If an approach failed, say so and say what was tried. A recorded failure is
  worth more than a silent retry.

## 7. Escalate, do not improvise

Stop and ask the project owner when:

- you are about to delete, rename or overwrite anything already committed;
- a change would break an `AGENTS.md` invariant;
- a design fix would require editing many committed assets;
- an instruction conflicts with this file;
- you are unsure whether something is a rule or a preference — treat it as a
  rule until told otherwise.

## Verification before commit

```bash
python3 ai_agent_docs/skills/seirin-character-art/scripts/check_roster.py
python3 ai_agent_docs/skills/seirin-character-art/scripts/check_assets.py characters/
node --test cyber-nexus/tests/*.test.mjs        # if the game folder was touched
git status --short
git diff --cached --stat
```

Then the safety pass in `references/qa-checklist.md`. A `LEGAL.md` §1 or §2
failure blocks the commit unconditionally.
