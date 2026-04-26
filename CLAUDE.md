# CLAUDE.md

## Stack
Next.js 15 (App Router) + React 19 + TypeScript. Neon Postgres with `pgvector` (HNSW cosine). Raw `postgres` client — no ORM. OpenAI SDK optional; without `OPENAI_API_KEY` the app uses a rule-based classifier and a deterministic hash-based embedding.

## Run
`pnpm dev` — resolves a worktree-specific port (base 4000, worktree range 4100–4199, or `$PORT` override).
`pnpm migrate` — apply every `.sql` in `migrations/` in order. No rollback.
`pnpm seed` — full sync + classify + embed end to end.

## Where things live
`src/app/api/{sync,classify,similar,plan,dispatch}/[id]/route.ts` — all mutating endpoints are POST; the id param is the issue number, not the PK. `src/lib/db.ts` is the only module that calls `postgres()`. Migrations are append-only; never edit `001_init.sql`.

## Non-obvious
- The classifier falls back silently when `OPENAI_API_KEY` is missing — don't wrap those call sites in try/catch; the fallback is the happy path in tests.
- `classifications` is one-to-many; the dashboard reads the latest row per issue. If you add a field, write a view instead of mutating history.
- `POST /api/classify-batch` streams NDJSON and caps in-flight `classify()` calls at 4 (override with `CLASSIFY_BATCH_CONCURRENCY`, range 1–16) to avoid rate-limiting OpenAI.
- Never commit `.env`. `NEON_API_KEY` and per-branch URLs stay local.
