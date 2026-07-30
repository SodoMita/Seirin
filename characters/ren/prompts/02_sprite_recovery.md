# 02 — Sprite recovery (ren), 2026-07-28

## Context
The female pilot design (`ren_reference_sheet_v1_retired.png`) was retired by
the project owner: as a woman, Ren reads as a copy of an existing copyrighted
character (red-haired plugsuit pilot). The owner's original male card had been
generated in an earlier session but never pushed; the prompt was recovered
verbatim from the owner and re-run.

## Identity (from the owner's recovered prompt)
Ren Akatsuki, 17 — handsome male mechanic apprentice. Dark short hair, fierce
amber eyes. Dark mechanic jumpsuit with utility belt and glowing tool
holsters. Determined brave expression.

## Card (complex-background reference — step 1 of the pipeline)
`ren_card.png` — generated to:
> Anime visual novel sprite character portrait, Ren Akatsuki (17 years old),
> handsome young male mechanic apprentice, dark short hair, fierce amber eyes,
> wearing a dark mechanic jumpsuit with utility belt and glowing tool
> holsters, determined brave expression, highly detailed anime key art,
> colorful background of industrial workshop with glowing cyan holographic
> repair schematics

Result: kept. Industrial workshop + cyan holographic schematics, card-style
text overlays (name / role / quote / traits) — classified `_card`.

## White plate (step 2) — `plates/ren_white.png`
> Anime visual novel character standing sprite portrait of Ren Akatsuki (17
> years old male mechanic apprentice), full body standing pose in 9:16
> vertical aspect ratio, dark short messy hair, fierce amber eyes, determined
> brave expression, wearing dark black mechanic jumpsuit with red piping and
> red Redline Customs chest patch, utility belt with glowing cyan tool
> canisters, dog tags, black gloves with red accents holding a wrench, plain
> solid pure white background #FFFFFF, isolated character cutout

with `ren_card.png` attached as identity reference. Result: kept — full body,
identity held (jumpsuit, dog tags, glowing canisters, wrench, boots).

## Black plate (step 3) — `plates/ren_black.png`
> Same character sprite in identical pose, position and clothing in 9:16
> vertical aspect ratio, on plain solid pure black background #000000,
> isolated character cutout

with `plates/ren_white.png` attached. Result: kept — registered, black bg clean.

## Matte (step 4)
```bash
python3 tools/resize_and_triangulate.py \
  characters/ren/plates/ren_white.png characters/ren/plates/ren_black.png \
  characters/ren/ren_matted.png characters/ren/ren_alpha.png
```
check_matte: 15.0% opaque / 63.4% clear / 21.6% partial; no contamination WARN.
Visual: clean over white and black. -> `ren_normal.png` (runtime sprite),
copied to `game/assets/characters/ren_normal.png`.
