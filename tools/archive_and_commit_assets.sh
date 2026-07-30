#!/usr/bin/env bash
# Archive visual assets and record the current project state in Git.
# Run after every image generation: ./tools/archive_and_commit_assets.sh "describe change"
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
STAMP="$(date +%Y%m%d_%H%M%S)"
MESSAGE="${1:-Archive generated visual assets}"
mkdir -p archives

# Only project assets; excludes Git metadata and older archives to avoid recursive archives.
mapfile -d '' FILES < <(find backgrounds characters plans references -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.svg' \) -print0 2>/dev/null | sort -z)
if ((${#FILES[@]} == 0)); then
  echo 'No visual assets found in backgrounds/, characters/ or plans/.' >&2
  exit 1
fi
ARCHIVE="archives/seirin_visual_assets_${STAMP}.tar.gz"
tar -czf "$ARCHIVE" "${FILES[@]}"
sha256sum "$ARCHIVE" > "${ARCHIVE}.sha256"
printf 'archive=%s\ncreated=%s\nfiles=%s\n' "$ARCHIVE" "$(date --iso-8601=seconds)" "${#FILES[@]}" > archives/LATEST_ARCHIVE.txt

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init -q
fi
# Workspace snapshots do not preserve .git/config, so ensure a local identity every run.
if ! git config user.name >/dev/null; then git config user.name "Arena Asset Agent"; fi
if ! git config user.email >/dev/null; then git config user.email "assets@local.invalid"; fi
git add backgrounds characters plans references tools archives SEIRIN_Design_Document_edited.md SEIRIN_Design_Document_edited.docx 2>/dev/null || true
if ! git diff --cached --quiet; then
  git commit -m "$MESSAGE" -q
  echo "Created $ARCHIVE and committed: $MESSAGE"
else
  echo "Created $ARCHIVE; no tracked changes to commit."
fi
