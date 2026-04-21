# GitHub Issue Triager — a lab for parallel AI coding

**If you want to incorporate any of these ideas into your own project:**

- Git worktree automation that provisions an isolated database branch and a collision-free dev port in one command
- Neon Postgres branching per worktree, so three parallel Claude sessions can each migrate, seed, and blow away state without stepping on each other
- Deterministic port assignment by MD5-hashing the worktree path, so dev servers never collide and there's no central registry to keep in sync
- Plan, implement, and validate in separate Claude Code sessions — the reviewer never shares context with the implementer, which catches a much larger fraction of bugs than same-session review
- Cross-provider PR review that layers Codex (GPT) on top of Claude's own fanned-out reviewers, because the two models have genuinely different blind spots

Point your coding agent at this repository and tell it you want to incorporate these ideas into your own Claude Code setup and codebase. The patterns are small and self-contained — most live in a few shell scripts and slash commands under `scripts/` and `.claude/commands/`. Your agent can read them directly, figure out what maps onto your stack, and port the pieces over.

---

## About the underlying app

This is a working AI-powered GitHub issue triager built on Next.js 15 + React 19, Neon Postgres with `pgvector`, and the OpenAI SDK. It syncs issues from any repo, classifies them (category, priority, complexity), embeds them for cosine-similarity search, and generates implementation plans on demand. The app is the vehicle for the parallel-agent tooling around it, but it runs end-to-end as a real product — including a rule-based fallback classifier and a deterministic hash embedding so the whole flow still works when `OPENAI_API_KEY` isn't set.

<details>
<summary><strong>Schema</strong></summary>

Tables live in `migrations/001_init.sql`. `classifications` is one-to-many per issue (latest row wins in the UI), which keeps history for free. `similar_issues` stores `vector(1536)` embeddings with an HNSW cosine index.

| Table | Purpose |
|---|---|
| `issues` | Raw GitHub issue data |
| `classifications` | LLM triage output — append-only, latest row per issue is the live one |
| `similar_issues` | Embeddings + HNSW cosine index for k-NN search |
| `plans` | Markdown implementation plans per issue |
| `runs` | Dispatch records (status, branch name, notes) |

</details>

<details>
<summary><strong>API routes</strong></summary>

All mutating endpoints are `POST`; the `[id]` param is the GitHub issue number, not the DB primary key.

| Route | Does |
|---|---|
| `/api/sync` | Pulls issues from GitHub into `issues` |
| `/api/classify/[id]` | Runs LLM (or fallback) classifier, inserts a row into `classifications` |
| `/api/similar/[id]` | Embeds the issue, upserts into `similar_issues`, returns top 3 |
| `/api/plan/[id]` | Generates a markdown plan, inserts into `plans` |
| `/api/dispatch/[id]` | Creates a `runs` row with a generated branch name |

</details>

<details>
<summary><strong>Scripts</strong></summary>

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server on a worktree-hashed port (base 4000, worktree range 4100–4199) |
| `pnpm migrate` | Applies every `.sql` in `migrations/` in order |
| `pnpm seed` | End-to-end: sync + classify + embed |
| `pnpm sync` | Pulls open + closed issues from GitHub |
| `pnpm validate` | `tsc --noEmit` plus a smoke script |

</details>

---

## The parallel-agent toolkit

### 1. Worktree lifecycle in one command

<details>
<summary><strong><code>scripts/w.ps1</code> (PowerShell) and <code>scripts/w.sh</code> (Git Bash) — create a ready-to-run worktree, or tear it down completely</strong></summary>

`.\scripts\w.ps1 issue-1` creates a sibling directory (`../GitHubIssueTriager-issue-1`), a new git branch, a dedicated Neon database branch, a `.env` file with that branch's `DATABASE_URL` already wired in, and a fresh `pnpm install` linked against the shared content-addressable store (so install takes about ten seconds on a warm machine, not minutes). Appending `open` launches a Claude Code session inside the worktree with `--dangerously-skip-permissions`. Appending `rm` tears the whole thing down — the worktree directory, the git branch, and the Neon branch.

`scripts/w.sh` is the source of truth and does the real work. `w.ps1` exists because on Windows the default `bash.exe` resolves to WSL's bash, and WSL creates Linux-style symlinks in `node_modules` that Windows-context Claude Code sessions can't `lstat`. The PowerShell wrapper invokes Git Bash (`C:\Program Files\Git\bin\bash.exe`) explicitly so the routing is unambiguous, and `w.sh` aborts with a clear error if it detects it's running under WSL.

One caveat worth knowing: exiting the Claude session does not tear anything down. Claude Code's `WorktreeRemove` hook only fires for worktrees Claude itself created (via `-w` or subagent isolation), not for `git worktree add`-style worktrees, so teardown has to be run manually. `neonctl branches list` is the easiest way to catch strays.

</details>

### 2. Neon branching per worktree

<details>
<summary><strong>Every worktree gets its own copy-on-write Postgres branch, with DATABASE_URL auto-wired</strong></summary>

`scripts/worktree-setup.sh` handles the Neon side. When a worktree is created, it runs `neonctl branches create` with the worktree name as the branch name, then `neonctl connection-string` to fetch the real pooled connection URL (with the branch's own compute endpoint), and writes that URL into the worktree's `.env`. Every other env var from the parent `.env` carries through verbatim — `OPENAI_API_KEY`, `GITHUB_REPO`, API keys, whatever — but `DATABASE_URL` is overridden to the branch URL.

The payoff: three parallel Claude sessions can migrate, seed, mutate rows, even drop tables, without ever touching each other's state. Neon branches are copy-on-write, so creation is sub-second and you inherit the schema and data of the parent branch for free. `scripts/worktree-teardown.sh` deletes the branch during `w.ps1 rm`; if you skip teardown the branch lingers until you notice.

</details>

### 3. Port assignment by worktree-path hash

<details>
<summary><strong>Three dev servers, three different ports, zero central registry</strong></summary>

`scripts/assign-port.ts` does this in about fifteen lines. It takes `process.cwd()`, MD5-hashes it, reads the first four bytes as a UInt32BE, mods by 100, and adds 4100 — so every worktree lands somewhere in 4100–4199, deterministically. The main repo is a special case that always gets port 4000.

The reason for hashing rather than assigning sequentially is that sequential assignment means central state, and central state means something you can corrupt when a teardown fails mid-run. Hashing is stateless: each worktree computes its own port from its own path, and with 100 slots collisions are rare enough that you can deal with them by hand when they happen. If you ever do hit one, `PORT=4137 pnpm dev` overrides. `scripts/dev.ts` is a thin wrapper around `next dev -p $port` that prints the port as the first line of output, so you never have to guess.

</details>

### 4. Plan, implement, and validate in separate Claude sessions

<details>
<summary><strong>/plan writes the plan to disk so the implementer (and the validator) never share context with the planner</strong></summary>

The `.claude/commands/plan.md` slash command puts Claude into plan-only mode, has it read the issue (or problem statement) and explore the codebase for patterns, and writes a plan to `.agents/plans/{name}.plan.md` without touching any production code. A separate Claude session then reads that plan file and implements it — it never saw the conversation that produced the plan, so it can't get lured into defending decisions it didn't witness.

The third session validates, same pattern in a different role. The validator reads the PR diff (or the plan plus the diff) cold and critiques. That isolation matters because same-session review quietly catches a meaningfully smaller fraction of bugs than fresh-context review does, and the difference compounds as the codebase gets bigger.

</details>

### 5. Cross-provider PR review

<details>
<summary><strong>/review-pr fans out parallel Claude subagents; /cross-review runs the same diff through Codex (GPT)</strong></summary>

`.claude/commands/review-pr.md` pulls the PR diff and dispatches four subagents in parallel (one `Task` batch): `code-reviewer`, `silent-failure-hunter`, `pr-test-analyzer`, and `code-simplifier`. Each gets its own fresh context, the whole batch finishes in about the time of the slowest one, and the main session aggregates their findings into Critical / Important / Suggestions / Verdict.

`.claude/commands/cross-review.md` layers Codex on top via `/codex:adversarial-review` (requires the Codex plugin for Claude Code). The premise is that Claude and GPT were trained on different distributions, so they miss different things — which means anything Codex flags that Claude's review didn't is disproportionately valuable. The most useful of those findings usually become a new CLAUDE.md rule, so the blind spot gets patched at the prompt layer instead of rediscovered on the next PR.

</details>

---

## Setup

Walkthrough for going from a clean clone to `pnpm dev` running on :4000.

```bash
# 1. Install pnpm if you don't have it
npm install -g pnpm

# 2. Install deps
pnpm install

# 3. Create .env from the example and fill it in
cp .env.example .env
```

Minimum values to set in `.env`:

- `DATABASE_URL` — Neon pooled connection string for the main branch
- `NEON_API_KEY` and `NEON_PROJECT_ID` — required for the `w.ps1 / w.sh` worktree lifecycle to provision and delete branches
- `OPENAI_API_KEY` — optional; without it the app falls back to rule-based classification and hash-based embeddings so the full flow still runs
- `GITHUB_REPO` — the `owner/repo` the triager pulls issues from

Then:

```bash
# 4. Apply migrations (pgvector extension + tables + HNSW index)
pnpm migrate

# 5. Seed if you want real data to play with
pnpm seed

# 6. Run
pnpm dev
# -> open http://localhost:4000
```

To run a parallel worktree (from PowerShell on Windows, or Git Bash directly):

```powershell
.\scripts\w.ps1 issue-1 open
# ...then inside the Claude session it launches, in a new terminal:
pnpm dev
# the port will be in 4100-4199, deterministic per worktree path
```

When you're done with the worktree:

```powershell
.\scripts\w.ps1 issue-1 rm
```

## Stack

Next.js 15 (App Router) with React 19 and TypeScript; Neon Postgres with `pgvector` (HNSW cosine); raw `postgres` client, no ORM; Tailwind CSS; OpenAI SDK (optional); GitHub CLI (`gh`) for issue fetch.

## License

MIT
