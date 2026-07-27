# 06_mountain_v2_bright_env — Yuki + Ryuki

Output: `mountain_v2_bright.png`. **Verdict: KEEP** — direction confirmed.

## Measured, not asserted
| | v1 (green field) | v2 (bright + env) | change |
|---|---|---|---|
| Yuki garment saturation | 0.204 | **0.570** | **2.8x** |
| Ryuki garment saturation | 0.379 | **0.477** | 1.26x |
| cast mean (registry hexes) | 0.409 | **0.578** | — |

## What the owner was right about
1. **Dull palette.** Confirmed numerically. 10/14 characters were below 0.45
   saturation. The three figures rated good — splash 0.84, stella 0.69,
   kitsune 0.65 — were *exactly* the three most saturated in the cast. Perfect
   rank correlation between "looks good" and "is saturated".
2. **Green background was a mistake.** The flat `#00B140` field gave the model
   no colour to react to and it returned neutral, safe clothing every time.
   A supportive colour environment produced a 2.8x saturation lift on Yuki with
   no other change to her design.
3. **Characters too similar.** Root cause found: all three v1 sheets shared one
   identical STYLE block, one flat field and one lighting sentence. Same input,
   same output. Not caused by editing — all v1 generations were text-to-image
   from scratch, no reference image passed — but the effect was the same as if
   they had been.
4. **Mountain faction was a miss.** Root cause: v1 applied design-doc 10.1's
   ENVIRONMENT palette (cedar/slate/fog) directly to the PEOPLE. That is
   backwards — `qa-checklist.md` requires a character read AGAINST her
   environment. Mountain villagers in fog are the brightest thing in frame;
   that is what dyed festival textile is FOR. Landscape stays desaturated,
   people do not.

## Technique promoted
**Split the saturation budget between figure and ground.** State explicitly that
the environment is soft/misty/low-saturation AND that the figures are the most
colourful objects in the frame. Naming both halves is what produced the lift —
asking only for "bright characters" on a neutral field did not.

## Remaining
- Yuki's hair came out blue rather than blue-black, matching Ryuki's too closely
  — the two now read as related by hair colour, which is wrong. Next pass: Yuki
  to true black.
- Ryuki's dragon head still lacks the three mismatched repairs.
- Yuki's jade eyes are correct but her haori is flatter green than the specified
  aotake; push toward teal.
