# SEIRIN — Art Direction Bible

**Status:** proposed, awaiting project-owner approval · **Date:** 2026-07-27
· **Author:** art-direction agent · **Branch:** `arena/019fa0a3-seirin`

Machine-readable canon lives in
[`skills/seirin-character-art/assets/cast.json`](skills/seirin-character-art/assets/cast.json).
**That file is the source of truth** (`OPERATIONS.md` §4); this document is the
reasoning behind it, for humans.

> ⚠️ **Nothing here is approved.** Every character is `approved: false`.
> `CONSTRAINTS.md` makes approval a human gate, and the art agent does not set
> it. Read this, argue with it, then flip the flags you accept.

---

## 1. The one rule

> **Every apparent miracle has visible hardware.**
> Wherever an image looks magical, the mount, cable, battery, lens, hinge, seam
> or fixing that produces it must be findable in the same image.

Design document §2.1 forbids real supernatural effect, and `OPERATIONS.md` §4
calls that the franchise's differentiator. Every previous statement of it was a
*story* rule. Making it a **drawing** rule is the single highest-leverage
decision in this document, because it does four jobs at once:

1. It keeps §2.1 automatically, in every asset, without anyone remembering to.
2. It defeats all three named wardrobe failures
   (`references/wardrobe-questions.md`). Hardware has construction; the
   featureless bodysuit and the glowing-seam default do not survive contact
   with "show me the battery".
3. It gives every character something to look at up close — the thing the
   wardrobe guide says fantasy costume has and AI sci-fi costume lacks.
4. It is the theme. This is a story about who controls attention. A design
   language where the mechanism is always visible *is* the argument.

The corollary, which does real work: **the audience should be able to solve a
staged miracle by looking at the picture.** Lumina's cleansing is legible if you
watch her lamp instead of her face.

---

## 2. Reading the cast

### Nobody's clothes fit — except one person's

An accident of answering the wardrobe questions honestly that became the
strongest through-line in the cast, so it is now deliberate:

| Character | Whose clothes are these really? |
|---|---|
| Ren | An adult's coverall, cut down. She is wearing an adult's job. |
| Hana | Her father's coat, years too big. |
| Miya | Dressed by a hurried adult; a pyjama layer never removed. |
| Momo | Issued by a marketing department. |
| Splash | A calibration glass nobody told her to put down. |
| Reika | Company property she never gave back. |
| Kurogane | Bespoke shirts fitted to a man eight kilograms lighter. |
| **Lumina** | **Bought by her, in her size, immaculate.** |

Lumina is the only person on screen wearing exactly what she chose. That reads
as control before she says a word, and it costs nothing to draw.

### The seven-word test

If a player cannot describe a character to a friend in about seven words, the
memory point failed. Full detail in `cast.json`; the short forms:

| Character | Seven words |
|---|---|
| Ren | coverall knotted at the waist by its sleeves |
| Hana | dad's coat, blotched pale where hands touched |
| Yuki | document tube worn where a sword goes |
| Momo | idol with the monitor cable taped along her jaw |
| Miya | small queen with a taped-up toy raven |
| Kitsune | nine camera booms fanned like fox tails |
| Ryuki | carries a mended dragon head under one arm |
| Splash | water woman, glass balanced on her head |
| Aster-7 | amber screen face with a cracked corner |
| Stella | the drone that never lights |
| Reika | harness with the insignia cut clean out |
| Saya | scientist wearing her samples as a bandolier |
| Lumina | brings her own ring light everywhere |
| Kurogane | calipers where the pocket square should be |

Every one is **causal** — it exists because of what that person does, not as
decoration — which is the test `design-canon.md` §2 actually sets.

### Reserved colours

`design-canon.md` asks for one colour per character whose appearance *means*
something. Several of these carry plot:

| Character | Reserved | Meaning when it appears |
|---|---|---|
| Ren | hi-vis yellow | a licensed adult has cleared her to operate |
| Hana | heat-bloom cyan | someone touched her kindly; the coat remembers |
| Kitsune | broadcast cyan | the camera is actually live — a consent signal |
| Splash | warm amber | she is in physical danger |
| Aster-7 | recording red | hard-wired, cannot be disabled in software |
| Reika | rescue orange | she is saving someone, never destroying |
| Saya | Splash's cyan | worn only in the vials; her undeclared evidence |
| Lumina | warm gold | emitted by her lamp — she owns no gold garment |
| **Stella** | **pure white** | **the data has been independently verified** |

Stella's is the franchise thesis compressed into a rule about a light source.
Everything she renders in any other colour is a hypothesis. The final image of
season one — the watershed map resolving into a constellation — is in white.

---

## 3. Two canon conflicts, and how they were resolved

Both existing designs are **kept unchanged** at the project owner's direction.
The resolution turned out not to need a single pixel altered — what was missing
was a written statement of where the hardware is.

### Kitsune — `characters/Kitsune_v4.jpeg`

**The worry:** a sarafan-cut fox girl with fur tails and paw boots reads as an
actual supernatural kitsune, contradicting §2.1.

**The resolution:** the design document *already* says her nine tails are "safe
light and filming modules of a costume". The art was compliant all along. So:
the ears are mounted on the headdress, the tails are fur sleeves over camera
booms on a visible hip yoke, the paws are boots. Nothing about the image
changes — the yoke, buckles and battery pack at the small of her back are
simply now **stated and drawn**, and that becomes her memory point.

The Russian-sarafan cut is explained in-world rather than apologised for: an
early-Shōwa touring-theatre costume the teahouse acquired and never gave back.
Exactly the sort of object an old district keeps, and it makes her the most
visually distinct character in the roster.

### Splash — the eleven `splash_water_character_reference_v*` files

**The worry:** a water spirit, where canon says CSR polymer-gel prototype.

**The resolution:** §4.2 defines CSR as an electroactive polymer **gel** with
micropumps, sensors and distributed compute. A transparent gel is exactly what
the existing art shows. **The water reading *is* the material reading.** Two
additions sit inside the existing look without touching the silhouette: faint
internal micropump nodes and sensor beads suspended in the gel, and the amber
status node at the throat. Both are hardware.

The glass on her head is promoted from a quirk to the memory point, and given a
reason: a calibration vessel from Saya's first surface-tension tests, which
nobody ever asked her to put down. That rhymes with Ren's coverall and Hana's
coat — the third character wearing something that was never hers.

The teddy bear from v10 is dropped as a permanent element, retained as a scene
prop. Otherwise the v11 look stands.

---

## 4. Appeal, allocated by mechanism

From `references/appeal-and-safety.md`: appeal is not one thing, and exposure is
the least differentiating lever available. Allocation:

- **`hero_glamour`** — Kitsune 24, Reika 28, Saya 31, Lumina 35, Yuki 19,
  Kurogane 48, Stella. Adults carry the glamour load, through presence,
  authority, tailoring and staging.
- **`cool_kid`** — Ren 17, Ryuki 16, Momo 15, Hana 13. Boldest silhouettes in
  the roster, strongest memory points, full-coverage costume, age-accurate
  proportions.
- **`mascot`** — Miya 5, Aster-7, Splash. Merchandisability and thumbnail
  legibility.

### Momo is the highest-risk design in the cast

An idol character aged 15 is exactly where a project like this fails a store
review. The structural fix is to make full coverage **intrinsic to the concept
rather than a restriction applied afterwards**: Stella-5 fronts a civic
campaign, so her stage costume is a glamorised **municipal works uniform** —
technical jacket, high neck, long sleeves, trousers, boots. There is no version
of this concept that wants a miniskirt.

Her memory point also points at her **face** (the monitor cable along her jaw),
her `banned` array is the longest for any minor, and the payoff of her whole arc
is a gesture — taking the second earpiece out — that needs no costume change.

### Ryuki's ichthyosis

Rendered as **fine pale plating with a soft matte pearl sheen** on hands,
forearms, neck and cheekbones. Never wounds, burns, scabs, cracking, reptile
scales, contagion, horror or pity — `LEGAL.md` §2, and there are real people on
the other side of it.

Three design decisions protect this:
1. Her memory point is **the dragon head, never her skin.** Her skin is never
   the subject of a shot.
2. Plating is handled as a **texture on the skin zone, not a fourth colour**, so
   her condition never becomes a colour block.
3. Her gloves and long sleeves have **two honest reasons at once** — the
   mountain is cold and wet, and her skin is more comfortable covered. The story
   never resolves which is doing the work, because for her they are the same.

The gloves coming off in Sc.7 is her trust beat, and it needs no dialogue.

### Lumina — a justified physiognomic subversion

Questionnaire A.4.2 asks whether coding is conventional or subverted, and
demands a narrative reason for subversion. Lumina gets **type 1 kind/gentle**
eyes, a soft oval contour, and no hard angle anywhere in her face — every
conventional villain cue deliberately absent.

The reason: **looking trustworthy was literally her profession.** The audience
must feel the pull before they see the mechanism. Reinforced through other
channels as A.4.3 requires — through her faction palette, through the lamp, and
through the fact that her shelter work in Sc.5 is *genuinely good* and must not
be undercut.

Her `banned` array forbids robes, cassocks, vestments and clerical collars
outright. This is the character where the priest-robe default would bite
hardest, so the refusal is written into the data rather than left to judgement.

---

## 5. Verification actually run

Measured, not asserted — `OPERATIONS.md` §6 requires saying which checks ran.

| Check | Method | Result |
|---|---|---|
| Schema | `json.load`, all 14 records | ✅ valid, 0 null answers |
| Roster differentiation | all 91 pairs, ≥2 of {silhouette class, hue, shape majority, head-ratio band} | ✅ 0 violations |
| Silhouette-class uniqueness | string compare | ✅ 14/14 unique |
| Greyscale separation | area-weighted luma over 11 zones | ⚠️ 6 close pairs — see below |
| BMI arithmetic | every stated height/weight | ✅ all plausible |
| Head-colour count | per `design-canon.md` §3 | ✅ 3 for every human |
| Body-colour count | ≤8 | ✅ all within |

**Not run** (and honestly so): no image was generated at the time of writing, so
the 64px thumbnail test, the black-fill silhouette test and the cross-asset
consistency pass in `qa-checklist.md` are all outstanding. Those need pixels.

### The greyscale caveat

The roster is **MID-heavy**, not the even three-way split it would be
convenient to claim. Only Reika is genuinely dark-dominant. Six pairs sit within
0.03 luma:

`ren/yuki` · `ren/lumina` · `hana/yuki` · **`hana/ryuki` (0.006)** ·
`momo/splash` · `stella/kurogane`

None is a design fault — each is separated by silhouette class *and* hue — but
they are **staging constraints**, recorded in `cast.json` under
`greyscale_collisions`. The tightest, `hana/ryuki`, means: never stage those two
at distance without the dragon head visible.

### BMI, checked deliberately

The wardrobe guide names the 162 cm / 42 kg heroine (BMI 16) as a standard
failure. Every figure was checked:

| | Ren | Hana | Yuki | Momo | Miya | Kitsune | Ryuki | Reika | Saya | Lumina | Kurogane |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BMI | 20.3 | 17.8 | 20.8 | 18.8 | 15.4* | 20.3 | 19.5 | 22.2 | 20.5 | 21.0 | 24.6 |

\* Child BMI does not use adult bands; 15.4 is near the median for a
five-year-old. Splash, Aster-7 and Stella have `bmi: null` — they have no
meaningful body mass, and inventing a number would be fabrication.

Reika at 68 kg is the number most likely to get "corrected" downward by a later
pass. It is correct: a 175 cm woman with real pilot musculature. Leave it.

---

## 6. Production order

Per `SKILL.md` §2 — each stage takes the previous **approved** asset as a
reference image, because a prompt alone will not hold identity.

```
lineup sheet  →  turnaround (#00B140 green)  →  sprite (mid-grey)
              →  expressions (head-only, locked face box)
              →  hero / CG  →  chibi  →  white+black matte plates
```

**The lineup sheet comes first**, before any individual turnaround. Colouring a
cast sequentially guarantees the next character collides with the last one
(`design-canon.md` §3), and the lineup is the cheapest possible test of the
whole roster's separation — one generation instead of fourteen.

### Stella is exempt from the black-fill test

`design-canon.md` §1 permits a documented exception for a character with no
solid body, and requires the exception be **written down rather than assumed**.
Filling a drone swarm 100% black yields a cloud of dots, not a mass.

Her substitute gate, recorded in `cast.json` as `silhouette_exception`:

- **Dot test** — reduce to flat black points on white at 64px. The arrangement
  must still read as a standing figure, and the single unlit drone must still be
  findable.
- **Off-axis shear test** — from an oblique angle she must visibly separate into
  flat projection planes and individual aircraft.

### Staging rules that are not preferences

- **Stella must be composed against a dark or wet value.** She is emissive: on a
  light ground she disappears. This is physics, not taste.
- **Saya must never be staged against white.** A large lab coat blooms out at
  full size (area effect); her slate blouse and dark trousers are load-bearing.
- **Kitsune needs horizontal room.** Widest silhouette in the cast; she overlaps
  everyone if blocking ignores the tail spray.
- **Splash must be checked over dark, light *and* mid backgrounds** — a
  translucent figure takes its value from what is behind it, and white/black are
  the matte inputs, so they always look fine and prove nothing.
- **Nano Banana caps consistent characters at ~5.** The 14-character lineup must
  be generated in groups and composited, never in one shot — faces merge past
  five. Recorded in `references/prompt-grammar.md`.

---

## 7. Open questions for the project owner

1. **Rarity spread.** Nine SSR / four SR / one R is top-heavy for a gacha
   roster. Justified here because most of these are principal cast rather than
   pulls — but if this becomes a real gacha, some SSRs must demote.
2. **Momo's amber vs Kurogane's silver.** They deliberately share Akatomi's
   corporate white — the CEO and the fifteen-year-old he is using, dressed
   alike. Uncomfortable on purpose. Confirm you want that.
3. **Aster-7's knitted cap.** Currently the entire "is this machine a person"
   arc, delivered as a hat that appears without explanation and is never
   removed. Confirm it is not too cute for the tone.
4. **Stella's 41 drones.** Fixed number, one permanently unlit, ~18 min flight
   per charge — so she visibly shrinks through a long evening. Confirm before it
   reaches a script.
5. **Lumina's defeat is a dead battery**, not an arrest. The design assumes the
   document's "no arrest on stage" ending. Confirm.

---

## 8. Sources

Design grammar from `references/design-canon.md` and
`references/sources.md`; principle-to-source index in
`Character_Design_Brief_AI_Agent_Questionnaire.md` §G. The measured colour
findings (203 characters / 27 works; 90% use exactly 3 head colours and ≤8 body
colours; 60-30-10 does *not* describe anime characters) are Mogi's TEU doctoral
thesis via `design-canon.md` §3.

No living artist is named anywhere in this document or in any prompt derived
from it (`LEGAL.md` §3). No copyrighted text is reproduced. All Akatomi and
Chorus of the Abyss iconography is invented (`LEGAL.md` §2).

**All character art for this project is AI-generated and must be disclosed as
such** (`LEGAL.md` §4). EU AI Act Article 50 transparency obligations apply from
2 August 2026 — six days from this document's date.

---

## 9. Session log — what was actually generated, 2026-07-27

Deliverable: **`characters/_lineup/SEIRIN_cast_lineup_2026-07-27.png`** — all 14
characters at shared scale on chroma-green. Group sheets and the silhouette QA
sit beside it in `characters/_lineup/`.

Generated in **three groups, not one image**, because Nano Banana holds at most
~5 characters consistent before faces merge (`prompt-grammar.md`).

| Prompt | Output | Verdict |
|---|---|---|
| `01_lineup_groupA` | Ren/Hana/Yuki/Momo/Miya | PARTIAL — 2 memory points dropped |
| `02_lineup_groupB` | Kitsune/Ryuki/Reika/Saya/Lumina | KEEP WITH EDIT — 4/5 landed first try |
| `03_lineup_groupC` | Splash/Aster-7/Stella/Kurogane | PARTIAL — 1 **blocking** defect |
| `04_lineup_groupA_v2` | corrective | KEEP — both memory points recovered |
| `05_splash_v2` | corrective | KEEP — blocking defect resolved |

Every prompt is saved verbatim with a `.result.md` note, per `OPERATIONS.md` §5.

### The blocking defect, and why it matters

Group C v1 rendered Splash with anatomical torso contouring — a direct violation
of her own `banned[0]` and a `qa-checklist.md` safety-pass failure. It was
**caught by running the checklist, not by intuition**, regenerated, and the
superseded figure is excluded from the deliverable sheet.

The fix generalises, and is now promoted into `prompt-grammar.md`:

> **Where a rule is safety-relevant, do not rely on the EXCLUDE block.** A
> negative list ("no chest definition, no navel") loses to the model's anatomy
> prior. Giving it a *different object to draw* — "treat the torso as a plain
> glass vase" — works.

### Two techniques promoted to the skill

1. **Garment STATE as positive shape.** "Coverall worn off the shoulders" gets
   dropped; "she is bare-shouldered, the coverall hangs from her hips and its two
   empty sleeves are tied in a knot at her stomach" holds. Recovered both of
   group A's missing memory points in one pass.
2. **Silhouette survives the fill; detail does not.** Measured, see below.

### The silhouette test changed the design

Run for real with `.venv-art` (Pillow + numpy), keying the green field and
filling black at 64px — full results in
`characters/_lineup/qa/SILHOUETTE_TEST.md`, per-character notes now in
`cast.json` under `silhouette.measured_note`.

- **Outstanding:** Kitsune, Splash, Aster-7. **Strong:** Kurogane, Miya, Ryuki.
  **Good:** Hana, Yuki. **Adequate:** Saya.
- ⚠️ **Weak: Ren, Momo, Reika, Lumina.** One shared cause — each of their memory
  points is internal detail or a small held object, which a black fill deletes.
  Three of the four are minors, and silhouette is precisely the appeal lever
  that works at any age rating. **This is the highest-return work outstanding.**
  Per-character amplifications are recorded in `cast.json`.
- ✅ **Stella failed the black fill exactly as her documented exception
  predicts** — the exception is now evidenced rather than asserted. It also
  exposed a genuine problem: her projection planes currently read as solid
  anatomical wings, which `banned[1]` forbids.
- No two silhouettes collide with each other. The weakness is against a generic
  figure, never against another cast member.

### Checks run, and not run

**Ran:** JSON schema · all 91 differentiation pairs · silhouette-class
uniqueness · area-weighted greyscale separation · BMI arithmetic · head/body
colour counts · black-fill silhouette test at 64px · safety pass on all
14 figures.

**Did not run:** matte/alpha checks (`tools/check_matte.py`) — no sprite has been
matted, this is the lineup stage. Cross-asset consistency — only one asset per
character exists. Expression differentials — not yet generated. The game folder
was untouched, so its tests were not run.

**Known imperfections carried forward, not hidden:** Splash's transparency is
~55% rather than the specified 20% (attempt 2 of 3 under the stop rules);
Kitsune's booms cluster near her head instead of springing from the hip yoke;
Reika read male in v1; Ryuki's dragon head lacks its three mismatched repairs;
Lumina's ring light is too small to hold its negative space. All are recorded in
the `.result.md` files with the specific one-change fix for each.
