#!/usr/bin/env bash
# Commit one newly generated asset directly to GitHub, without keeping a local repository.
# Usage:
# GITHUB_TOKEN=... ./tools/commit_and_push_asset.sh characters/file.png "Commit message"
set -euo pipefail
ASSET="${1:?Usage: commit_and_push_asset.sh <asset-path> <message>}"
MESSAGE="${2:-Add generated asset}"
REPO_URL="${REPO_URL:-https://github.com/SodoMita/Seirin.git}"
: "${GITHUB_TOKEN:?Set GITHUB_TOKEN for this one command; do not save it in a file.}"
[[ -f "$ASSET" ]] || { echo "Asset not found: $ASSET" >&2; exit 1; }
ASSET_ABS="$(realpath "$ASSET")"
REL_PATH="${ASSET#./}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ASKPASS="$TMP/askpass"
cat > "$ASKPASS" <<'EOF'
#!/bin/sh
case "$1" in
  *Username*) printf '%s\n' 'x-access-token' ;;
  *) printf '%s\n' "$GITHUB_TOKEN" ;;
esac
EOF
chmod 700 "$ASKPASS"
export GIT_ASKPASS="$ASKPASS" GIT_TERMINAL_PROMPT=0

git clone --depth 1 "$REPO_URL" "$TMP/repo" >/dev/null
mkdir -p "$TMP/repo/$(dirname "$REL_PATH")"
cp "$ASSET_ABS" "$TMP/repo/$REL_PATH"
cd "$TMP/repo"
git config user.name "SodoMita / Arena Asset Agent"
git config user.email "sodomita@users.noreply.github.com"
git add "$REL_PATH"
if git diff --cached --quiet; then
  echo "No content change: $REL_PATH"
  exit 0
fi
git commit -m "$MESSAGE" -q
git push origin HEAD:main >/dev/null
echo "Pushed $(git rev-parse --short HEAD): $REL_PATH"
