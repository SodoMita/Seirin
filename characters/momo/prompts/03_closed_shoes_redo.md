# 03 — Closed-shoes redo (momo), 2026-07-28

## Why
The 02 sprite's toe-less star boots read as bare feet. Owner call: not a
"tacit bare-feet trope" — the idol must wear clearly closed shoes. (Note:
open-toe/footless footwear does exist as a real style, but on this sprite it
did not read as footwear at all.)

## Plates — `plates/momo_white.png` / `plates/momo_black.png`
White prompt = the 02 prompt plus, verbatim:
"…wearing fully closed white high-top sneakers with star decals and pink
laces, closed shoes covering the feet completely"
(card attached as identity reference; black plate edited from the white.)

## Matte
Plate backgrounds normalized with `tools/normalize_plates.py`, then
`resize_and_triangulate.py` → 13.5% opaque / 65.4% clear.
check_matte still prints "soft edges drift 0.51" — again a **false
positive** of the pastel palette (hair/stars/hoodie are all low-saturation,
so soft edge pixels sit far from the body mean). Verified visually over
white / black / mid-grey / magenta: silhouette intact, sneakers clearly
shoes. Installed as `momo_normal.png` (characters + game assets).
