import Link from "next/link";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  github_number: number;
  title: string;
  state: string;
  category: string | null;
  priority: string | null;
  complexity: string | null;
};

async function getIssues(filter: { category?: string; priority?: string; state?: string }): Promise<Row[]> {
  const rows = (await sql`
    SELECT
      i.id,
      i.github_number,
      i.title,
      i.state,
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
  `) as unknown as Row[];
  return rows;
}

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; priority?: string; state?: string }>;
}) {
  const sp = await searchParams;
  const rows = await getIssues(sp);

  const categories = ["bug", "feature", "question", "docs", "chore"];
  const priorities = ["P0", "P1", "P2", "P3"];
  const states = ["open", "closed"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Issues</h1>
        <p className="text-accentMuted mt-2">Sorted by priority, then creation date.</p>
      </div>

      <div className="panel space-y-3" data-testid="filter-bar">
        <FilterRow label="State" current={sp.state} options={states} param="state" />
        <FilterRow label="Category" current={sp.category} options={categories} param="category" />
        <FilterRow label="Priority" current={sp.priority} options={priorities} param="priority" />
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <p className="text-accentMuted">No issues match those filters.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((i) => (
              <li key={i.id} className="py-3 flex items-center gap-3" data-testid="issue-row">
                <span className="text-accentMuted text-sm w-14">#{i.github_number}</span>
                <Link
                  href={`/issues/${i.github_number}`}
                  className="flex-1 no-underline text-white hover:text-accent"
                >
                  {i.title}
                </Link>
                {i.category && <span className={`chip chip-${i.category}`}>{i.category}</span>}
                {i.priority && <span className={`chip chip-${i.priority}`}>{i.priority}</span>}
                {i.complexity && <span className="chip">{i.complexity}</span>}
                <span className="text-xs text-accentMuted w-14 text-right">{i.state}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  options,
  current,
  param,
}: {
  label: string;
  options: string[];
  current: string | undefined;
  param: string;
}) {
  const buildHref = (value: string | null) => {
    const params = new URLSearchParams();
    if (value) params.set(param, value);
    const q = params.toString();
    return q ? `?${q}` : "/issues";
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs uppercase tracking-wider text-accentMuted w-20">{label}</span>
      <Link
        href={buildHref(null)}
        className={`chip no-underline ${!current ? "border-accent text-accent" : ""}`}
      >
        all
      </Link>
      {options.map((o) => (
        <Link
          key={o}
          href={buildHref(o)}
          className={`chip chip-${o} no-underline ${current === o ? "border-accent" : ""}`}
        >
          {o}
        </Link>
      ))}
    </div>
  );
}
