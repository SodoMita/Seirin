# Style test — kill the 2.5D, find the sprite style

Owner direction 2026-07-27: the painterly / 2.5D render is wrong. Sprites must
be MORE STYLIZED.

## Diagnosis: the style_bible contradicts itself
It asks for "2D flat-design language" and "no 3D-realist rendering", but in the
same breath specifies:
- "restrained gradient in the shadow core"  -> gradients read as volume
- "rim light separating the figure"          -> rim light is a 3D lighting cue
- "cinematic lighting and depth of field" (hero template)

Gradient + rim light + cinematic = 2.5D. The words said flat; the parameters
said rendered. The generator obeyed the parameters.

## What actually produces flat
Remove volume cues, don't just ask for "flat":
- HARD-EDGED shadow shapes, no soft transition, no airbrush, no gradient
- a COUNTED number of tones (2 or 3 total per colour, stated as a number)
- visible ink line of even weight
- no rim light, no ambient occlusion, no specular sheen, no depth of field
- shadow as a SHAPE with a drawn edge, not as a falloff

## Candidates, one character (Ren), identical spec, style is the only variable
A. Hard cel / TV-anime cel — exactly 2 tones per colour, hard shadow edges
B. Flat vector graphic — solid fills, bold uniform outline, near-zero shading
C. Woodblock / ukiyo-e flat — flat colour + texture grain + ink line
D. Gouache storybook flat — matte flat shapes, thick line, no gloss
