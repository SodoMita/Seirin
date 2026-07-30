#!/usr/bin/env bash
# Store one newly generated asset in a small standalone archive and Git commit.
# Usage: ./tools/store_new_asset.sh characters/file.png "Description"
set -euo pipefail
asset="${1:?asset path required}"
message="${2:-Store generated asset}"
[[ -f "$asset" ]] || { echo "Asset not found: $asset" >&2; exit 1; }
mkdir -p archives
tag="$(date +%Y%m%d_%H%M%S)_$(basename "${asset%.*}")"
archive="archives/${tag}.tar.gz"
tar -czf "$archive" "$asset"
sha256sum "$archive" > "$archive.sha256"
if [[ ! -d .git ]]; then git init -q; fi
git config user.name "Arena Asset Agent"
git config user.email "assets@local.invalid"
git add "$asset" "$archive" "$archive.sha256" tools/store_new_asset.sh
git commit -m "$message" -q || true
# A portable bundle gives recovery even if the sandbox removes .git metadata.
git bundle create archives/project_latest.bundle --all
echo "asset=$asset"
echo "archive=$archive"
echo "bundle=archives/project_latest.bundle"
git log --oneline -1
