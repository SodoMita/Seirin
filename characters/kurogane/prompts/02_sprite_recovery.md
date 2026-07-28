# 02 — Sprite recovery (kurogane), 2026-07-28

## Context
`kurogane_card.png` (TAISHI KUROGANE 黒金大志, Chief Engineer / Executive
Officer, Akatomi Dynamics, 48) was installed as the runtime sprite (no
alpha). The white/black plates from the earlier session were never pushed.
Re-generated to the same prompts the earlier session used (recovered from
the project owner's paste).

## Identity (from the kept card)
48 y.o. CEO — sharp swept-back grey hair, stern narrow eyes, tall
broad-shouldered build, tailored dark charcoal suit, holographic lapel pin.

## White plate — `plates/kurogane_white.png`
> Anime visual novel character standing sprite portrait of Taishi Kurogane
> (48 years old Akatomi CEO), full body standing pose in 9:16 vertical
> aspect ratio, sharp grey hair, wearing a tailored dark charcoal suit with
> holographic lapel pin, plain solid pure white background #FFFFFF,
> isolated character cutout

with `kurogane_card.png` attached. Result: kept — arms-crossed full body,
identity held.

## Black plate — `plates/kurogane_black.png`
> Same character sprite in identical pose, position and clothing in 9:16
> vertical aspect ratio, on plain solid pure black background #000000,
> isolated character cutout  (white plate attached)

## Matte
`tools/resize_and_triangulate.py` white+black -> `kurogane_matted.png` +
`kurogane_alpha.png`. check_matte: 12.1% opaque / 72.1% clear / 15.8%
partial, no WARN. Visual over white/black: dark suit separates cleanly from
the black background. -> `kurogane_normal.png` (runtime sprite), copied to
`game/assets/characters/kurogane_normal.png`.
