import Link from "next/link";
import { getIssues } from "@/lib/issues";

export const dynamic = "force-dynamic";

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

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) exportParams.set(k, v);
  }
  const exportQuery = exportParams.toString();
  const exportHref = `/api/issues/export${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Issues</h1>
        <p className="text-accentMuted mt-2">Sorted by priority, then creation date.</p>
      </div>

      <div className="panel space-y-3" data-testid="filter-bar">
        <FilterRow label="State" current={sp.state} options={states} param="state" sp={sp} />
        <FilterRow label="Category" current={sp.category} options={categories} param="category" sp={sp} />
        <FilterRow label="Priority" current={sp.priority} options={priorities} param="priority" sp={sp} />
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs uppercase tracking-wider text-accentMuted w-20">Export</span>
          <a
            href={exportHref}
            className="chip no-underline border-accent text-accent"
            data-testid="export-csv"
          >
            Export CSV
          </a>
        </div>
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
                  className="flex-1 no-underline text-foreground hover:text-accent"
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
  sp,
}: {
  label: string;
  options: string[];
  current: string | undefined;
  param: string;
  sp: { category?: string; priority?: string; state?: string };
}) {
  const buildHref = (value: string | null) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== param) params.set(k, v);
    }
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
