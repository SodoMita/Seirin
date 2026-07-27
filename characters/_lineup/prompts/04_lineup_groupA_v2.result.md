# 04_lineup_groupA_v2 — corrective pass

Model: Arena image tool. Output: `lineup_groupA_v2.png`

**Verdict: KEEP** (as a lineup/colour-separation reference, not as a turnaround)

## Fixed
- ✅ **Ren's memory point now reads.** Bare shoulders over the sleeveless
  undershirt, coverall hanging from the hips, two empty sleeves tied in a knot
  at the stomach with the ends dangling. Silhouette is now the top-heavy wedge
  the registry specifies.
- ✅ **Momo's memory point now reads.** Beltpack at the collarbone with a clear
  coiled cable running up the jawline to the right ear, left earpiece out and
  hooked over the collar. Appeal now points at her face, as designed.
- ✅ **Miya's head ratio corrected** — reads as a genuine small child, and the
  felt crown now has the forward-flopping point instead of a flat beret.
- ✅ Yuki's hakama now shows real pleats and front waist ties; thumb tape visible.

## What worked — PROMOTE to prompt-grammar.md
The fix that carried both memory points was **describing the garment STATE as a
positive shape rather than as a modification of a known garment**:

- ❌ "coverall worn off both shoulders, sleeves knotted at the waist"
  → generator renders a normal jumpsuit
- ✅ "she is BARE-SHOULDERED in a sleeveless undershirt; the coverall hangs from
  her hips and its TWO LONG EMPTY SLEEVES are tied in a big knot in front of her
  stomach"
  → correct every time

Same mechanism as the existing negation rule in `prompt-grammar.md`: the model
renders the garment it knows and silently drops the modifier. Naming what the
body looks like, rather than what was done to the clothing, defeats it.
Combined with stating the memory point twice (identity + a dedicated FOCUS
sentence), both previously-dropped features landed.

## Still imperfect (acceptable at lineup stage, fix at turnaround)
- Ren's oxide-red service decals reduced to two small squares.
- Hana's cyan handprint bloom now reads more as an abstract paint splash than as
  handprints.
- Momo's chevron drifted to a patterned green-and-amber panel.
- Ren's aluminium tape still reads as a fabric headband.
