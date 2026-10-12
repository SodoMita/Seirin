# 14–27 — hana expression differentials (placeholder set, complete)

Method: head-only edits generated from the SAME outfit plate (never chained), then
tools/face_differential.py composites the changed pixels inside the locked face box
(x 250–520, y 180–360 in the 768x1376 canvas) onto the approved matted sprite. The sprite's
own alpha is kept everywhere. Changed pixels outside the box (about 400–500 per image,
body-wide generator noise) are discarded.

Format: deliverables are lossless WebP (exact=True). No PNG is shipped. The _wip/ intermediates
are PNG only because the generator outputs JPG or PNG; they are gitignored.

Light (plate: plates/hana_light_white.webp, base: hana_light_matted.webp):
- 14 smile — KEEP. Closed-mouth smile. -> hana_light_smile.webp
- 15 grin — KEEP. Teeth showing, eyes narrowed. -> hana_light_grin.webp
- 16 angry — KEEP. Brows down, firm frown. -> hana_light_angry.webp
- 17 sad — KEEP. Brows raised at inner ends. -> hana_light_sad.webp
- 18 surprise — KEEP. Eyes wide, brows high. -> hana_light_surprise.webp
- 19 blush — KEEP. Light blush, averted eyes. -> hana_light_blush.webp
- 20 serious — KEEP. Flat mouth, level brows. -> hana_light_serious.webp
Light neutral = hana_light_normal.webp (base).

Dark (plate: plates/hana_dark_v4_summer_white.webp, base: hana_dark_matted.webp):
- 21 smile — KEEP. -> hana_dark_smile.webp
- 22 grin — KEEP. Teeth showing; seven-background check clean. -> hana_dark_grin.webp
- 23 angry — KEEP (composite). -> hana_dark_angry.webp
- 24 sad — KEEP (composite). -> hana_dark_sad.webp
- 25 surprise — KEEP (composite). -> hana_dark_surprise.webp
- 26 blush — KEEP (composite). -> hana_dark_blush.webp
- 27 serious — KEEP (composite). -> hana_dark_serious.webp
Dark neutral = hana_dark_normal.webp (base).

Status: PLACEHOLDER. Core eight complete for both outfits (neutral + seven). Not approved.
Matte report for all five new dark expressions matches the dark base (7.32 / 71.93 / 20.75%).
Seven-background sheet viewed for dark angry: clean. Sheet produced but not yet viewed for dark serious.
Sad, surprise and blush have a report only, no sheet yet.
