# 14–27 — hana expression differentials (placeholder set)

Method: head-only edits generated from the SAME outfit plate (never chained), then
tools/face_differential.py composites the changed pixels inside the locked face box
(x 250–520, y 180–360 in the 768x1376 canvas) onto the approved matted sprite. The sprite's
own alpha is kept everywhere. Changed pixels outside the box (≈400 per image, body-wide
generator noise) are discarded.

Light (plate: plates/hana_light_white.png, base: hana_light_matted.png):
- 14 smile — KEEP. Closed-mouth smile. -> hana_light_smile.png
- 15 grin — KEEP. Teeth showing, eyes narrowed. -> hana_light_grin.png
- 16 angry — KEEP. Brows down, firm frown. -> hana_light_angry.png
- 17 sad — KEEP. Brows raised at inner ends. -> hana_light_sad.png
- 18 surprise — KEEP. Eyes wide, brows high. -> hana_light_surprise.png
- 19 blush — KEEP. Light blush, averted eyes. -> hana_light_blush.png
- 20 serious — KEEP. Flat mouth, level brows. -> hana_light_serious.png
Light neutral = hana_light_normal.png (base).

Dark (plate: plates/hana_dark_v4_summer_white.png, base: hana_dark_matted.png):
- 21 smile — KEEP. -> hana_dark_smile.png
- 22 grin — KEEP. Teeth showing; checked on seven backgrounds, edges clean. -> hana_dark_grin.png
- 23–27 angry, sad, surprise, blush, serious — NOT GENERATED. The per-turn image limit (10) was reached.
  Next turn: generate from prompts 23_dark_angry.txt .. 27_dark_serious.txt (already saved), input
  plates/hana_dark_v4_summer_white.png, output to _wip/, then composite with tools/face_differential.py.
Dark neutral = hana_dark_normal.png (base).

Status: PLACEHOLDER. Expression set is incomplete for dark (7 of 8 needed). Not approved.
