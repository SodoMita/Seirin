# Prompt idiom v3 — default model style, contrast-led

Owner direction 2026-07-27:
"What it outputs without stylization is better even though not best. So lets
work with nanobanana default style constraints. Make dark colors darker while
bright are brighter, adjust clothing, boots, body shapes. You can send more
character info and art goals to image generator. Repeating things and obvious
parts, especially constraints, can be removed."

## What changes
1. NO style-forcing block. No "flat cel", no "2 tones", no "ukiyo-e", no
   "painterly". Let the model render in its own default idiom and spend the
   words elsewhere.
2. VALUE RANGE is now stated explicitly and is the main colour instruction:
   push darks darker and lights brighter — full range, deep shadow to bright
   highlight. This is contrast, NOT saturation; the saturation work already
   landed (cast mean 0.676).
3. CUT the boilerplate. Removed from every prompt:
   - "no text/watermark/logo/UI/border" — the model does not add these here
   - "no fused or extra fingers" — restating it does not prevent it
   - long global forbidden lists repeated per figure
   - restating flatness/lighting/canvas conventions
   Kept ONLY the exclusions that are character-specific and load-bearing:
   the minors' coverage rule, Kitsune's "costume not anatomy", Splash's
   non-anatomical torso, Ryuki's skin dignity.
4. SPEND the recovered budget on: who the person is, what they do, why the
   garment exists, how it is constructed, what the boots are for, and the
   actual body shape. The model renders character better when it knows the
   character.
5. BODY SHAPE stated plainly per figure — build, posture, weight distribution,
   what their work did to them. Previously implied; now explicit.
6. BOOTS/FOOTWEAR called out separately. They were the vaguest item in v1/v2
   and read as generic every time.
