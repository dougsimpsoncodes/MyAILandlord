#!/usr/bin/env bash
set -euo pipefail

# Safe patch application workflow based on Git docs:
# 1) preflight with `git apply --check`
# 2) apply cleanly if possible
# 3) fall back to `git apply --3way` if needed
#
# Usage:
#   scripts/safe-apply-patch.sh path/to/changes.patch
#   cat changes.patch | scripts/safe-apply-patch.sh -
#
# Tunables:
#   PATCH_STRIP (default: 1)  -> passed to -p
#   PATCH_3WAY (default: 1)   -> enables 3-way fallback

if ! command -v git >/dev/null 2>&1; then
  echo "[safe-apply] git is required" >&2
  exit 2
fi

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <patch-file|->" >&2
  exit 2
fi

PATCH_SOURCE="$1"
PATCH_STRIP="${PATCH_STRIP:-1}"
PATCH_3WAY="${PATCH_3WAY:-1}"

if [ "$PATCH_SOURCE" = "-" ]; then
  TMP_PATCH="$(mktemp /tmp/safe-apply.XXXXXX.patch)"
  trap 'rm -f "$TMP_PATCH"' EXIT
  cat > "$TMP_PATCH"
  PATCH_FILE="$TMP_PATCH"
else
  PATCH_FILE="$PATCH_SOURCE"
fi

if [ ! -f "$PATCH_FILE" ]; then
  echo "[safe-apply] patch file not found: $PATCH_FILE" >&2
  exit 2
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[safe-apply] must run inside a git repository" >&2
  exit 2
fi

echo "[safe-apply] preflight: git apply --check -p${PATCH_STRIP}" >&2
if git apply --check -p"$PATCH_STRIP" "$PATCH_FILE"; then
  echo "[safe-apply] applying cleanly" >&2
  git apply -p"$PATCH_STRIP" "$PATCH_FILE"
  echo "[safe-apply] done" >&2
  exit 0
fi

if [ "$PATCH_3WAY" = "1" ]; then
  echo "[safe-apply] clean apply failed, trying --3way" >&2
  if git apply --3way -p"$PATCH_STRIP" "$PATCH_FILE"; then
    echo "[safe-apply] applied with 3-way merge" >&2
    exit 0
  fi
fi

echo "[safe-apply] apply failed. Common fixes:" >&2
echo "  - wrong path prefix: try PATCH_STRIP=0/1/2" >&2
echo "  - patch generated from a different base" >&2
echo "  - file paths changed (move/rename)" >&2
exit 1
