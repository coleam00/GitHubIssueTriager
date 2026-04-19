# GitHub Issue Triager

AI-powered GitHub issue triage dashboard. Built on Next.js + Neon Postgres + pgvector.

Demo app for the 10x AI coding YouTube video - the app triages GitHub issues, and its features get shipped through the exact issue-driven workflow the video teaches.

## Features

- **Sync issues** from any GitHub repo via `gh` CLI into Neon Postgres
- **AI classification**: category (bug/feature/question/docs/chore), priority (P0-P3), complexity
- **Similarity search**: pgvector cosine distance over issue embeddings
- **Plan generation**: markdown implementation plan per issue
- **Dispatch**: records a run + branch name, stub for Archon / Claude Agent SDK wiring

When `OPENAI_API_KEY` is not set the app falls back to a rule-based classifier and a deterministic hash-based embedding so the whole flow still works locally.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Neon Postgres with `pgvector` (HNSW cosine index)
- `postgres` client (no ORM)
- Tailwind CSS
- OpenAI SDK (optional)
- GitHub CLI (`gh`) for issue fetch

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env and set DATABASE_URL (Neon). OPENAI_API_KEY is optional.
# GITHUB_REPO defaults to coleam00/claude-memory-compiler.

# 3. Migrate
npm run migrate

# 4. Seed (sync + classify + embed all issues)
npm run seed

# 5. Run
npm run dev
# open http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run migrate` | Apply SQL migrations from `migrations/` |
| `npm run sync` | Pull open+closed issues from GitHub into Neon |
| `npm run seed` | Full end-to-end: sync + classify + embed |

## Schema

Tables (see `migrations/001_init.sql`):

- `issues` - raw GitHub issue data
- `classifications` - AI triage output (one-to-many, latest wins in UI)
- `similar_issues` - `vector(1536)` embeddings with HNSW cosine index
- `plans` - generated markdown plans
- `runs` - dispatch records (status, branch name, notes)

## API

| Route | Method | Does |
|---|---|---|
| `/api/sync` | POST | Pulls from GitHub into `issues` |
| `/api/classify/[id]` | POST | Classifies issue, inserts into `classifications` |
| `/api/similar/[id]` | POST | Embeds + upserts into `similar_issues`, returns top 3 |
| `/api/plan/[id]` | POST | Generates plan, inserts into `plans` |
| `/api/dispatch/[id]` | POST | Inserts a run row with a generated branch name |

## Pages

- `/` - dashboard with counts + recent issues
- `/issues` - filterable list, sorted by priority then date
- `/issues/[number]` - detail with action buttons + classification + similar + plan + runs

## Validation

End-to-end walkthrough via `agent-browser`:

```bash
npx agent-browser open http://localhost:3000/
npx agent-browser screenshot ./agent-browser-runs/01-dashboard.png
# ...navigate to /issues/<n>, click Classify/Plan/Dispatch
```

Screenshots from the last validation run are in `agent-browser-runs/`.

## License

MIT
