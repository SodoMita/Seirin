#!/usr/bin/env bash
# tools/img_pipeline/build.sh — compile the plain-C image tools.
# Run once per session (the sandbox does not persist compiled binaries
# outside /home/user, and .gitignore excludes the binaries themselves so
# they don't bloat the repo — only the .c/.h sources and this build script
# are committed).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
gcc -O2 -o upscale_filter upscale_filter.c -lm
gcc -O2 -o matte_floodfill matte_floodfill.c -lm
echo "built: $SCRIPT_DIR/upscale_filter $SCRIPT_DIR/matte_floodfill"
