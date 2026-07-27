# 01_lineup_groupA — Ren / Hana / Yuki / Momo / Miya

Model: Arena image tool (Nano-Banana class). Output: `lineup_groupA_v1.png`

**Verdict: PARTIAL**

## Kept
- Relative heights correct across all five; shared ground line held.
- Flat chroma-green field, no text/watermark/UI anywhere. Safety pass clean:
  full coverage on all five, age-accurate proportions, no body-led framing.
- Hana: oversized coat reads genuinely too big, cuffs turned back, cyan
  handprint bloom present on the shoulders. Heterochromia present.
- Yuki: document tube across the back at sword angle with red end-cap — the
  memory point reads, and it does NOT read as a weapon.
- Momo: municipal-white technical jacket with visible zip/studs and the amber
  chevron. Full coverage intrinsic, exactly as designed.
- Miya: yellow boots, violet cape-coat, and Corvus on the shoulder with the red
  tape on the wing. Three-for-three on her identifying elements.

## Broke
1. **Ren's memory point is absent.** The coverall is worn as a normal full
   jumpsuit with sleeves rolled. It is not off both shoulders, and the waist
   knot is not made of its own empty sleeves. Her silhouette therefore reads as
   a plain column, not the top-heavy wedge in the registry.
2. **Momo's memory point is absent.** No in-ear monitor pack, no clear coiled
   cable taped along the jaw, no earpiece hooked over the collar. This is the
   single most important miss in the sheet — it is also the element that keeps
   her appeal pointed at her face.
3. **Miya's head ratio is wrong** — she reads about 6 heads, not 4.5, so she
   looks like a small ten-year-old rather than a five-year-old. Her felt crown
   came out as a flat beret instead of a soft crown with a forward-flopping
   point.
4. Minor: Yuki's hakama reads as a plain long skirt (pleats lost); her thumb
   tape is not visible. Ren's aluminium tape strip reads as a generic headband.

## Diagnosis
Both missing memory points are **structural clothing states** — "worn off the
shoulders", "cable taped along the jaw". The generator rendered the garment it
knows and dropped the modification. This matches the known failure in
`prompt-grammar.md`: a memory point stated once gets dropped roughly half the
time, and negation/modification phrasing is weak.

## Change for next attempt
Per `iteration.md`, one change: **state each missing memory point twice — once
in that figure's IDENTITY line and again as a dedicated focal sentence** — and
phrase them positively as shapes rather than as modifications of a known
garment ("two empty sleeves hang from her waist and are tied in a knot in front
of her stomach", not "coverall worn off the shoulders"). Miya's head ratio is
folded into the same pass as an explicit "her head is as large as her torso".
