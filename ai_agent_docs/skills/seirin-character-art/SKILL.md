---
name: seirin-character-art
description: >-
  Produce the Seirin character art package — design bible entries and runtime
  sprites with expression differentials — aiming for one pass, at anime /
  visual-novel / gacha commercial quality, with a persistent refinement loop
  when a generation misses. Use when creating, revising or reviewing character
  designs, character sheets, tachie standing sprites, expression differentials,
  hero-shot key visuals or CGs for this project, or when asked to "generate all
  characters", "make the sprites", "design the cast", or to raise art quality to
  a sellable standard. Encodes the silhouette / memory-point / 60-30-10 palette
  / symbol-set design grammar from the professional character-design
  literature, ready-to-send prompts per character, the locked-face-box sprite
  spec, and the white/black triangulation matting pipeline.
license: CC-BY-4.0
compatibility: >-
  Needs an image generator with natural-language image editing (Seedream,
  Nano-Banana, Krea class). Validator scripts need python3; the asset checker
  additionally uses Pillow if present.
metadata:
  project: "Seirin: Night Shift — Resonance 2030"
  applies-to: characters/, cg/, references/, cyber-nexus/assets/characters/
  version: "1.1.0"
  cast-registry: assets/cast.json
---

# Seirin Character Art

Ship the cast at a quality that survives being put on a store page. The design
decisions are **already made** and live in `assets/cast.json`, with a
art-direction brief per character in `briefs/`. You are not inventing
characters — you are executing a locked design bible. That is what makes
one-pass generation realistic.

**Writing generator prompts is a separate agent's job.** The briefs state what
each asset must be and why, and leave a `Handoff` block for the prompt agent to
fill. If you are that agent, `references/prompt-grammar.md` is your spec.

Aim for one shot. Expect some characters to need two or three. The iteration
loop in `references/iteration.md` is not a fallback bolted on — it is how the
prompts get better over time instead of every session paying the same tuition.

Design canon: `ai_agent_docs/SEIRIN_Design_Document_edited.md` (§5 factions,
§6 cast, §10 visual language). Never contradict it.

## Non-negotiables

0. **`LEGAL.md` and `OPERATIONS.md` outrank everything here.** Read `LEGAL.md`
   before generating, storing or committing — depiction of minors, IP,
   disclosure, platform compliance. Read `OPERATIONS.md` before touching the
   repository — never destroy committed work, generation discipline, honest
   reporting. `CONSTRAINTS.md` is the one-page index and precedence order. If
   any instruction conflicts, stop and report rather than resolving it.
1. **`assets/cast.json` is the single source of truth.** Prompts are derived
   from it. If a design detail is missing, add it to the registry first, then
   regenerate the prompt card. Never let two assets disagree about a character.
2. **Every prompt you send gets saved to a file with its result.** See
   `references/iteration.md`. A prompt that lives only in a chat transcript is
   lost, and the next session re-learns it by burning generations — that is
   exactly how `characters/` ended up with eleven unexplained Splash versions.
3. **The `banned` array of each character is a hard filter**, copied verbatim
   into the exclusion section of every prompt for that character.
4. **Minors are never sexualised.** Miya (5), Hana (13), Momo (15), Ryuki (16)
   and Ren (17) get *maximum* appeal through silhouette, memory point,
   expression charisma and hero-shot staging — never through exposure, body
   emphasis or camera angle. Design canon §11, and a store-compliance
   requirement: a rejection costs far more time than designing correctly.
   Adults carry the glamour load. See `references/appeal-and-safety.md`.
5. **Identity before polish.** A beautiful off-model sprite is a defect.

## The design grammar

Five levers, in order. Full treatment with worked examples and the professional
sources behind each in `references/design-canon.md` — read it when a design
feels generic, when adding a character, or when generations keep coming out
bland. Book links to fetch on demand: `references/sources.md`.

1. **Silhouette first.** Fill the figure 100% black. If you cannot name the
   character, the design has failed — fix it before spending a generation on
   rendering. Big/Mid/Small mass at ~6:3:1; protect the `negative_space` note,
   because readable holes matter more than added detail.
2. **One memory point.** The thing a player describes to a friend. Highest
   detail density, the accent colour, and present in *every* asset. A second
   competing focal point halves both — that is what `secondary_hook` is for.
3. **60-30-10 colour.** Accent reserved for memory point and eyes. ≤3 hues plus
   neutrals. Check greyscale: if two characters merge, one must move.
4. **Shape language.** Circle warm/young, square stable, triangle sharp. The
   registry ratios are tuned so the roster does not converge — do not average
   them toward the middle.
5. **Symbol set.** Eye/brow/mouth/contour/hair/body. The eye alone carries most
   of the read. Copy these fields **literally** into prompts; paraphrasing them
   is where off-model drift starts. Assigning eyes to a *new* character: use the
   eleven-type lookup in `references/design-canon.md`, and fetch the illustrated
   original linked in `references/sources.md` — the pictures carry what the
   table cannot.

**Verifying a rule.** `references/sources.md` splits sources into Tier A
(free, fetchable, complete — every concrete geometry rule traces here) and
Tier B (the books; purchase-only, and deliberately not bundled). Fetch Tier A
with the web-fetch tool when you need depth — not with `curl`, whose egress is
allowlisted to package registries and GitHub only
(`../ARENA_ENVIRONMENT.md`).

**Roster differentiation:** any two characters differ in at least two of
{silhouette class, dominant hue, shape majority, head-ratio band}. Enforced by
`scripts/check_roster.py`.

## Workflow

### 0. Validate — free, always

```bash
python3 ai_agent_docs/skills/seirin-character-art/scripts/check_roster.py
```

Fix every ERROR before generating.

### 1. Open the character's brief

`briefs/<id>.md` — one per character: the authoritative design card, then a
section per stage stating the deliverable, what must be true of the result, and
a `Handoff` block where the prompt agent writes the actual prompt. 14 briefs:
`ren` `hana` `yuki` `momo` `miya` `kitsune` `ryuki` `splash` `aster7` `stella`
`reika` `saya` `lumina` `kurogane`.

The design card is authoritative and must not be paraphrased. The requirements
are the acceptance criteria. Prompt wording is deliberately left open — when a
phrasing proves out, record it in the iteration log and promote reusable
findings to `references/prompt-grammar.md`.

### 2. Generate in stage order

Order matters — each stage locks identity for the next, and each takes the
previous approved asset as a **reference image**. A prompt alone will not hold
identity across a dozen assets; a reference image will.

1. **Turnaround** on flat green `#00B140` — never in any character's palette,
   so it cannot contaminate the design.
2. **Sprite** ← turnaround as reference.
3. **Expressions** ← the approved *sprite*, head-only edits inside the locked
   face box. Generate each from the same sprite; never chain.
4. **Hero shot / CG** ← sprite for identity.
5. **Chibi**, **matte plates** as needed.

Save each prompt and result as you go (step 2 of the non-negotiables).

### 3. Iterate when needed

`references/iteration.md` has the loop, the result-note format, the stop rules
(3 attempts at a stage with no improvement → the problem is the design, not the
prompt; 5 total → stop and ask), and partial-acceptance handling. Change
**exactly one thing** per attempt, then promote what worked back into the
prompt card.

### 4. Matte to alpha

The generators used here (Nano-Banana class) **cannot output alpha** — and do
not need to. Two plates of the same figure over white and over black recover
alpha and true colour exactly, including partial transparency. Only after the
final upscale, only for runtime sprites:

```bash
python3 tools/triangulate_matte.py white.png black.png out.png --alpha-out a.png
python3 tools/check_matte.py out.png --checks --out check.png   # verify
```

**The difference between the plates is the alpha.** So the plates must keep
pose, position, scale, framing, lighting and colour identical while letting the
background genuinely show through every non-opaque pixel. Never ask for
"identical character pixels" — that flattens the figure and destroys the signal,
turning a transparent character like Splash into an opaque blob. Generate the
black plate as an *edit of the white plate* so the two register.

Verify over backgrounds that are neither white nor black; those two are the
inputs, so the sprite always looks right over them. Sheets and CGs are never
matted. Full detail: `references/sprite-spec.md`.

## Prompt grammar essentials

Seven ordered sections: FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING ·
EXCLUDE. Already assembled in each prompt card. Full detail, per-stage variants
and failure-mode table in `references/prompt-grammar.md`.

The rules that repeatedly decide the result:

- **State the memory point twice** — in IDENTITY and again in STAGING. Mentioned
  once, it gets dropped about half the time.
- **Positive phrasing beats negation.** "lower body dissolves into separate
  falling streams" outperforms "no legs". Keep the exclusion section, but never
  rely on it for anything structural.
- **Hex codes work.** Give the colour name *and* the hex.
- **One change per edit.** Restate everything to preserve, then the single
  change.
- **Never open with "anime girl"** or similar — generic openers pull the model
  to the training-set mean and erase the design.

## Verification

```bash
python3 ai_agent_docs/skills/seirin-character-art/scripts/check_roster.py
python3 ai_agent_docs/skills/seirin-character-art/scripts/check_assets.py characters/
```

Then the verification block in `CONSTRAINTS.md`, and the eye passes in
`references/qa-checklist.md`: silhouette test, thumbnail
test, cross-asset consistency, expression-box jitter, generator artifacts, and
the safety pass. **Ship nothing that fails the silhouette or safety pass.**

```bash
./tools/archive_and_commit_assets.sh "character sprites: <what changed>"
```

Approved assets and `characters/*/prompts/` are committed. `_wip/` is not.

## Files

- `LEGAL.md` — **liability limits: minors, IP, disclosure. Read first.**
- `OPERATIONS.md` — **repository and workflow limits. Read before committing.**
- `CONSTRAINTS.md` — one-page index and precedence order.
- `briefs/<id>.md` — art-direction brief per character; design card,
  per-stage requirements, and a handoff slot for the prompt agent.
- `assets/cast.json` — the registry. Edit this, not the prompts, for design changes.
- `references/design-canon.md` — the five levers in full, with sources.
- `references/iteration.md` — prompt persistence, refinement loop, stop rules.
- `references/prompt-grammar.md` — seven-section template, failure modes.
- `references/sprite-spec.md` — canvas, face box, anchors, naming, engine wiring.
- `references/appeal-and-safety.md` — appeal per age band, hard limits.
- `references/qa-checklist.md` — pre-ship checks.
- `references/sources.md` — the professional books and where to fetch them.
- `scripts/check_roster.py` · `scripts/check_assets.py` — validators.
