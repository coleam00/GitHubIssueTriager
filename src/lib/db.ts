import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env");
}

declare global {
  var __sql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  globalThis.__sql ??
  postgres(connectionString, {
    ssl: "require",
    max: 10,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") globalThis.__sql = sql;

export type IssueFilter = {
  category?: string;
  priority?: string;
  state?: string;
};

export type FilteredIssueRow = {
  id: number;
  github_number: number;
  title: string;
  state: string;
  category: string | null;
  priority: string | null;
  complexity: string | null;
  github_created_at: Date;
  github_updated_at: Date | null;
  labels: string[];
};

export async function fetchFilteredIssues(
  filter: IssueFilter,
): Promise<FilteredIssueRow[]> {
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
  `) as unknown as FilteredIssueRow[];
  return rows;
}
