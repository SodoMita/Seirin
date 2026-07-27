# Pencil / hand-painted style test — 2026-07-27

Owner: "Try pencil handpainted style."

Four points across the pencil / hand-painted range, same character (Ren), same
colour spec, style the only variable.

| id | style | colours | soft% | grain | read |
|---|---|---|---|---|---|
| E | coloured pencil + light wash | 577 | 34.1 | 1.66 | delicate, illustrative |
| F | pencil sketch + coloured pencil | 503 | 21.7 | 1.26 | sketchbook / settei |
| **G** | **pencil line + flat colour** | **414** | 29.7 | 1.63 | **production art** |
| H | gouache + pencil, painterly | 672 | 54.1 | 6.52 | most painterly, loosest |

Reference points: OLD rejected 2.5D = 1076 colours / 33.9 soft / 3.34 grain.
A hard cel (previous test) = 584 / 11.5 / 0.59.

## Reading the numbers honestly
`soft%` counts gentle luminance ramps, and **pencil grain registers there just
like volumetric shading does**. So a high soft% no longer means "2.5D" once
hand texture is in play — it must be read together with `grain` and with the
colour count. G has the LOWEST colour count of any style tested (414, below even
flat vector's 439) while carrying real pencil texture: flat colour, handmade line.

⚠️ **A refinement I attempted and discarded.** I tried to separate "volume
shading" from "grain" by blurring, first whole-frame then figure-only. Both
versions ranked the rejected 2.5D render as FLATTER than hard cel, which is
visibly false — resampling each figure to a fixed size changed the
spatial-frequency scale per image, so the numbers were not comparable. The
metric is not trustworthy and is not used. The first-pass metric (colour count +
soft/hard at native scale) plus eyes is what these conclusions rest on.

## Recommendation: G — pencil line over flat colour
- Only the LINE is hand-drawn: rough graphite contour, visible pressure
  variation, construction marks left in. The COLOUR stays flat and clean.
- Lowest colour count of anything tested, so it survives downscaling and mattes
  predictably — the crisp colour boundary is still there under the soft line.
- Keeps the "more stylized" direction while adding warmth the cel styles lack.
- It is also the traditional anime settei / production-art look, which suits a
  franchise whose own documents are full of 設定資料集 references.

## Production caveats, stated before anyone commits
1. **Matting.** Pencil edges are semi-transparent by nature. The white/black
   triangulation pipeline will read grain as partial alpha — which is CORRECT
   and will look right, but the plates must be generated as an edit of one
   another or the grain will not register between them.
2. **Expression differentials.** Hand-drawn line does not repeat exactly. Head
   crops must be composited inside the locked face box rather than regenerated,
   or the line texture will visibly swim between expressions.
3. **Grain scale must be fixed per delivered size.** Paper texture generated at
   2048px and downscaled to 1024 halves the apparent grain. Set the grain at
   delivery resolution, not master resolution.

Fallback if those bite: A hard cel for runtime sprites, G reserved for hero
art and CGs — G's warmth matters most where the player lingers.
