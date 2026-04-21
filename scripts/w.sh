#!/usr/bin/env bash
# w <name> [open|rm] — full worktree lifecycle.
#   w issue-42          -> create ../GitHubIssueTriager-issue-42 + Neon branch
#   w issue-42 open     -> create + launch `claude` inside it
#   w issue-42 rm       -> remove worktree dir + git branch + Neon branch
set -euo pipefail

NAME="${1:?usage: w <name> [open|rm]}"
ACTION="${2:-create}"
ROOT="$(git rev-parse --show-toplevel)"
PARENT="$(dirname "$ROOT")"
TARGET="$PARENT/$(basename "$ROOT")-$NAME"

if [ "$ACTION" = "rm" ]; then
  bash "$ROOT/scripts/worktree-teardown.sh" "$TARGET"
  git -C "$ROOT" worktree remove --force "$TARGET" 2>/dev/null || true
  rm -rf "$TARGET"
  git -C "$ROOT" worktree prune
  git -C "$ROOT" branch -D "$NAME" 2>/dev/null || true
  echo "[w] removed $TARGET"
  exit 0
fi

if [ ! -d "$TARGET" ]; then
  git -C "$ROOT" worktree add "$TARGET" -b "$NAME"
  bash "$ROOT/scripts/worktree-setup.sh" "$TARGET"
  pnpm --dir "$TARGET" install --prefer-offline
fi

echo "[w] worktree: $TARGET"
if [ "$ACTION" = "open" ]; then
  (cd "$TARGET" && claude)
fi
