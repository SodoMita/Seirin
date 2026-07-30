# 02 — Sprite recovery (yuki), 2026-07-28

## Context
`yuki_card.png` (Yuki Tenro 天狼 雪, 19, Kendo Instructor & Archivist,
167 cm — card text) was installed as the runtime sprite (no alpha).
Re-generated.

## Identity (from the kept card)
Long straight black hair, calm grey eyes, dark navy kendo gi with black
armour (do) and maple-leaf embroidery, Tenrokan crest, cloth-wrapped shinai
case on a back strap, zori sandals.

## White plate — `plates/yuki_white.png`
> Anime visual novel character standing sprite portrait of Yuki Tenro
> (19 years old kendo instructor and archivist), full body standing pose in
> 9:16 vertical aspect ratio, long straight black hair, wearing a dark blue
> martial arts gi with tactical armor plates, carrying bamboo sword case,
> plain solid pure white background #FFFFFF, isolated character cutout

with `yuki_card.png` attached. Result: kept.

## Black plate — `plates/yuki_black.png`
> Same character sprite in identical pose, position and clothing in 9:16
> vertical aspect ratio, on plain solid pure black background #000000,
> isolated character cutout  (white plate attached)

First attempt FAILED — came back with a white background again (plate not
registered). Regenerated with "replace the entire white background with a
plain solid pure black background #000000, dark background" — kept.

## Matte
`tools/resize_and_triangulate.py` white+black -> `yuki_matted.png` +
`yuki_alpha.png`. check_matte: 21.7% opaque / 61.9% clear / 16.4% partial,
no WARN. Navy hakama reads cleanly over the black background. ->
`yuki_normal.png` (runtime sprite), copied to
`game/assets/characters/yuki_normal.png`.
