import Link from "next/link";
import { sql } from "@/lib/db";
import SyncButton from "@/components/SyncButton";
import ClassifyBatchButton from "@/components/ClassifyBatchButton";

export const dynamic = "force-dynamic";

type Stats = {
  total: number;
  open: number;
  classified: number;
  planned: number;
  runs: number;
};

type ByCategory = { category: string; count: number };
type ByPriority = { priority: string; count: number };
type RecentIssue = {
  id: number;
  github_number: number;
  title: string;
  state: string;
  category: string | null;
  priority: string | null;
};

async function getStats(): Promise<Stats> {
  const [r] = (await sql`
    SELECT
      (SELECT COUNT(*)::int FROM issues) AS total,
      (SELECT COUNT(*)::int FROM issues WHERE state = 'open') AS open,
      (SELECT COUNT(DISTINCT issue_id)::int FROM classifications) AS classified,
      (SELECT COUNT(DISTINCT issue_id)::int FROM plans) AS planned,
      (SELECT COUNT(*)::int FROM runs) AS runs
  `) as unknown as Stats[];
  return r;
}

async function getByCategory(): Promise<ByCategory[]> {
  return (await sql`
    SELECT category, COUNT(*)::int AS count
    FROM (
      SELECT DISTINCT ON (issue_id) issue_id, category
      FROM classifications
      ORDER BY issue_id, created_at DESC
    ) latest
    GROUP BY category
    ORDER BY count DESC
  `) as unknown as ByCategory[];
}

async function getByPriority(): Promise<ByPriority[]> {
  return (await sql`
    SELECT priority, COUNT(*)::int AS count
    FROM (
      SELECT DISTINCT ON (issue_id) issue_id, priority
      FROM classifications
      ORDER BY issue_id, created_at DESC
    ) latest
    GROUP BY priority
    ORDER BY priority
  `) as unknown as ByPriority[];
}

async function getRecentIssues(): Promise<RecentIssue[]> {
  return (await sql`
    SELECT
      i.id,
      i.github_number,
      i.title,
      i.state,
      latest.category,
      latest.priority
    FROM issues i
    LEFT JOIN LATERAL (
      SELECT category, priority FROM classifications c
      WHERE c.issue_id = i.id
      ORDER BY c.created_at DESC LIMIT 1
    ) latest ON TRUE
    ORDER BY i.github_created_at DESC
    LIMIT 8
  `) as unknown as RecentIssue[];
}

export default async function Home() {
  const [stats, byCategory, byPriority, recent] = await Promise.all([
    getStats(),
    getByCategory(),
    getByPriority(),
    getRecentIssues(),
  ]);

  return (
    <div className="space-y-8">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Triage Dashboard</h1>
          <p className="text-accentMuted mt-2">
            AI-classified GitHub issues, stored on Neon Postgres with pgvector similarity search.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ClassifyBatchButton />
          <SyncButton />
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="stats-row">
        <StatCard label="Issues" value={stats.total} />
        <StatCard label="Open" value={stats.open} />
        <StatCard label="Classified" value={stats.classified} />
        <StatCard label="Planned" value={stats.planned} />
        <StatCard label="Runs" value={stats.runs} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel">
          <h2 className="text-lg font-bold mb-3">By Category</h2>
          {byCategory.length === 0 ? (
            <p className="text-accentMuted text-sm">
              No classifications yet. Click Sync + Classify to seed data.
            </p>
          ) : (
            <ul className="space-y-2">
              {byCategory.map((r) => (
                <li key={r.category} className="flex justify-between items-center">
                  <span className={`chip chip-${r.category}`}>{r.category}</span>
                  <span className="text-lg font-semibold">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h2 className="text-lg font-bold mb-3">By Priority</h2>
          {byPriority.length === 0 ? (
            <p className="text-accentMuted text-sm">No priorities yet.</p>
          ) : (
            <ul className="space-y-2">
              {byPriority.map((r) => (
                <li key={r.priority} className="flex justify-between items-center">
                  <span className={`chip chip-${r.priority}`}>{r.priority}</span>
                  <span className="text-lg font-semibold">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Recent issues</h2>
          <Link href="/issues" className="text-sm no-underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-accentMuted text-sm">
            No issues synced yet. Use the Sync button at the top to pull from GitHub.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((i) => (
              <li key={i.id} className="py-3 flex items-center gap-3">
                <span className="text-accentMuted text-sm w-12">#{i.github_number}</span>
                <Link
                  href={`/issues/${i.github_number}`}
                  className="flex-1 no-underline text-foreground hover:text-accent"
                >
                  {i.title}
                </Link>
                {i.category && <span className={`chip chip-${i.category}`}>{i.category}</span>}
                {i.priority && <span className={`chip chip-${i.priority}`}>{i.priority}</span>}
                <span className="text-xs text-accentMuted w-12 text-right">{i.state}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel" data-testid={`stat-${label.toLowerCase()}`}>
      <div className="text-xs uppercase tracking-wider text-accentMuted">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
