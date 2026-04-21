---
description: Cross-provider review — fans out the current PR to GPT (via Codex plugin) for a second opinion on top of Archon's Claude reviewers.
argument-hint: [pr-number]
---

# /cross-review

Run a cross-provider review of PR `$ARGUMENTS` (or the PR associated with the current branch). Claude's own reviewers already ran via Archon; this command layers GPT on top as the outside voice.

## Steps

1. If `$ARGUMENTS` is empty, resolve the PR number for the current branch:
   ```bash
   gh pr view --json number,url,title,headRefName
   ```
   Abort with a clear message if no PR exists.

2. Verify the Codex plugin is installed. If `/codex:review` is unavailable, tell the user to run:
   ```
   /plugin marketplace add openai/codex-plugin-cc
   /plugin install codex@openai-codex
   /reload-plugins
   /codex:setup
   ```
   Then stop.

3. Kick off Codex's adversarial review — this provider swap is the whole point:
   ```
   /codex:adversarial-review
   ```
   Scope it to the diff of the target PR, not the current working tree.

4. When Codex returns, compare findings against the Archon synthesis report at `.claude/archon/reviews/{branch}.md` (latest). Produce a short table:

   | Finding | Flagged by Claude reviewers | Flagged by Codex | Severity |

5. For any row where only Codex flagged it, extract as a candidate bug-to-rule entry and write it to `.claude/archon/reviews/{branch}.cross-review.md` with a suggested CLAUDE.md rule or subagent guardrail.

## Notes

- Keep the summary terse. The purpose is to surface blind spots, not re-list everything Claude already said.
- If Codex and Claude agree on *everything*, say so — that is itself a signal worth recording.
