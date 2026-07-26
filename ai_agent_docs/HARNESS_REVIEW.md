# Harness review — `seirin-character-art` art agent

Review date: 2026-07-26. Scope: the art-agent harness — the skill at
`ai_agent_docs/skills/seirin-character-art/` (SKILL / CONSTRAINTS / LEGAL /
OPERATIONS, `references/`, `briefs/`, `assets/cast.json`, `scripts/`) and the
asset tooling in `tools/` that the skill mandates.

**Verdict: yes, there are flaws, and the serious ones are structural.**

The harness is well written as prose. The problem is the gap between what it
*says is enforced* and what the code *actually enforces*, plus a mandated commit
path that silently does nothing. An agent that follows this harness exactly, and
reports honestly per OPERATIONS §6, will still produce false completion reports.

Findings are ordered by severity. Every item marked **[verified]** was
reproduced by executing code in this checkout; **[read]** means established by
reading the source.

---

## Severity 1 — the harness makes the agent lie

### 1.1 The mandated commit command stages nothing and reports success **[verified]**

`tools/archive_and_commit_assets.sh:28`

```bash
git add backgrounds characters plans references tools archives \
        SEIRIN_Design_Document_edited.md SEIRIN_Design_Document_edited.docx 2>/dev/null || true
```

Those two document paths do not exist at the repo root — they live in
`ai_agent_docs/`. `git add` aborts the **entire invocation** with exit 128 on an
unmatched pathspec, so *nothing at all* is staged. `2>/dev/null || true` hides
the error from `set -euo pipefail`, the following `git diff --cached --quiet`
finds an empty index, and the script prints:

```
Created archives/seirin_visual_assets_<stamp>.tar.gz; no tracked changes to commit.
```

and exits **0**.

Reproduced in a scratch repo: a brand-new `characters/brandnew.png` was **not
committed**, the script exited 0, and the message read as success.

Why this is the top finding: this is the *single command* AGENTS.md, SKILL.md
("Verification"), OPERATIONS.md §2 and the QA checklist all tell the agent to run
after every generation session. It is the harness's only write path to durable
storage, and it fails open, silently, on the happy path. An agent doing exactly
as instructed will report "assets archived and committed" when nothing was
committed.

Repro:

```bash
git add backgrounds characters plans references tools archives \
        SEIRIN_Design_Document_edited.md SEIRIN_Design_Document_edited.docx
echo $?            # 128
git diff --cached --name-only | wc -l   # 0
```

### 1.2 The damage has already happened, and it is in the tree **[verified]**

`archives/` contains **8 `.sha256` files whose tarballs do not exist**, all of
them tracked in Git:

```
seirin_visual_assets_20260725_153200.tar.gz.sha256   -> target MISSING
… 153533, 153553, 154002, 155037, 155627, 160845, 161627
```

`git log --all --diff-filter=A -- 'archives/seirin_visual_assets_*.tar.gz'`
returns **nothing** — the tarballs were never committed, exactly as §1.1
predicts. `archives/LATEST_ARCHIVE.txt` points at
`archives/seirin_visual_assets_20260725_161627.tar.gz`, a **dangling pointer**.

So the integrity chain is decorative: eight checksums that can never be checked,
and a "latest archive" marker aimed at a file that does not exist. Only the one
archive written by the *other* script (`store_new_asset.sh`) survives and
verifies.

### 1.3 The recovery bundle is a disconnected history **[verified]**

`store_new_asset.sh` advertises the bundle as disaster recovery ("gives recovery
even if the sandbox removes .git metadata"). Actual contents:

```
74e03eeaf30a885dca352c17cda6c6678d59ba83 refs/heads/master
HEAD now: d389a0d8ad4f4923819e252b0a09d7562defe44a
```

`74e03ee` is not reachable in this repository at all — the bundle is a stale,
unrelated history under `refs/heads/master`. It verifies as a valid bundle, so a
casual check passes, but restoring from it would not recover current work.

### 1.4 A harness tool violates a binding harness rule **[read]**

OPERATIONS.md §1: *"Work only on the branch assigned to the session. Never
switch, create or push to another branch."*

`tools/commit_and_push_asset.sh:38`: `git push origin HEAD:main`

The tool hardcodes a push to `main`. Any agent that uses the harness's own
documented push helper breaks the harness's own OPERATIONS rule. (It also
bypasses review entirely by cloning and pushing to the default branch.)

### 1.5 `cg/` is silently excluded from archiving and committing **[verified]**

AGENTS.md: *"Generated art lands in `backgrounds/`, `characters/`, `cg/` or
`references/`; after a generation session run `./tools/archive_and_commit_assets.sh`."*

That script's `find` covers `backgrounds characters plans references` and its
`git add` covers the same set. The string `cg` never appears in the script.
`cg/` currently holds **29 files**. Event CGs are archived by nothing.

---

## Severity 2 — documented enforcement that does not exist

The harness repeatedly tells the agent that a rule is machine-checked. Several
of those checks are absent. This is worse than having no check, because it
retires the agent's vigilance.

### 2.1 The Ryuki ichthyosis guard is claimed as machine-enforced; it is not implemented **[verified]**

CONSTRAINTS.md §"Machine-enforced" (lines 48–54):

> `scripts/check_roster.py` errors — never warns — if: … Ryuki loses the guard
> preventing her ichthyosis being rendered as wounds, gore or reptile scales
> (`LEGAL.md` §2). **Never remove, weaken or disable these checks.**

LEGAL.md §2 repeats it: *"it is enforced by `check_roster.py`."*

Reality — no such code exists:

```bash
grep -rniE "ryuki|ichthy|scale|gore|wound" scripts/    # no matches
```

Negative test: approving Ryuki with
`boundaries: "never sexualised; render ichthyosis as reptile scales, wounds and gore"`
**passes with exit 0**. The string that the guard is supposed to forbid sails
through, because the only thing checked is that the word "sexualis" appears
somewhere.

### 2.2 "Verified by negative test" — there is no test **[verified]**

CONSTRAINTS.md:54: *"Verified by negative test: stripping either entry fails the
run."* There is no test file anywhere for the skill validators
(`scripts/` contains only the two checkers). One of the two claimed negative
tests (§2.1) does not in fact fail. The claim is unfounded for both.

### 2.3 The QA checklist describes five checks that are not in the code **[verified]**

`references/qa-checklist.md:17-19`:

> `check_roster.py` validates the registry: required fields, unique silhouette
> classes, hex validity, roster differentiation, expression coverage,
> banned-list presence, and the minor-safety flags.

Audited against `scripts/check_roster.py`:

| Claimed check | Status |
|---|---|
| required fields | implemented (`REQUIRED_META`) |
| unique silhouette classes | **absent** |
| hex validity | **absent** |
| roster differentiation | **absent** |
| expression coverage | **absent** |
| banned-list presence | **absent** |
| minor-safety flags | implemented (partially — see §3) |

Same file also credits `check_assets.py` with *"alpha presence and
**straightness**"* — there is no straight-vs-premultiplied check in the code.

### 2.4 Roster differentiation is asserted as enforced **[verified]**

SKILL.md:120-123: *"any two characters differ in at least two of {silhouette
class, dominant hue, shape majority, head-ratio band}. **Enforced by
`scripts/check_roster.py`.**"*

Negative test: appending an **exact duplicate** of `reika` (new id only) passes
with exit 0. Nothing about differentiation is computed. The four fields it names
(`silhouette`, `dominant_hue`, `shape_language`, `head_ratio`) are not even
present in `cast.json` — see §4.1.

---

## Severity 3 — the one real safety check is bypassable

`check_roster.py:100-113` is the LEGAL §1 gate: an approved under-18 must carry
an anti-sexualisation statement. It works in the obvious case (**verified**:
approving Miya with no boundaries entry correctly errors). But:

### 3.1 Keyword presence, not meaning — inverted text passes **[verified]**

The test is `any(term in boundary for term in SEXUALISATION_TERMS)` over a
lowercased string. So:

```json
"boundaries": "sexualised content is permitted for this character"
```

**passes.** The gate is satisfied by the presence of the word "sexualis" in any
polarity. A well-intentioned rewrite, a translation, or a careless edit can
invert the meaning while keeping the check green.

### 3.2 Three trivial ways to make a minor stop being a minor **[verified]**

`if isinstance(age, int) and age < 18:`

| Mutation | Result |
|---|---|
| `"age": "5"` (string) | **gate skipped**, exit 0 |
| `age` key deleted | **gate skipped**, exit 0 |
| `age: 5` → `age: 18` | **gate skipped**, exit 0 |

`age` is **not in `REQUIRED_META`**, so it can vanish entirely without any error.
Three characters (`splash`, `aster7`, `stella`) already have `age: null` and are
therefore permanently outside the gate. There is no cross-check of `age` against
any canonical source, so a one-character typo disables the only automated
child-safety check in the project.

### 3.3 `boundaries` is a phantom field nobody is ever asked to fill **[verified]**

The gate reads `answers["boundaries"]`. But `boundaries` is **not a section of
`question_template`**:

```
template sections: colour_zones, costume_plot, ensemble_colour,
                   function_and_climate, physical_plausibility,
                   wardrobe, wardrobe_sources
```

Consequences:
- `grep -rl boundaries briefs/` → **no brief mentions it**. The 14 briefs are the
  artifacts an agent actually opens at workflow step 1.
- The primary questionnaire does not ask for it either.
- Because it is not in `sections`, it is exempt from both the `missing_sections`
  and the `blank` completeness checks. It exists only inside the safety
  conditional.

So the field that gates child-safety approval is one that the harness never asks
anyone to provide, and whose absence is invisible until the moment of approval.

`check_assets.py` has the identical problem with `answers["expression"]`
(line 182) — also not a template section, so expression sets silently fall back
to the hardcoded `core` list forever.

### 3.4 Miya's brief (age 5) contains no safety section at all **[verified]**

`grep -niE "safety|minor|sexual|legal" briefs/miya.md` → nothing. The briefs for
the five minors are byte-identical to the adults' apart from name/age/role. All
child-safety weight rests on LEGAL.md being read and remembered; the
per-character document the agent works from carries none of it.

---

## Severity 4 — registry/document divergence (`cast.json` v2.0.0 vs 1.x docs)

### 4.1 Binding documents cite fields that no longer exist **[verified]**

`cast.json` character records contain exactly:
`age, age_coding, answers, approved, faction, id, name_en, name_ja,
questionnaire_answered, role`.

| Field | Occurrences in cast.json | Cited as authoritative by |
|---|---|---|
| `banned` | **0** | SKILL.md non-negotiable #3, OPERATIONS.md §4 |
| `style_bible` | **0** | LEGAL.md §3 |
| `appeal_track` | **0** | LEGAL.md §6 |
| `shape_language` | **0** | OPERATIONS.md §4, SKILL.md lever 4 |
| `visual_density` | **0** | OPERATIONS.md §4 |
| `negative_space` | **0** | SKILL.md lever 1 |
| `secondary_hook` | **0** | SKILL.md lever 2 |

Two of these are load-bearing for safety and legal work:

- **`banned`** — SKILL.md calls it *"a hard filter, copied verbatim into the
  exclusion section of every prompt for that character."* There is no such array
  for any character. An agent instructed to copy it verbatim finds nothing, and
  must either invent one (violating non-negotiable #1: never invent an answer) or
  silently ship prompts with no exclusion section.
- **`style_bible`** — LEGAL.md §3 offers it as the concrete mitigation for
  artist-name prompting: *"The `style_bible` in `assets/cast.json` exists so no
  artist name is ever needed."* It does not exist. The rule remains, but its
  stated alternative is missing, which is precisely the pressure that produces
  violations.

### 4.2 Version skew is visible in the metadata **[verified]**

`SKILL.md` frontmatter `version: "1.1.0"`; `cast.json` `schema_version: "2.0.0"`.
The prose was not migrated with the schema. §4.1 is the symptom.

### 4.3 Broken cross-references in the safety citation chain **[verified]**

- SKILL.md non-negotiable #4 cites **"Design canon §11"** for the minors rule.
  `design-canon.md` has sections 1–5 plus two unnumbered headings. **There is no
  §11.**
- OPERATIONS.md §4 cites **"design canon §2.1"** for the no-real-supernatural
  rule. §2 is "The memory point". The citation does not resolve.

Both point at safety/canon rules, which is where a dead reference costs most.

### 4.4 The skill description promises artifacts that do not exist **[verified]**

SKILL.md frontmatter advertises *"**ready-to-send prompts per character**"*. Zero
briefs contain a prompt card (`grep -l FORMAT briefs/*.md` → 0). SKILL.md body
then states the opposite: *"Writing generator prompts is a separate agent's
job."* The frontmatter `description` is the field that decides whether a skill is
loaded for a task, so this mis-advertises the skill into prompt-writing tasks it
explicitly refuses to do.

Relatedly, SKILL.md says briefs *"leave a handoff slot"* — `grep -in handoff
briefs/` → **no brief has a handoff block**. The documented handoff contract has
no counterpart in the artifacts.

---

## Severity 5 — gate semantics: the checks cannot fail when it matters

### 5.1 `--strict` is inert for exactly the characters that need it **[verified]**

`check_assets.py:179`

```python
if not have:
    notes.append(f"[{cid}] no sprites generated yet")
    continue          # <-- skips the missing-expression check entirely
```

A character with *some* sprites gets a missing-expression error under `--strict`.
A character with **zero** sprites gets a friendly note and no error. The
completeness gate is disabled precisely when the work has not been done.
Verified: `check_assets.py characters/ --strict` on the real tree exits **0**
with all 14 characters unstarted.

### 5.2 Warnings never affect the exit code **[verified]**

`return 1 if errors else 0`. The current tree produces **35 warnings, exit 0** —
every asset in `characters/` violates the naming convention, and the validator
still reports pass. Any CI or agent that keys on exit status sees green on a tree
where no file follows the spec.

### 5.3 Following the sprite spec produces a spurious ERROR **[verified]**

`check_assets.py:112`: `m = NAME_RE.match(name) or SHEET_RE.match(name)`

`NAME_RE` (`<id>_<variant>_<expr>.png`) matches `ren_sheet_turnaround.png` first —
as `id=ren, variant=sheet, expr=turnaround`. So a spec-compliant turnaround sheet
is classified as a **sprite**, and then:

```
ERROR   ren_sheet_turnaround.png: sprite has no alpha channel (mode RGB)
WARN    [ren] expressions not in the approved answers: turnaround
```

But `sprite-spec.md:11` and SKILL.md both require turnarounds to be flat RGB on
`#00B140` green and **never matted**. The validator hard-errors on correct work,
and the file's own dedicated branch (`if name.endswith("_sheet_turnaround.png")`,
line 168) is unreachable for the RGB case. Fix: try `SHEET_RE` first, or anchor
`NAME_RE` to exclude the sheet suffixes.

### 5.4 The most valuable asset check disappears in the default environment **[verified]**

The alpha checks — including the genuinely good "alpha channel is fully opaque →
the plates were flattened" detector — are gated on Pillow. `ARENA_ENVIRONMENT.md`
states no Python packages are preinstalled. So the documented invocation
`python3 …/check_assets.py characters/` degrades to a **note** and exits 0:

```
note    Pillow not installed — alpha and background checks skipped
```

The one check that catches the harness's own most-warned-about failure mode is
off by default, and its absence is a note rather than a warning or a distinct
exit code. (With Pillow installed it works correctly — **verified**: a flattened
sprite is caught as an ERROR.)

### 5.5 `check_assets.py` crashes on a malformed registry **[verified]**

Line 82 `reg["characters"]` raises an uncaught `KeyError` traceback, although the
same function carefully handles `OSError`/`JSONDecodeError` two lines earlier.
`check_roster.py` handles the same case gracefully. Inconsistent, and a
stacktrace in a QA gate reads as tooling breakage rather than a data error.

---

## Severity 6 — matting pipeline

### 6.1 Swapped plate arguments silently yield a fully-opaque sprite **[verified]**

`tools/triangulate_matte.py` computes `alpha = 1 - (W - B)`. Passing the plates
in the wrong order makes `W - B` negative, `alpha` clamps to 1.0 everywhere, and
the tool writes a fully-opaque PNG with **exit 0 and no warning** — the same
output as the flattened-plates failure the docs warn about at length.

There is no sanity assertion that `white >= black` pixelwise, and no report of
what fraction of pixels are non-opaque. Both are one-liners and would convert a
silent 30-minute mistake into an immediate error. (Downstream,
`check_assets.py` *does* catch the opaque result — but only if Pillow is present
and the file is named to convention.)

### 6.2 No dependency guard on the art tools **[verified]**

`python3 tools/triangulate_matte.py` → bare `ModuleNotFoundError: No module named
'numpy'`. Given the documented environment has no packages, the first contact
with these tools is always a traceback. A two-line guard pointing at the venv
instructions in `ARENA_ENVIRONMENT.md` would pay for itself.

---

## Severity 7 — process rules with no backstop

### 7.1 "Save every prompt" is unenforced, and is being violated right now **[verified]**

It is SKILL.md non-negotiable **#2**, OPERATIONS.md **§5**, and CONSTRAINTS.md
short-version **#5**, with an exact path
(`characters/<id>/prompts/NN_<stage>.txt` + `.result.md`).

- No validator checks for it (`grep -rn prompts scripts/` → nothing).
- `characters/` has **0 subdirectories** and **37 flat files**. Not one prompt has
  ever been saved.
- The rule's own stated motivation is visible in the same directory: SKILL.md
  cites *"eleven unexplained Splash versions"*, and
  `splash_water_character_reference_v2 … v11` are sitting there, unexplained.

A rule stated three times, motivated by damage already in the tree, and checked
nowhere, is the profile of a rule that will keep being broken.

### 7.2 The 14 briefs are undifferentiated templates **[verified]**

Stripping identifiers, all 14 briefs reduce to the same document — the questions
are generic and identical for a 5-year-old and a 48-year-old. Since the workflow
says "open the brief, if unanswered stop and ask", and every brief is
unanswered, step 1 always terminates the workflow. That is *correct* behaviour
given nothing is approved, but it means the brief layer currently contributes no
per-character information at all, and the harness has never been exercised
end-to-end.

### 7.3 `ART_PIPELINE_NEXT.md` references a different project's layout **[verified]**

Its header says it remains authoritative for CGs, then references
`public/generated/cgs/…` and `src/content/story-data.ts` — **neither path exists**
in this repo (CGs are in `cg/`). An agent following it for CG work is following
a map of a different repository.

---

## What is good (worth preserving)

To be clear about what not to touch:

- **The precedence model** (LEGAL > OPERATIONS > AGENTS > SKILL > references >
  briefs) with an explicit "stop and report the conflict rather than resolving
  it" is the right structure, and rare.
- **LEGAL.md is genuinely strong** — jurisdiction table, "generating and storing
  can be sufficient", the SynthID/provenance section, and the refusal
  instruction that pre-empts authority-claiming prompts. The content is sound;
  the problem is only that two of its claimed code guards do not exist.
- **The opaque-alpha detector and the "alpha is effectively binary" heuristic**
  in `check_assets.py` are real, well-reasoned checks that catch the exact
  documented failure mode. Verified working.
- **"Never invent a design answer"** as non-negotiable #1, with a registry that
  encodes *questions* rather than answers, is a genuinely good anti-hallucination
  design.
- **The colour correction in HEAD** (measuring against the Mogi thesis and
  falsifying the 60-30-10 rule the skill had taken on trust, then propagating the
  removal across five files) is exactly the right way to maintain this kind of
  document. Verified: no stale 60-30-10 prescriptions remain — the four
  surviving mentions are all the correction itself.

---

## Recommended fix order

Cheap and high-value first.

1. **`archive_and_commit_assets.sh`**: drop the two nonexistent pathspecs, add
   `cg/`, remove `|| true` from `git add`, and make the script fail loudly when
   the commit does not happen. (§1.1, §1.5)
2. **`commit_and_push_asset.sh`**: stop hardcoding `main`; take the branch from
   the environment or refuse to run. (§1.4)
3. **Reconcile the archive state**: delete or regenerate the 8 orphaned
   `.sha256` files, fix `LATEST_ARCHIVE.txt`, and either refresh or remove the
   stale bundle. (§1.2, §1.3)
4. **Make the doc/code claims true** — either implement the checks or delete the
   claims. Highest priority: the Ryuki guard (§2.1), the qa-checklist list
   (§2.3), the differentiation claim (§2.4), and the "verified by negative test"
   sentence (§2.2). Deleting an unimplemented claim is a legitimate fix and is
   better than leaving it.
5. **Harden the minor gate** (§3): require `age` in `REQUIRED_META`; reject
   non-int `age`; add `boundaries` to `question_template` so it is asked and
   completeness-checked; replace the substring test with a negation-aware check
   or a structured boolean field (e.g. `"sexualisation": "prohibited"`) that
   cannot be inverted by prose.
6. **Add `scripts/test_validators.py`** with the negative cases from this review
   — it is the artifact CONSTRAINTS.md already claims exists, and it would have
   caught §2.1, §3.1 and §3.2.
7. **Fix gate semantics** (§5): `SHEET_RE` before `NAME_RE`; make `--strict` fail
   on zero-asset characters; make missing Pillow a non-zero exit under `--strict`
   rather than a note.
8. **Sync `cast.json` with the docs** (§4.1) — restore `banned` and `style_bible`
   at minimum, or amend LEGAL.md/OPERATIONS.md/SKILL.md to stop citing them.
9. **Add a plate-order sanity check** to `triangulate_matte.py` and a dependency
   guard to the `tools/` scripts. (§6)
10. **Add a prompt-persistence check** to `check_assets.py`: any committed asset
    for `<id>` with no `characters/<id>/prompts/` entry is a warning. (§7.1)

---

*Nothing in this review was changed in the repository; this is a findings
document only. Every **[verified]** item is reproducible with the commands
quoted alongside it.*
