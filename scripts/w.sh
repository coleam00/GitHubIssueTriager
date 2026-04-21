#!/usr/bin/env bash
# w <name> [open|rm] — full worktree lifecycle.
#   w issue-42          -> create ../GitHubIssueTriager-issue-42 + Neon branch
#   w issue-42 open     -> create + launch `claude` inside it
#   w issue-42 rm       -> remove worktree dir + git branch + Neon branch
set -euo pipefail

# Guard against WSL: this project is Windows-native. Running under WSL causes
# pnpm to create Linux symlinks in node_modules that Windows-context Claude
# sessions can't lstat, and git registers /mnt/c/... paths that don't match
# C:/... paths used by other tools. Run from Git Bash (MINGW64) instead.
if [ -r /proc/version ] && grep -qiE "microsoft|wsl" /proc/version; then
  echo "[w] refusing to run under WSL — open a Git Bash (MINGW64) terminal and retry" >&2
  exit 1
fi

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
  # --frozen-lockfile: use pnpm-lock.yaml strictly, no registry metadata checks.
  # --prefer-offline: hardlink from the shared store, never download anything already cached.
  pnpm --dir "$TARGET" install --frozen-lockfile --prefer-offline
fi

echo "[w] worktree: $TARGET"
if [ "$ACTION" = "open" ]; then
  (cd "$TARGET" && claude --dangerously-skip-permissions)
fi
