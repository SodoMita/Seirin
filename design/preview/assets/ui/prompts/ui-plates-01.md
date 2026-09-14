# UI plate generation session 01 — three-ui prototype

**Date:** 2026-09-13 · **Harness:** `design/preview/three-ui-demo.html`
**Destination:** `design/preview/assets/ui/` (webp, q90). Sources kept in `_wip/`
(throwaway, mirrors the `characters/*/_wip/` convention).

The generator cannot emit alpha, and over `file://` a WebGL texture upload from
a local image throws a SecurityError in Chromium (tainted origin). Both facts
shape how these plates are used:

- **"On black" art is screen-blended** (`mix-blend-mode: screen`): pure black
  becomes transparent for free, no alpha needed. Used for the wear sheet, the
  emblem, the reactor core.
- **Opaque art is a surface**: `background-image` for panels and the console,
  `border-image` 9-slice for keys (the bevel must not stretch).
- **Nothing here is uploaded to WebGL.** The 3D layer is 100% procedural GLSL,
  so the prototype stays double-clickable from `file://`.

---

## 01 · `ui_plate_armour.webp` — seamless panel surface

> Seamless tileable texture of dark gunmetal mecha armour plating for a sci-fi
> visual novel interface. Brushed anisotropic steel with fine grain running
> horizontally, deep panel seams and chamfered bevel edges, a few recessed hex
> bolt heads in orderly rows, subtle oil staining and micro-scratches. Single
> cool key light from the upper left, cyan-tinted rim reflection, values kept
> mid-dark so white text stays readable on top. Absolutely no text, no letters,
> no numbers, no logos, no watermark. Orthographic flat material study, high
> detail, 4k, game UI asset.

**Result:** accepted as-is. Tiles cleanly at 512px; dark enough for 12:1 text.
Used as the surface of every panel (`background-repeat: repeat`).

## 02 · `ui_plate_wear.webp` — wear overlay (screen-blend)

> Wear and damage overlay sheet drawn purely as light grey and white marks on a
> completely pure black background, intended to be screen-blended over metal.
> Scattered fine scratches, small dents with bright lips, chipped paint flakes,
> faint rust bloom stippling, grease smears, thin stencilled hash marks and
> abstract industrial glyphs (not readable letters). Marks are sparse,
> irregular, hand-worn, occupying about a third of the frame, with soft
> falloff. No colour, monochrome white on black only. No readable text, no
> logos, no watermark. Flat 2D texture sheet, high detail.

**Result:** accepted as-is. Blended at 12–18% opacity with `mix-blend-mode:
screen` so panels keep their bruises without washing out the text. The fake
stencils are illegible by design — readable glyphs would look like typos.

## 03 · `ui_emblem_resonance.webp` — resonance sigil (screen-blend)

> Glowing emblem crest on a pure black background: a hexagonal resonance sigil
> made of thin machined linework, concentric broken rings, a central faceted
> crystal core emitting cyan light, fine radial tick marks around the outer
> ring like an instrument bezel, delicate bloom and light spill. Monochrome
> cyan and pale white glow only, no other colours, no background detail, pure
> black surround so it can be screen-blended. No text, no letters, no numbers,
> no logos, no watermark. Vector-sharp sci-fi heraldry, centred, symmetrical,
> high detail.

**Result:** accepted as-is. The hero of the set — sits over the title logo and
in the HUD brand cluster; the 3D layer spins ring geometry *behind* it so the
linework parallax-slides over live metal.

## 04 · `ui_reactor_core.webp` — reactor glow (screen-blend)

> A glowing sci-fi reactor core floating on a pure black background: brilliant
> cyan-white plasma sphere at the centre, wrapped in three thin concentric
> metal rings at different tilts, crackling energy arcs and filaments reaching
> outward, faint hexagonal containment field shimmer, volumetric bloom and
> light spill. Cyan and pale amber highlights only, deep black surround so it
> can be screen-blended over UI. No text, no letters, no numbers, no logos, no
> watermark. Centred, cinematic, high detail concept art.

**Result:** accepted as-is. Title-screen aura behind the wordmark, and the
static fallback stand-in for the procedural plasma sphere when WebGL is off.

## 05 · `ui_title_art.webp` — title key visual

> Cinematic hero backdrop for a sci-fi visual novel title screen: a night
> harbour city seen from a rooftop, rain-slicked metal, towering antenna masts
> and a distant gothic cathedral spire, thin cyan resonance beams and
> data-light ribbons crossing the sky, a huge silhouetted mecha shoulder and
> head emerging from shadow at the right edge with a single amber warning
> light, low fog, wet reflections, deep navy and teal palette with sparse amber
> accents. Dark, moody, high contrast, empty space in the upper left for a
> title. Anime-flavoured painterly concept art in the style of a modern
> Japanese visual novel key visual. No text, no letters, no numbers, no logos,
> no watermark, no UI elements.

**Result:** accepted as-is. Reads exactly like the shipped `backgrounds/`
family; the empty upper-left takes the wordmark with a gradient scrim.

## 06 · `ui_console_plate.webp` — dialogue console surface

> Seamless horizontal texture of a dark machined cockpit console surface for a
> dialogue box: near-black anodised aluminium with very fine brushed grain, a
> single thin amber inlay line running horizontally near the top, faint etched
> hexagonal micro-pattern, extremely subtle CRT scanlines, gentle vignette
> darker at the bottom, values very dark so white dialogue text stays
> readable. Flat orthographic material study, no perspective. No text, no
> letters, no numbers, no logos, no watermark. Game UI asset, high detail.

**Result:** accepted as-is. Stretched over the dialogue box; the amber inlay
becomes the console's top light bar.

## 07 · `ui_button_plate.webp` — key cap, 9-sliced

> A single chamfered sci-fi interface key cap on a pure black background, seen
> straight on: dark gunmetal plate with 45 degree cut corners, crisp machined
> bevel catching a cool cyan edge light along the top and left, a thin recessed
> groove near the rim, two tiny recessed hex bolts at the far left and right,
> faint brushed grain, soft specular highlight, subtle cyan glow spilling onto
> the black surround. Centred, filling most of the frame, isolated object, pure
> black background so it can be screen-blended. No text, no letters, no
> numbers, no logos, no watermark. Product-shot quality game UI asset, high
> detail.

**Result:** accepted, then **trimmed at ingest**: `convert -crop 631x648+382+50`
removes the black surround (measured plate bounds x 27.6–71.5%, y 7.3–90.1%).
The committed webp is the trimmed plate; the untrimmed source stays in `_wip/`.
Reason: `border-image` slice regions start at the image edge, so any surround
inside the slice is drawn as a black foam frame around every key. Used through
`border-image: … 64 78 64 78 fill` with ONE uniform `border-image-width`
(`--key-b`). The 78px side slice is measured: it puts the plate's two hex
bolts inside the side EDGE patches, leaving a plain brushed face as the
middle patch — with a 64px side slice the bolts sat in the middle and any
tiling repeated them like a frieze. Corners scale uniformly, edges stretch
along their own axis, the middle stretches (a downscale at every shipped key
size): a correct corner/edge/middle split, so a 26px key and a 90px key wear
the same machined bevel. On `file://` the black surround is trimmed by
the slice; over http it could also be screen-blended.

## 08 · `ui_hud_instruments.webp` — instrument bay face plate

> A dark instrument bay face plate for a mecha HUD, straight-on flat view on a
> pure black background: three circular recessed gauge wells in a row with
> etched arc tick segments around each rim, small round LED recesses between
> them, a rectangular radar well on the left with faint concentric rings,
> machined chamfers and thin cyan-tinted rim lighting, fine brushed metal
> grain, a few recessed hex bolts at the corners. Empty gauge faces with no
> needles and no markings other than abstract tick lines. Monochrome dark
> steel with cyan glow accents. No text, no letters, no numbers, no logos, no
> watermark. Game UI asset, high detail, flat material study.

**Result:** accepted, then **retired from the bay** in session 12: its wells
are painted at fixed positions, so any sizing either stretches the plate or
misaligns the wells under the live 3D gauges — and `100% 100%` was exactly the
stretch this prototype exists to avoid. The bay now wears the HUD panel's
tiled armour; the instruments are the 3D layer. The plate stays in the set as
the reference for what the 3D bay replaces.
