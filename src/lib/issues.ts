import { sql } from "@/lib/db";

export type IssueFilter = {
  category?: string;
  priority?: string;
  state?: string;
};

export type IssueListRow = {
  id: number;
  github_number: number;
  title: string;
  state: string;
  category: string | null;
  priority: string | null;
  complexity: string | null;
  github_created_at: string;
  github_updated_at: string | null;
  labels: string[];
};

export async function getIssues(filter: IssueFilter): Promise<IssueListRow[]> {
  const rows = (await sql`
    SELECT
      i.id,
      i.github_number,
      i.title,
      i.state,
      i.github_created_at,
      i.github_updated_at,
      i.labels,
      latest.category,
      latest.priority,
      latest.complexity
    FROM issues i
    LEFT JOIN LATERAL (
      SELECT category, priority, complexity FROM classifications c
      WHERE c.issue_id = i.id
      ORDER BY c.created_at DESC LIMIT 1
    ) latest ON TRUE
    WHERE
      (${filter.state ?? null}::text IS NULL OR i.state = ${filter.state ?? null})
      AND (${filter.category ?? null}::text IS NULL OR latest.category = ${filter.category ?? null})
      AND (${filter.priority ?? null}::text IS NULL OR latest.priority = ${filter.priority ?? null})
    ORDER BY
      CASE latest.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END,
      i.github_created_at DESC
  `) as unknown as IssueListRow[];
  return rows;
}
