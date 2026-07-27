# Style test result — 2.5D removed

Owner: "different shading, art style of sprites. 2.5d appeared not what needed,
so prefer more stylized."

## Root cause: the style_bible contradicted itself
It asked for "2D flat-design language" and "no 3D-realist rendering" while
specifying, in the same block, "restrained gradient in the shadow core" and a
"rim light separating the figure" — and the hero template added "cinematic
lighting and depth of field". Gradient + rim light + cinematic = 2.5D.
The words said flat, the parameters said rendered, and the generator obeyed the
parameters. My fault: I wrote the words and kept the parameters.

## Measured, four candidates vs the rejected render
| style | colours | soft-ramp % | hard-edge % |
|---|---|---|---|
| OLD 2.5D painterly (rejected) | 1076 | 33.9 | 1.7 |
| A hard cel | 584 | 11.5 | **7.6** |
| B flat vector | **439** | **5.7** | 6.6 |
| C woodblock flat | 427 | 19.5 | 3.1 |
| D gouache flat | 562 | 9.2 | 6.1 |

The rejected render has ~6x the soft-gradient area and ~1/4 the crisp edges of
the flat candidates. **That ratio is the 2.5D look**, and it is now a measurable
acceptance test rather than a matter of taste.

## What actually produces flat
Remove the volume CUES; do not merely ask for "flat".
1. State a COUNTED number of tones ("exactly two tones per colour").
2. Demand hard-edged shadow SHAPES with drawn boundaries.
3. Explicitly ban rim light, specular, ambient occlusion, depth of field, glow.
4. Keep a visible ink line of even weight.

## Assigned
- sprites + expressions -> A hard cel (crisp edges also matte cleanly)
- chibi / UI / merch     -> B flat vector (flattest; best at 64px)
- hero / key visual      -> C woodblock flat (most distinctive on a store page)
- quiet CGs              -> D gouache flat
- environments may stay more rendered than figures; that contrast IS the style.
