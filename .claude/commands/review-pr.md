---
description: Fresh-context PR review — fans out parallel specialized subagents on the current PR diff.
argument-hint: [review-aspects]
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Task"]
---

# Fresh-Context PR Review

Run a comprehensive review of the PR associated with the current branch (or the uncommitted working-tree diff if no PR exists yet) by fanning out specialized subagents **in parallel**.

**Principle:** The session that wrote the code should NOT be the session that reviews it. Run this command in a fresh `claude` session so the reviewers aren't primed by the implementer's reasoning. Different model, different blind spots; fresh context, no sycophancy.

**Review Aspects (optional):** "$ARGUMENTS" — if blank, run every applicable reviewer.

## Workflow

1. **Identify the diff.**
   - `gh pr view --json number,url,title,headRefName,body` to resolve the PR on this branch.
   - If no PR exists, fall back to `git diff origin/main...HEAD` and `git status` for the working tree.
   - Note the files changed and the high-level intent (from PR body or the last issue reference).

2. **Decide which reviewers apply** based on the diff:
   - **Always**: `code-reviewer` (general quality + CLAUDE.md compliance)
   - **If error handling / try/catch / Promise code changed**: `silent-failure-hunter`
   - **If tests added or modified**: `pr-test-analyzer`
   - **After the above pass**: `code-simplifier` (polish pass — not blocking)

3. **Fan out in parallel.** Launch all applicable subagents in a single message (one `Task` tool call per reviewer, all in the same batch so they run concurrently). Each reviewer receives:
   - The list of changed files
   - The PR intent (1-paragraph summary from the PR body or linked issue)
   - An instruction to focus on the diff, not the rest of the repo
   - A reminder that critical issues must reference `file:line`

4. **Aggregate** into a single summary:

   ```markdown
   # PR Review — <pr-title>

   ## Critical (must fix before merge)
   - [reviewer-name] <issue> — `file.ts:42`

   ## Important (should fix)
   - [reviewer-name] <issue> — `file.ts:87`

   ## Suggestions
   - [reviewer-name] <suggestion> — `file.ts:120`

   ## Strengths
   - <what the PR did well>

   ## Verdict
   APPROVE / APPROVE_WITH_CHANGES / REQUEST_CHANGES
   ```

5. **Do not apply fixes automatically** in this command — the purpose is independent review, not edits. If the user wants fixes applied, they can run a separate command or invoke `/cross-review` first to layer a second provider on top.

## Usage

```
/review-pr
# Full review with every applicable subagent, parallel.

/review-pr errors tests
# Narrow to silent-failure-hunter + pr-test-analyzer only.
```

## Notes

- **Parallel is the default.** Sequential defeats the whole point — you get the same signal slower.
- The reviewers are described in `.claude/agents/` — each one has its own system prompt and tool access.
- Keep critical findings actionable: `file:line` + one sentence + suggested fix. Vague complaints get ignored.
- If the PR is trivial (docs-only, single-line fix), return APPROVE with zero findings rather than fabricating issues.
