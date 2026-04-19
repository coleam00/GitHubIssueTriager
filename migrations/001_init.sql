CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  github_repo TEXT NOT NULL,
  github_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT NOT NULL,
  author TEXT,
  url TEXT NOT NULL,
  labels TEXT[] NOT NULL DEFAULT '{}',
  github_created_at TIMESTAMPTZ NOT NULL,
  github_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (github_repo, github_number)
);

CREATE TABLE IF NOT EXISTS classifications (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  complexity TEXT NOT NULL,
  summary TEXT,
  reasoning TEXT,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS classifications_issue_id_idx ON classifications(issue_id);
CREATE INDEX IF NOT EXISTS classifications_created_at_idx ON classifications(created_at DESC);

CREATE TABLE IF NOT EXISTS similar_issues (
  issue_id INTEGER PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS similar_issues_embedding_idx
  ON similar_issues
  USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plans_issue_id_idx ON plans(issue_id);

CREATE TABLE IF NOT EXISTS runs (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  branch_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS runs_issue_id_idx ON runs(issue_id);
CREATE INDEX IF NOT EXISTS runs_status_idx ON runs(status);
