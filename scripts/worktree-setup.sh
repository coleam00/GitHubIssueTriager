#!/usr/bin/env bash
# Invoked by Claude Code WorktreeCreate hook (or manually).
# Creates a Neon branch named after the worktree, writes DATABASE_URL into .env.worktree.
set -euo pipefail

WORKTREE_DIR="${1:-$PWD}"
WORKTREE_NAME="$(basename "$WORKTREE_DIR")"
BRANCH_NAME="wt-${WORKTREE_NAME}"

if [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_API_KEY:-}" ]; then
  echo "[worktree-setup] NEON_PROJECT_ID/NEON_API_KEY unset — skipping Neon branch" >&2
  exit 0
fi

if neonctl branches list --project-id "$NEON_PROJECT_ID" --api-key "$NEON_API_KEY" 2>/dev/null | grep -q " $BRANCH_NAME "; then
  echo "[worktree-setup] reusing existing Neon branch $BRANCH_NAME"
else
  echo "[worktree-setup] creating Neon branch $BRANCH_NAME"
  neonctl branches create \
    --project-id "$NEON_PROJECT_ID" \
    --name "$BRANCH_NAME" \
    --api-key "$NEON_API_KEY" >/dev/null
fi

URL=$(neonctl connection-string "$BRANCH_NAME" \
  --project-id "$NEON_PROJECT_ID" \
  --api-key "$NEON_API_KEY" \
  --pooled --database-name neondb)

# Derive worktree .env from parent .env but override DATABASE_URL to the branch URL.
PARENT_ENV="$(git -C "$WORKTREE_DIR" rev-parse --git-common-dir)/../.env"
if [ -f "$PARENT_ENV" ]; then
  grep -v "^DATABASE_URL=" "$PARENT_ENV" > "$WORKTREE_DIR/.env"
fi
echo "DATABASE_URL=$URL" >> "$WORKTREE_DIR/.env"
echo "[worktree-setup] wrote $WORKTREE_DIR/.env (DATABASE_URL -> branch $BRANCH_NAME)"
