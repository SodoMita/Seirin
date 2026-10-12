# 06_light_triangulate — hana (light outfit, matte)

Tool: tools/triangulate_matte.py (white + black plates), then tools/check_matte.py --checks.
Result: 20.05% opaque, 72.41% clear, 7.54% partial. Visual check over 7 backgrounds
(#FFFFFF, #000000, #808080, #FF00FF, #00B140, #0F5F63, #C8A882): no fringing, halo or ghosting.
Warning reported: "soft edges drift 0.56 from the body colour". Judged a FALSE POSITIVE:
pastel palette with dark outline pixels, the same case recorded for Momo (02_sprite_recovery).
Verdict: KEEP.
Promoted: hana_light_matted.png, hana_light_alpha.png, hana_light_normal.png (characters/),
hana_light_normal.png (game/assets/characters/).
Deviation: the canvas is 768 x 1376 (about 1:1.79), not the 1:2 spec. This is generator drift. The file is smaller than the 1024 x 2048 delivery cap, so it was not upscaled.
