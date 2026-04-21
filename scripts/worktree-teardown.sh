#!/usr/bin/env bash
# Invoked by Claude Code WorktreeRemove hook. Deletes the matching Neon branch.
set -euo pipefail

WORKTREE_DIR="${1:-$PWD}"
WORKTREE_NAME="$(basename "$WORKTREE_DIR")"
BRANCH_NAME="wt-${WORKTREE_NAME}"

if [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_API_KEY:-}" ]; then
  exit 0
fi

echo "[worktree-teardown] deleting Neon branch $BRANCH_NAME"
neonctl branches delete "$BRANCH_NAME" \
  --project-id "$NEON_PROJECT_ID" \
  --api-key "$NEON_API_KEY" 2>/dev/null || true
