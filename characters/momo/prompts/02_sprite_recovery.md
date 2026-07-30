# 02 — Sprite recovery (momo), 2026-07-28

## Context
`momo_card.png` (Momo Hoshizora 星空 もも, 15, 152 cm — card text) was the
only asset and had been installed as the runtime sprite (no alpha). The white
/black plates from the earlier session were never pushed. Re-generated.

## Identity (from the kept card)
Pink twin tails with star hairpins, pink eyes, black choker with star
pendant, oversized pastel star-pattern hoodie over idol outfit, star boots.

## White plate — `plates/momo_white.png`
> Anime visual novel character standing sprite portrait of Momo Hoshizora
> (15 years old synth-pop idol girl, 152 cm petite), full body standing pose
> in 9:16 vertical aspect ratio, long pink twin tails with star hairpins,
> pink eyes, cheerful open smile, wearing oversized pastel hoodie with star
> patterns over colorful idol outfit, black choker with star pendant, plain
> solid pure white background #FFFFFF, isolated character cutout

with `momo_card.png` attached as identity reference. Result: kept.

## Black plate — `plates/momo_black.png`
> Same character sprite in identical pose, position and clothing in 9:16
> vertical aspect ratio, on plain solid pure black background #000000,
> isolated character cutout  (white plate attached)

## Matte
`tools/resize_and_triangulate.py` white+black -> `momo_matted.png` +
`momo_alpha.png`. check_matte: 18.9% opaque / 6.9% clear / 74.2% partial —
the "soft edges drift" WARN is a **false positive** here: her entire palette
is pastel, so soft anti-aliased edges sit far from the body mean colour.
Visual inspect over white / black / mid-grey / magenta: silhouette intact,
no ghosting. -> `momo_normal.png` (runtime sprite), copied to
`game/assets/characters/momo_normal.png`.
