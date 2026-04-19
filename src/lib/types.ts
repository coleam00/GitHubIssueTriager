export type Issue = {
  id: number;
  github_repo: string;
  github_number: number;
  title: string;
  body: string | null;
  state: string;
  author: string | null;
  url: string;
  labels: string[];
  github_created_at: string;
  github_updated_at: string | null;
  synced_at: string;
};

export type Classification = {
  id: number;
  issue_id: number;
  category: "bug" | "feature" | "question" | "docs" | "chore";
  priority: "P0" | "P1" | "P2" | "P3";
  complexity: "small" | "medium" | "large";
  summary: string | null;
  reasoning: string | null;
  model: string;
  created_at: string;
};

export type Plan = {
  id: number;
  issue_id: number;
  content: string;
  model: string;
  created_at: string;
};

export type Run = {
  id: number;
  issue_id: number;
  plan_id: number | null;
  status: "pending" | "dispatched" | "completed" | "failed";
  branch_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type SimilarIssueMatch = {
  issue_id: number;
  github_number: number;
  title: string;
  similarity: number;
};
