#!/usr/bin/env bash
# ============================================================================
# ⚠️  SUPERSEDED 2026-07-29 — DO NOT USE FOR NEW WORK.
# Use tools/img_pipeline/run.sh instead (plain C, no ImageMagick). This file
# is kept only because OPERATIONS.md forbids deleting/overwriting existing
# repo history-adjacent tooling; it is not wired into any current workflow.
#
# Why it was retired: even after the upscale-before-matte ordering fix below
# was applied, ImageMagick's `-fuzz` corner flood-fill left a soft band of
# partial-alpha pixels along every line-art edge. That band was invisible in
# the PNG but WebP's lossy alpha compression requantized it into visible
# halftone/dither-looking noise — caught by the project owner in the first
# shipped batch (commit e0ea244). tools/img_pipeline/matte_floodfill.c fixes
# this with a real border-seeded BFS flood fill that produces a clean binary
# alpha plus exactly one antialiased feather ring, leaving nothing for lossy
# WebP compression to dither. See tools/img_pipeline/GLSL_ATTEMPT_NOTES.md
# and ai_agent_docs/skills/seirin-character-art/_session_notes.md for the
# full defect history and how it was verified fixed.
# ============================================================================
#
# tools/flatcel_finish.sh — finish a flat-cel-shaded, pure-white-background
# sprite generation into a shippable straight-alpha runtime asset.
#
# ORDER OF OPERATIONS MATTERS (see references/sprite-spec.md "Order of
# operations" and OPERATIONS.md's matting rule): upscale the still-OPAQUE
# white-background image first, THEN extract alpha at the final resolution.
# Extracting alpha (creating transparent pixels) and only afterwards
# upscaling is backwards — a resize filter blends each transparent pixel's
# arbitrary leftover RGB into neighbouring opaque edge pixels, which is
# exactly the fringing/halo defect the project's own spec warns about. An
# earlier version of this script matted-then-upscaled; fixed 2026-07-29
# after a review caught faint fringing risk on several sprites.
#
# This project's standard alpha recovery is white/black plate triangulation
# (tools/triangulate_matte.py) — but that needs a *second* generation (the
# black plate) per asset. The 2026-07-29 "restyle to Miya/Kurogane flat
# shading" pass generates hard-edge cel-shaded art on a flat #FFFFFF
# background with no soft/partial transparency anywhere in the figure
# (unlike Splash's translucent body, which genuinely needs triangulation),
# so this script uses corner flood-fill instead of a second generation —
# a deliberate, documented trade-off, not an oversight. If a future asset
# has soft/translucent edges, use triangulate_matte.py with a real black
# plate instead of this script.
#
# Steps:
#   1. Upscale the flat white-background RGB image with Lanczos + a light
#      unsharp/saturation filter pass, while it is still fully opaque.
#   2. THEN flood-fill transparency in from all four corners at the final
#      resolution (a fuzz tolerance absorbs anti-aliased edge pixels only,
#      never mid-figure whites, because the fill starts outside the
#      silhouette and cel art has no white-on-white ambiguity at the border).
#   3. Emit both PNG (straight alpha) and WebP.
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

TMP_UPSCALED="$(mktemp --suffix=.png)"
trap 'rm -f "$TMP_UPSCALED"' EXIT

mkdir -p "$(dirname "$OUT_BASE")"

# 1. Upscale the still-fully-opaque white-background image FIRST. No alpha
#    exists yet, so there is nothing for the resize filter to fringe against.
convert "$IN" -alpha off \
  -filter Lanczos -resize x"${TARGET_H}" \
  -unsharp 0x0.75+0.6+0.02 \
  -modulate 101,106,100 \
  "$TMP_UPSCALED"

W=$(identify -format "%w" "$TMP_UPSCALED")
H=$(identify -format "%h" "$TMP_UPSCALED")

# 2. NOW flood-fill alpha in from all four corners, at final resolution
#    (handles non-convex outlines; a 1px white border avoids edge-adjacency
#    issues when the figure touches the canvas edge).
convert "$TMP_UPSCALED" -alpha set -bordercolor white -border 1 \
  -fuzz "$FUZZ" -fill none \
  -draw "matte 0,0 floodfill" \
  -draw "matte $((W+1)),0 floodfill" \
  -draw "matte 0,$((H+1)) floodfill" \
  -draw "matte $((W+1)),$((H+1)) floodfill" \
  -shave 1x1 \
  "${OUT_BASE}.png"

# 3. WebP export (keeps alpha).
convert "${OUT_BASE}.png" -quality 92 -define webp:lossless=false "${OUT_BASE}.webp"

identify -format "%f: %wx%h alpha=%A\n" "${OUT_BASE}.png"
