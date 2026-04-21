#!/usr/bin/env bash
# Invoked by Claude Code WorktreeRemove hook. Deletes the matching Neon branch.
set -euo pipefail

WORKTREE_DIR="${1:-$PWD}"
WORKTREE_NAME="$(basename "$WORKTREE_DIR")"
BRANCH_NAME="wt-${WORKTREE_NAME}"

# Source parent .env so NEON_PROJECT_ID / NEON_API_KEY are available.
# Resolve main repo root via the current repo's git metadata (the worktree dir
# may already be gone by the time `git -C "$WORKTREE_DIR"` would be called).
MAIN_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"
PARENT_ENV="${MAIN_ROOT}/.env"
if [ -f "$PARENT_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  # Strip CRLF line endings so WSL/Linux bash doesn't try to exec `\r` as a command.
  . <(sed 's/\r$//' "$PARENT_ENV")
  set +a
fi

if [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_API_KEY:-}" ]; then
  echo "[worktree-teardown] NEON_PROJECT_ID/NEON_API_KEY unset — skipping Neon branch delete" >&2
  exit 0
fi

echo "[worktree-teardown] deleting Neon branch $BRANCH_NAME"
neonctl branches delete "$BRANCH_NAME" \
  --project-id "$NEON_PROJECT_ID" \
  --api-key "$NEON_API_KEY" 2>/dev/null || true
