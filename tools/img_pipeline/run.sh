#!/usr/bin/env bash
# tools/img_pipeline/run.sh — plain-C sprite finishing pipeline (no
# ImageMagick, no GPU/GLSL, no browser). Supersedes tools/flatcel_finish.sh,
# which had two problems fixed here:
#   1. it matted (extracted alpha) BEFORE upscaling — backwards from this
#      project's own spec, causing visible white fringing at fine edges
#      (hair, wrench) once upscaled;
#   2. WebP conversion of a 4-corner-only ImageMagick floodfill matte showed
#      dither/halftone-looking noise in what should be flat opaque/clear
#      regions.
# This script instead:
#   1. Runs upscale_filter (bicubic + light unsharp + saturation, pure C,
#      see upscale_filter.c) on the STILL-OPAQUE flat-white-background
#      source at full resolution first.
#   2. Runs matte_floodfill (real border-seeded flood fill + 1px feather,
#      pure C, see matte_floodfill.c) on the upscaled result SECOND, at
#      final resolution — producing a clean binary alpha with only a single
#      antialiased pixel ring at the cut, so there is nothing for WebP's
#      lossy alpha compression to dither.
#   3. Emits WebP alongside the PNG.
#
# Usage:
#   tools/img_pipeline/run.sh <input_flat_white.png> <output_basename> \
#     [target_height=4096] [sharpen=0.6] [saturation=1.06] [white_threshold=14]
#
# IMPORTANT: <input> must be the character on a genuinely solid #FFFFFF
# background (the raw generator output), NOT an already-matted/transparent
# sprite — matte_floodfill treats near-white as background and would eat an
# already-transparent image's RGB-under-alpha=0 pixels incorrectly. If you
# only have a matted sprite, flatten it onto white first:
#   convert matted.png -background white -alpha remove -alpha off flat.png

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <input_flat_white.png> <output_basename> [target_height=4096] [sharpen=0.6] [saturation=1.06] [white_threshold=14]" >&2
  exit 1
fi

IN="$1"
OUT_BASE="$2"
TARGET_H="${3:-4096}"
SHARPEN="${4:-0.6}"
SATURATION="${5:-1.06}"
THRESHOLD="${6:-14}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$(dirname "$OUT_BASE")"

TMP_UPSCALED="$(mktemp --suffix=.png)"
trap 'rm -f "$TMP_UPSCALED"' EXIT

"$SCRIPT_DIR/upscale_filter" "$IN" "$TMP_UPSCALED" "$TARGET_H" "$SHARPEN" "$SATURATION"
"$SCRIPT_DIR/matte_floodfill" "$TMP_UPSCALED" "${OUT_BASE}.png" "$THRESHOLD" 1

convert "${OUT_BASE}.png" -quality 92 -define webp:lossless=false "${OUT_BASE}.webp"

identify -format "%f: %wx%h alpha=%A\n" "${OUT_BASE}.png"
