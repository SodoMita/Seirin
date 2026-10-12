# 14–27 — hana expression sprites (placeholder set, mask method)

Status: PLACEHOLDER. Core eight complete for both outfits (neutral + seven). Not approved.

## Method (replaces the failed face-box blend)
- The first attempt blended changed pixels into the neutral sprite inside the face box. It
  produced doubled eyes (ghosting) and was rejected by the owner. The tool is removed.
- Second attempt: tools/expression_mask.py. Each expression plate (generated from the same
  white plate, prompts 14–27) is checked for registration against the neutral plate
  (body region residual 1.1–1.6 in 255, shift 0). Alpha is always the neutral sprite's own
  matte. Inside the face box (250–520 x 180–360), colour comes from the expression plate.
  Partial-alpha edge pixels are un-composited over white (c = (E − 255(1−a)) / a), which removed
  the dotted outline artefact. The box edge is feathered (6 px). Outside the box the neutral colour is kept.
- Not triangulated per expression. The expression sprites use the neutral's matte, not
  white/black triangulation. Per-expression triangulation would need 14 black-plate
  generations (prompts 28–41, saved, NOT RUN).

## Verified
- Light and dark sets viewed at face size (neutral, grin, angry, sad): no ghosting, no dotted lines.
- Alpha identical to the neutral sprite for all 16 shipped sprites (light 20.05/72.41/7.54%,
  dark 7.32/71.93/20.75%).
- Seven-background sheet viewed for light grin (before the edge fix) and dark angry (mask
  method not yet sheet-checked). Recheck before promotion.

## Files
Light (base: hana_light_normal.webp, white plate: plates/hana_light_white.webp):
  smile, grin, angry, sad, surprise, blush, serious -> hana_light_<expr>.webp
  expression plates: plates/hana_light_<expr>_white.webp
Dark (base: hana_dark_normal.webp, white plate: plates/hana_dark_v4_summer_white.webp):
  smile, grin, angry, sad, surprise, blush, serious -> hana_dark_<expr>.webp
  expression plates: plates/hana_dark_<expr>_white.webp
All shipped copies in game/assets/characters/.
