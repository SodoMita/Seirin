# Harness fixes — task brief for the next agent

**Read this with `HARNESS_REVIEW.md`** (same directory), which contains the
evidence and repro commands for every claim below. This file is the actionable
list only.

**Context you need:** the art-agent harness is
`ai_agent_docs/skills/seirin-character-art/` (SKILL / CONSTRAINTS / LEGAL /
OPERATIONS + `references/`, `briefs/`, `assets/cast.json`, `scripts/`) plus the
asset scripts in `tools/`. An audit found the harness's documented enforcement
and its actual code have diverged badly. Nothing has been fixed yet — this is a
fresh start on a clean tree.

**Before you touch anything:** `OPERATIONS.md` §1 and §7 are binding. Never
delete or overwrite committed work without asking. Tasks below are tagged:

- **[MECHANICAL]** — safe to do now, no owner input needed.
- **[ASK FIRST]** — requires a decision from the project owner. Stop and ask.

Work in the listed order; 1–3 are actively losing work.

---

## 1. [MECHANICAL] `tools/archive_and_commit_assets.sh` stages nothing

**Bug.** Line 28 lists `SEIRIN_Design_Document_edited.md` / `.docx` at the repo
root. They live in `ai_agent_docs/`. An unmatched pathspec aborts the **whole**
`git add` (exit 128); `2>/dev/null || true` hides that from `set -euo pipefail`;
the script then finds an empty index and prints a success-shaped message with
exit 0. This is the command AGENTS.md, SKILL.md, OPERATIONS.md §2 and
`references/qa-checklist.md` all mandate after every generation session.

Also: `cg/` (29 files) appears in neither the `find` nor the `git add`, despite
AGENTS.md naming it as a destination for generated art.

**Fix.** Replace line 14 (the `find`) so it includes `cg`:

```bash
mapfile -d '' FILES < <(find backgrounds characters cg plans references -type f \
  \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.svg' \) \
  -print0 2>/dev/null | sort -z)
```

Update the error string on line 16 to match. Then replace line 28 with:

```bash
# Only add paths that exist: one missing pathspec aborts the entire `git add`.
ADD_PATHS=()
for p in backgrounds characters cg plans references tools archives \
         ai_agent_docs/SEIRIN_Design_Document_edited.md \
         ai_agent_docs/SEIRIN_Design_Document_edited.docx; do
  [[ -e "$p" ]] && ADD_PATHS+=("$p")
done
git add -- "${ADD_PATHS[@]}"     # no `|| true`: a real failure must stop the script
```

**Verify** (must print the new file, and must exit non-zero on a broken add):

```bash
cd "$(mktemp -d)" && git init -q . && mkdir -p backgrounds characters cg plans references tools archives
cp ~/Seirin/tools/archive_and_commit_assets.sh tools/
git add -A && git -c user.email=a@b -c user.name=a commit -qm init
echo new > characters/brandnew.png && echo new > cg/evt.png
bash tools/archive_and_commit_assets.sh "test"
git ls-files | grep -E 'brandnew|evt'   # BOTH must appear
```

---

## 2. [MECHANICAL] `tools/commit_and_push_asset.sh` pushes to `main`

**Bug.** Line 38 is `git push origin HEAD:main`. `OPERATIONS.md` §1 says *"Work
only on the branch assigned to the session. Never switch, create or push to
another branch."* The harness's own push helper breaks the harness's own rule,
and bypasses review by pushing straight to the default branch.

**Fix.** Capture the branch before cloning; never hardcode. Add after the
`REPO_URL` line:

```bash
SRC_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
BRANCH="${TARGET_BRANCH:-$SRC_BRANCH}"
: "${BRANCH:?Set TARGET_BRANCH, or run from inside the session checkout}"
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  echo "Refusing to push to $BRANCH — OPERATIONS.md section 1. Set TARGET_BRANCH." >&2
  exit 1
fi
```

Then `git clone --depth 1 --branch "$BRANCH" …` and `git push origin "HEAD:$BRANCH"`.

---

## 3. [ASK FIRST] Reconcile the broken archive state

Already-committed wreckage caused by task 1. **Do not delete anything until the
owner confirms** — these are tracked files and OPERATIONS.md §1 applies.

Present state (verified):

- **8 orphaned `.sha256` files** in `archives/`, all tracked, whose `.tar.gz`
  targets do not exist and were **never committed**
  (`seirin_visual_assets_20260725_{153200,153533,153553,154002,155037,155627,160845,161627}.tar.gz.sha256`).
  Confirm with `git log --all --diff-filter=A -- 'archives/seirin_visual_assets_*.tar.gz'`
  → empty.
- **`archives/LATEST_ARCHIVE.txt`** points at
  `archives/seirin_visual_assets_20260725_161627.tar.gz`, which does not exist.
- **`archives/project_latest.bundle`** contains `74e03ee` on `refs/heads/master`,
  a commit unreachable in this repo. It verifies as a valid bundle but is a
  disconnected history — useless for the recovery it advertises.

Recommend (pending approval): delete the 8 orphaned checksums, regenerate
`LATEST_ARCHIVE.txt` from a fresh archive once task 1 is fixed, and regenerate or
remove the bundle. The one archive written by `store_new_asset.sh`
(`20260725_164258_splash_stage5…`) is intact and verifies — leave it.

---

## 4. Make the documentation's claims true

Every item here is a doc that asserts a check exists when it does not. **Either
implement the check or delete the claim — deleting is a legitimate fix** and is
better than leaving a false statement that retires an agent's vigilance. Ask the
owner which, per item, if unsure.

### 4a. [ASK FIRST] The Ryuki ichthyosis guard does not exist

`CONSTRAINTS.md:51` and `LEGAL.md` §2 both state `check_roster.py` errors if
Ryuki's ichthyosis guard is removed. `grep -rniE "ryuki|ichthy|scale|gore|wound"
scripts/` returns nothing. Verified: approving Ryuki with
`boundaries: "never sexualised; render ichthyosis as reptile scales, wounds and gore"`
**passes with exit 0**.

This is a dignity/safety guard, so recommend **implementing** rather than
deleting the claim. Requires a `cast.json` field to check against — see task 5,
and coordinate so both land together.

### 4b. [MECHANICAL] "Verified by negative test" is unfounded

`CONSTRAINTS.md:54` — there is no test file for the skill validators
(`scripts/` holds only the two checkers). Fix by doing task 6, then the sentence
becomes true. Until then it must not stay as-is.

### 4c. [MECHANICAL] `references/qa-checklist.md:17-19` lists 5 phantom checks

Claims `check_roster.py` validates: required fields ✅, **unique silhouette
classes ❌, hex validity ❌, roster differentiation ❌, expression coverage ❌,
banned-list presence ❌**, minor-safety flags ✅ (partially — task 5).

Same file credits `check_assets.py` with *"alpha presence and **straightness**"* —
there is no straight-vs-premultiplied check. Rewrite the paragraph to describe
only what the code does.

### 4d. [MECHANICAL] `SKILL.md:122` asserts differentiation is enforced

*"any two characters differ in at least two of {silhouette class, dominant hue,
shape majority, head-ratio band}. **Enforced by `scripts/check_roster.py`**."*
Verified: appending an exact duplicate of `reika` passes. None of those four
fields even exist in `cast.json` (see task 7). Delete the "Enforced by" clause or
implement it after task 7 restores the fields.

### 4e. [MECHANICAL] Dead cross-references in the safety chain

- `SKILL.md` non-negotiable #4 cites **"Design canon §11"** for the minors rule.
  `references/design-canon.md` has §1–§5 plus two unnumbered headings. No §11.
- `OPERATIONS.md` §4 cites **"design canon §2.1"** for no-real-supernatural. §2
  is "The memory point".

Repoint both at real sections (the minors material is in
`references/appeal-and-safety.md`).

### 4f. [MECHANICAL] `SKILL.md` frontmatter over-promises

`description` advertises *"ready-to-send prompts per character"*. Zero briefs
contain a prompt card (`grep -l FORMAT briefs/*.md` → 0), and the body says
*"Writing generator prompts is a separate agent's job."* Frontmatter decides
whether the skill loads for a task, so this pulls it into work it refuses to do.
Remove that phrase.

Also: SKILL.md says briefs *"leave a handoff slot"* — `grep -in handoff briefs/`
finds none. Either add the block to the brief template or drop the sentence.

### 4g. [MECHANICAL] `ai_agent_docs/ART_PIPELINE_NEXT.md` maps a different repo

Its header claims it stays authoritative for CGs, then references
`public/generated/cgs/…` and `src/content/story-data.ts` — neither exists here
(CGs live in `cg/`). Correct the paths or mark the section obsolete.

---

## 5. [ASK FIRST — schema change] Harden the minor-safety gate

`scripts/check_roster.py:100-113` is the only automated child-safety check in the
project. It works in the obvious case but is bypassable four ways (all verified):

| Bypass | Result |
|---|---|
| `boundaries: "sexualised content is permitted for this character"` | **passes** — substring test, polarity-blind |
| `"age": "5"` (string) | gate skipped, exit 0 |
| `age` key deleted | gate skipped, exit 0 |
| `age: 5` → `age: 18` | gate skipped, exit 0 |

Plus: `age` is **not in `REQUIRED_META`**, and `boundaries` is **not a
`question_template` section** — so no brief and no questionnaire ever asks for
it, and it escapes both the `missing_sections` and `blank` completeness checks.
`briefs/miya.md` (age 5) has no safety section at all.

**Proposed fix — needs owner sign-off because it changes `cast.json` schema:**

1. Add `"age"` to `REQUIRED_META`, and error if `age` is present but neither
   `int` nor `null`. `splash`/`aster7`/`stella` are legitimately `null`
   (non-human) — for those require a non-null `age_coding` instead.
2. Add a structured, un-invertible field per character that prose cannot flip:

   ```json
   "safety": { "sexualisation": "prohibited", "notes": "free text" }
   ```

   Gate on `safety.sexualisation == "prohibited"` (exact match) for every
   character that is a minor by `age` **or** minor-coded by `age_coding`.
3. Add `boundaries` to `question_template` so it is asked in every brief and
   covered by the completeness checks.
4. Keep the keyword scan as a *secondary* warning, but make it negation-aware
   (flag `permitted`, `allowed`, `except`, `unless` near a term).
5. Regenerate the 14 briefs so minors carry a visible safety section.

Task 4a (Ryuki) fits here as a sibling field, e.g.
`"depiction_guards": ["no wounds", "no gore", "no reptile scales"]`, checked for
presence on `ryuki`.

---

## 6. [MECHANICAL] Add `scripts/test_validators.py`

This is the artifact `CONSTRAINTS.md:54` already claims exists. Zero
dependencies, runnable as `python3 scripts/test_validators.py`. It must cover, at
minimum, the negative cases proven in `HARNESS_REVIEW.md` — each builds a mutated
copy of `cast.json` in a tempfile and asserts a **non-zero** exit:

1. approved minor with no `boundaries` → currently passes ✅ (keep as regression)
2. approved minor with inverted boundaries text → **currently fails to catch**
3. minor `age` as string `"5"` → **currently fails to catch**
4. minor `age` deleted → **currently fails to catch**
5. minor `age` edited to `18` → **currently fails to catch**
6. Ryuki with wounds/gore/reptile-scale text → **currently fails to catch**
7. exact duplicate character appended → **currently fails to catch**
8. `banned` list absent → **currently fails to catch**

Write the tests first; 2–8 should fail against today's code. They are the
acceptance criteria for tasks 4a, 4d and 5.

---

## 7. [ASK FIRST] `cast.json` v2.0.0 has lost fields the binding docs still cite

Character records contain only: `age, age_coding, answers, approved, faction, id,
name_en, name_ja, questionnaire_answered, role`. Missing but cited as
authoritative:

| Field | Cited by | Why it matters |
|---|---|---|
| `banned` | SKILL.md non-negotiable #3, OPERATIONS.md §4 | *"a hard filter, copied verbatim into the exclusion section of every prompt"* — an agent told to copy it finds nothing, and must either invent one (violating non-negotiable #1) or ship prompts with no exclusions |
| `style_bible` | LEGAL.md §3 | offered as **the** mitigation for artist-name prompting: *"exists so no artist name is ever needed"* — the rule stands, its alternative is gone |
| `appeal_track` | LEGAL.md §6 | escalation trigger |
| `shape_language`, `visual_density` | OPERATIONS.md §4 | anti-convergence |
| `negative_space`, `secondary_hook` | SKILL.md levers 1–2 | |

`SKILL.md` frontmatter says `version: 1.1.0`; `cast.json` says
`schema_version: 2.0.0`. The prose was never migrated.

**These cannot be filled by an agent** — non-negotiable #1 forbids inventing
design answers. Ask the owner to supply `banned` and `style_bible` at minimum, or
approve amending LEGAL.md / OPERATIONS.md / SKILL.md to stop citing them.

---

## 8. [MECHANICAL] Fix validator gate semantics

All in `scripts/check_assets.py`.

**8a. Spec-compliant turnarounds hard-error.** Line 112,
`m = NAME_RE.match(name) or SHEET_RE.match(name)`: `NAME_RE` matches
`ren_sheet_turnaround.png` first as `id=ren, variant=sheet, expr=turnaround`, so
the sheet is treated as a sprite and errors with *"sprite has no alpha channel
(mode RGB)"* — but `references/sprite-spec.md:11` requires turnarounds to be flat
RGB on `#00B140` and never matted. The dedicated branch at line 168 is
unreachable for that case. Fix:

```python
sheet_m  = SHEET_RE.match(name)
sprite_m = None if sheet_m else NAME_RE.match(name)
m = sheet_m or sprite_m
```

and use `sprite_m` everywhere the code currently re-runs `NAME_RE.match(name)`.

**8b. `--strict` is inert where it matters.** Line 179 `if not have: continue`
skips the missing-expression check for characters with **zero** assets — the
gate is disabled exactly when the work has not been done. Verified:
`--strict` on the real tree exits 0 with all 14 characters unstarted. Under
`--strict`, emit an error instead of a note.

**8c. Missing Pillow silently removes the best check.** The opaque-alpha
detector — the one that catches the flattened-plates failure the docs warn about
most — is Pillow-gated, and `ARENA_ENVIRONMENT.md` says no packages are
preinstalled. So the documented invocation degrades to a `note` and exits 0.
Under `--strict`, absent Pillow must be a non-zero exit.

**8d. Warnings never affect exit code.** Line 203 `return 1 if errors else 0`.
The current tree yields **35 warnings, exit 0** — every file in `characters/`
violates the naming convention and CI still sees green. Add `--warnings-as-errors`
(and use it in the QA checklist), or promote convention violations to errors.

**8e. Crash on malformed registry.** Line 82 `reg["characters"]` raises an
uncaught `KeyError` traceback, though `OSError`/`JSONDecodeError` are handled two
lines above. `check_roster.py` handles this gracefully; match it.

---

## 9. [MECHANICAL] Matting tool safety

**9a. Swapped plates silently produce an opaque sprite.**
`tools/triangulate_matte.py` computes `alpha = 1 - (W - B)`. Pass the plates in
the wrong order and `W - B` goes negative, alpha clamps to 1.0 everywhere, and
the tool writes a fully-opaque PNG with **exit 0 and no warning** — identical to
the flattened-plates failure. Add before the alpha computation:

```python
if float(np.mean(b - w)) > 0.01:
    raise SystemExit(
        "Plates look swapped: the 'black' plate is brighter than the 'white' one. "
        "Usage: triangulate_matte.py <white> <black> <out>")
```

and print the non-opaque pixel fraction so a silent failure is visible.

**9b. No dependency guard.** `python3 tools/triangulate_matte.py` gives a bare
`ModuleNotFoundError: No module named 'numpy'`. Given the documented environment
ships no packages, that traceback is every agent's first contact. Wrap the
imports and point at the venv instructions in `ai_agent_docs/ARENA_ENVIRONMENT.md`.

---

## 10. [MECHANICAL] Enforce "save every prompt"

It is SKILL.md non-negotiable **#2**, OPERATIONS.md **§5** and CONSTRAINTS.md
short-version **#5**, with an exact path
(`characters/<id>/prompts/NN_<stage>.txt` + `.result.md`). No validator checks it.
`characters/` has **0 subdirectories** and 37 flat files — it has never once been
followed. The rule's own stated motivation sits in the same directory:
`splash_water_character_reference_v2 … v11`, the *"eleven unexplained Splash
versions"* SKILL.md cites.

Add to `check_assets.py`: any committed asset for `<id>` with no
`characters/<id>/prompts/` entry is a warning (error under `--strict`).

---

## Verification before you commit

```bash
python3 ai_agent_docs/skills/seirin-character-art/scripts/check_roster.py
python3 ai_agent_docs/skills/seirin-character-art/scripts/check_assets.py characters/
python3 ai_agent_docs/skills/seirin-character-art/scripts/test_validators.py   # after task 6
node --test cyber-nexus/tests/failsafe.test.mjs cyber-nexus/tests/icons-offline.test.mjs
git status --short          # no unexplained deletions
git diff --cached --stat    # no existing asset or tool rewritten
```

Report honestly which of these ran and which did not (OPERATIONS.md §6). Several
tasks above exist precisely because that did not happen last time.

## Do not "fix" these — they are correct

- The precedence model (LEGAL > OPERATIONS > AGENTS > SKILL > references >
  briefs) and its stop-and-report rule.
- `LEGAL.md`'s substance — jurisdiction table, "generating and storing can be
  sufficient", the SynthID/provenance section, the refusal instruction.
- The opaque-alpha and "effectively binary alpha" detectors in
  `check_assets.py` — verified working, keep them.
- The questions-not-answers registry design and non-negotiable #1.
- The 60-30-10 correction in `d389a0d` — no stale prescriptions remain.
