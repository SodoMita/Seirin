# 04 — Boots variant (momo), 2026-07-28

## Context
The default runtime sprite (see `03_closed_shoes_redo.md`) wears closed white
high-top **sneakers** with thigh-high stockings. A second footwear design had
been generated in the same session: **closed-toe knee-high white idol boots
with pink stars and bows**. The project owner asked to keep that version under
a name that says what it is. It is now the `boots` wardrobe variant
(taxonomy: `<id>_<variant>_<expression>` → `momo_boots_normal.png`).

## Plates — `plates/momo_boots_white.png` / `plates/momo_boots_black.png`
White plate (identity: `momo_card.png` attached):
> Anime visual novel character standing sprite portrait of Momo Hoshizora
> (15 years old synth-pop idol girl, 152 cm petite), full body standing pose
> in 9:16 vertical aspect ratio, long pink twin tails with star hairpins,
> pink eyes, cheerful open smile, wearing oversized pastel hoodie with star
> patterns over colorful idol outfit, black choker with star pendant,
> **closed-toe knee-high white idol boots with pink star buckles and ribbon
> bows**, plain solid pure white background #FFFFFF, isolated character cutout

Black plate:
> Same character sprite in identical pose, position and clothing in 9:16
> vertical aspect ratio, on plain solid pure black background #000000,
> isolated character cutout  (white plate attached)

## Matte
`tools/resize_and_triangulate.py` white+black -> `momo_boots_matted.png` +
`momo_boots_alpha.png`. check_matte: 17.2% opaque / 61.0% clear / 21.8%
partial; soft-edge drift WARN 0.43 — same known **false positive** as the
main matte (all-pastel palette puts soft hair edges far from the body mean).
Visual pass over white / black / mid-grey: clean edges, boots intact.
`momo_boots_normal.png` kept as the wardrobe-variant sprite; the game
continues to run the sneakers default.

## Naming fallout
The exploration file `plates/momo_white_v2.png` never entered git with its
scratch name — it was renamed **before** commit: version suffixes are only
for tombstones (`_v1_retired`, `_v1_superseded`); live variants say *what
they are* (`boots`), not *which attempt* (`v2`).
