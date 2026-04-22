---
description: Cross-provider review — compares Codex's adversarial review against Claude's /review-pr to surface blind spots. Two-phase human-in-the-loop (the Codex plugin hides its review commands from model invocation by design).
argument-hint: [pr-number]
---

# /cross-review

Cross-provider review of PR `$ARGUMENTS` (or the PR for the current branch). The premise: Claude and GPT were trained on different distributions, so Codex catches things Claude's own fan-out reviewers miss. The Codex plugin deliberately marks `/codex:adversarial-review` with `disable-model-invocation: true`, so this command is a two-phase human-in-the-loop — you run Codex's review in the session, then re-invoke `/cross-review` and I'll compare.

## Steps

1. If `$ARGUMENTS` is empty, resolve the PR number for the current branch:
   ```bash
   gh pr view --json number,url,title,headRefName
   ```
   Abort with a clear message if no PR exists.

2. Verify the Codex plugin is installed. If no `/codex:*` commands exist in this session (check `.claude/settings.json` for `enabledPlugins.codex@openai-codex` or look for the plugin cache directory), tell the user:
   ```
   /plugin marketplace add openai/codex-plugin-cc
   /plugin install codex@openai-codex
   /reload-plugins
   /codex:setup
   ```
   Then stop.

3. Check the current session's conversation for a recent `/codex:adversarial-review` output scoped to this PR.

   **If it's NOT there → Phase 1 (hand off).** Tell the user verbatim, then stop:

   > Codex's review commands are locked off from model invocation by the plugin (`disable-model-invocation: true`), so you need to run this step yourself in this same session:
   >
   > ```
   > /codex:adversarial-review --scope branch --base main
   > ```
   >
   > Once Codex's output is in the conversation, re-run `/cross-review $ARGUMENTS` and I'll compare it against Claude's review.

   Do NOT attempt to invoke the skill via the Skill tool — it isn't registered for the model, so the call will fail and you'll waste a turn.

   **If it IS there → Phase 2 (compare).** Continue to step 4.

4. Extract Codex's findings and put them next to Claude's prior `/review-pr` findings (if a Claude review is in the same session) in one compact table:

   | Source | Severity | File:Line | Issue |

5. Highlight findings Codex flagged that Claude's reviewers did NOT — those are the cross-provider wins. For each, draft a one-line candidate `CLAUDE.md` rule so the blind spot compounds into a permanent fix instead of being rediscovered on the next PR.

## Notes

- Keep the summary terse. The point is to surface blind spots, not re-list every finding both reviewers agreed on.
- Cross-provider agreement is itself a signal — if Codex and Claude converge on the same issues, say so.
- Review only. This command does not apply fixes.
- The two-phase shape is a plugin-policy constraint, not a workaround for a missing feature. Confirm by inspecting `~/.claude/plugins/cache/openai-codex/codex/*/commands/adversarial-review.md`.
