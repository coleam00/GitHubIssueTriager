---
description: Cross-provider review — runs Codex (GPT) on the same PR Claude already reviewed, surfacing blind spots Claude missed.
argument-hint: [pr-number]
---

# /cross-review

Run a cross-provider review of PR `$ARGUMENTS` (or the PR associated with the current branch). The premise: Claude and GPT have different training distributions and different blind spots. If you've already run `/review-pr` in a fresh Claude session, layering `/cross-review` on top is the S-tier validation move.

## Steps

1. If `$ARGUMENTS` is empty, resolve the PR number for the current branch:
   ```bash
   gh pr view --json number,url,title,headRefName
   ```
   Abort with a clear message if no PR exists.

2. Verify the Codex plugin is installed. If `/codex:review` is unavailable, tell the user:
   ```
   /plugin marketplace add openai/codex-plugin-cc
   /plugin install codex@openai-codex
   /reload-plugins
   /codex:setup
   ```
   Then stop.

3. Kick off Codex's adversarial review — the provider swap is the whole point:
   ```
   /codex:adversarial-review
   ```
   Scope it to the diff of the target PR, not the current working tree.

4. When Codex returns, present its findings in a short table:

   | Severity | File:Line | Issue |

5. Highlight anything Codex flagged that Claude's `/review-pr` did NOT. Those are the cross-provider wins — write a one-line candidate CLAUDE.md rule for each, so the blind spot compounds into a permanent fix.

## Notes

- Keep the summary terse. The purpose is to surface blind spots, not re-list everything.
- If Codex and Claude agree on everything, say so — agreement across providers is itself a signal.
- This command deliberately does NOT apply fixes. Review only.
