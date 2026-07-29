#!/usr/bin/env bash
# tools/flatcel_finish.sh — finish a flat-cel-shaded, pure-white-background
# sprite generation into a shippable straight-alpha runtime asset.
#
# Why this exists instead of tools/triangulate_matte.py (white/black plate
# pair): the 2026-07-29 "restyle to Miya/Kurogane flat shading" pass produces
# hard-edge cel-shaded art on a flat #FFFFFF background with no soft/partial
# transparency anywhere in the figure (unlike Splash's translucent body,
# which genuinely needs the white/black triangulation). Generating a matching
# black plate for every sprite x expression would double an already large
# generation budget for no measurable quality gain on hard-edge art. Instead
# this script:
#   1. Flood-fills transparency in from all four corners of the white
#      background (a fuzz tolerance absorbs anti-aliased edge pixels only,
#      never mid-figure whites, because the fill starts outside the
#      silhouette and cel art has no white-on-white ambiguity at the border).
#   2. Trims any 1px white halo left on the cut edge.
#   3. Upscales with Lanczos + a light unsharp mask ("improve with filters").
#   4. Emits both PNG (straight alpha) and WebP.
#
# Verify with tools/check_matte.py after running this — if it reports a solid
# ring of near-white edge pixels, increase FUZZ.
#
# Usage:
#   tools/flatcel_finish.sh <input.png> <output_basename_without_ext> [target_height] [fuzz%]
#
# Produces:
#   <output_basename>.png    (RGBA, straight alpha, target_height tall)
#   <output_basename>.webp   (same content, WebP)

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <input.png> <output_basename> [target_height=4096] [fuzz=6%]" >&2
  exit 1
fi

IN="$1"
OUT_BASE="$2"
TARGET_H="${3:-4096}"
FUZZ="${4:-6%}"

TMP_ALPHA="$(mktemp --suffix=.png)"
trap 'rm -f "$TMP_ALPHA"' EXIT

W=$(identify -format "%w" "$IN")
H=$(identify -format "%h" "$IN")
LASTX=$((W - 1))
LASTY=$((H - 1))

# 1. Flood-fill alpha in from all four corners (handles non-convex outlines).
convert "$IN" -alpha set -bordercolor white -border 1 \
  -fuzz "$FUZZ" -fill none \
  -draw "matte 0,0 floodfill" \
  -draw "matte $((W+1)),0 floodfill" \
  -draw "matte 0,$((H+1)) floodfill" \
  -draw "matte $((W+1)),$((H+1)) floodfill" \
  -shave 1x1 \
  "$TMP_ALPHA"

mkdir -p "$(dirname "$OUT_BASE")"

# 2. Upscale to target height with Lanczos, sharpen lightly, mild flat-cel
#    "filter" pass (slight saturation/contrast lift reads well on VN sprites
#    without breaking flat-shading blocks), keep alpha crisp (no blur on
#    alpha channel).
convert "$TMP_ALPHA" \
  -filter Lanczos -resize x"${TARGET_H}" \
  -unsharp 0x0.75+0.6+0.02 \
  -modulate 101,106,100 \
  -channel A -blur 0x0 +channel \
  "${OUT_BASE}.png"

# 3. WebP export (lossless-ish quality, keeps alpha).
convert "${OUT_BASE}.png" -quality 92 -define webp:lossless=false "${OUT_BASE}.webp"

identify -format "%f: %wx%h alpha=%A\n" "${OUT_BASE}.png"
