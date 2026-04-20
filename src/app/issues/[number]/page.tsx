import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import IssueActions from "@/components/IssueActions";

export const dynamic = "force-dynamic";

type IssueRow = {
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
};

type LatestClassification = {
  category: string;
  priority: string;
  complexity: string;
  summary: string | null;
  reasoning: string | null;
  model: string;
  created_at: string;
};

type LatestPlan = {
  id: number;
  content: string;
  model: string;
  created_at: string;
};

type SimilarRow = {
  github_number: number;
  title: string;
  similarity: number;
  state: string;
};

type RunRow = {
  id: number;
  status: string;
  branch_name: string | null;
  notes: string | null;
  created_at: string;
};

async function fetchAll(number: number) {
  const [issues] = (await sql`
    SELECT id, github_repo, github_number, title, body, state, author, url, labels, github_created_at
    FROM issues WHERE github_number = ${number} LIMIT 1
  `) as unknown as IssueRow[][];
  return issues;
}

export default async function IssueDetail({ params }: { params: Promise<{ number: string }> }) {
  const p = await params;
  if (!/^\d+$/.test(p.number)) notFound();
  const number = parseInt(p.number, 10);
  if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647) notFound();

  const issue = ((await sql`
    SELECT id, github_repo, github_number, title, body, state, author, url, labels, github_created_at
    FROM issues WHERE github_number = ${number} LIMIT 1
  `) as unknown as IssueRow[])[0];

  if (!issue) notFound();

  const classification = ((await sql`
    SELECT category, priority, complexity, summary, reasoning, model, created_at
    FROM classifications WHERE issue_id = ${issue.id}
    ORDER BY created_at DESC LIMIT 1
  `) as unknown as LatestClassification[])[0];

  const plan = ((await sql`
    SELECT id, content, model, created_at FROM plans WHERE issue_id = ${issue.id}
    ORDER BY created_at DESC LIMIT 1
  `) as unknown as LatestPlan[])[0];

  const similar = (await sql`
    SELECT
      i2.github_number,
      i2.title,
      i2.state,
      1 - (s.embedding <=> target.embedding) AS similarity
    FROM similar_issues s
    CROSS JOIN (
      SELECT embedding FROM similar_issues WHERE issue_id = ${issue.id}
    ) target
    JOIN issues i2 ON i2.id = s.issue_id
    WHERE s.issue_id <> ${issue.id}
    ORDER BY s.embedding <=> target.embedding ASC
    LIMIT 3
  `) as unknown as SimilarRow[];

  const runs = (await sql`
    SELECT id, status, branch_name, notes, created_at FROM runs
    WHERE issue_id = ${issue.id}
    ORDER BY created_at DESC LIMIT 5
  `) as unknown as RunRow[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/issues" className="text-sm no-underline">← Back to issues</Link>
      </div>

      <div className="panel space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-accentMuted">#{issue.github_number}</span>
          <h1 className="text-2xl font-bold flex-1">{issue.title}</h1>
          <span className="chip">{issue.state}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {issue.author && <span className="text-accentMuted">by {issue.author}</span>}
          {issue.labels.map((l) => (
            <span key={l} className="chip">{l}</span>
          ))}
          <a href={issue.url} target="_blank" className="no-underline text-sm ml-auto">
            View on GitHub ↗
          </a>
        </div>
        {issue.body && (
          <div className="whitespace-pre-wrap text-sm text-foreground bg-surface p-3 rounded border border-border max-h-64 overflow-auto">
            {issue.body}
          </div>
        )}
      </div>

      <IssueActions
        issueId={issue.id}
        issueNumber={issue.github_number}
        hasClassification={!!classification}
        hasPlan={!!plan}
      />

      <div className="panel" data-testid="classification-panel">
        <h2 className="text-lg font-bold mb-3">Classification</h2>
        {classification ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={`chip chip-${classification.category}`}>{classification.category}</span>
              <span className={`chip chip-${classification.priority}`}>{classification.priority}</span>
              <span className="chip">{classification.complexity}</span>
              <span className="text-accentMuted text-xs ml-auto">{classification.model}</span>
            </div>
            {classification.summary && <p className="font-medium">{classification.summary}</p>}
            {classification.reasoning && (
              <p className="text-accentMuted italic">{classification.reasoning}</p>
            )}
          </div>
        ) : (
          <p className="text-accentMuted text-sm">Not yet classified. Click Classify above.</p>
        )}
      </div>

      <div className="panel" data-testid="similar-panel">
        <h2 className="text-lg font-bold mb-3">Similar issues (pgvector)</h2>
        {similar.length === 0 ? (
          <p className="text-accentMuted text-sm">No embedding yet, or not enough issues for comparison.</p>
        ) : (
          <ul className="divide-y divide-border">
            {similar.map((s) => (
              <li key={s.github_number} className="py-2 flex items-center gap-3 text-sm">
                <span className="text-accentMuted w-12">#{s.github_number}</span>
                <Link href={`/issues/${s.github_number}`} className="flex-1 no-underline text-foreground hover:text-accent">
                  {s.title}
                </Link>
                <span className="chip">{(s.similarity * 100).toFixed(0)}% match</span>
                <span className="text-xs text-accentMuted w-14 text-right">{s.state}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel" data-testid="plan-panel">
        <h2 className="text-lg font-bold mb-3">Implementation plan</h2>
        {plan ? (
          <div className="whitespace-pre-wrap text-sm bg-surface p-4 rounded border border-border">
            {plan.content}
            <div className="text-xs text-accentMuted mt-3">model: {plan.model}</div>
          </div>
        ) : (
          <p className="text-accentMuted text-sm">No plan generated yet. Click Generate plan above.</p>
        )}
      </div>

      <div className="panel" data-testid="runs-panel">
        <h2 className="text-lg font-bold mb-3">Dispatch runs</h2>
        {runs.length === 0 ? (
          <p className="text-accentMuted text-sm">No runs dispatched yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {runs.map((r) => (
              <li key={r.id} className="py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="chip">{r.status}</span>
                  {r.branch_name && (
                    <code className="text-accent">{r.branch_name}</code>
                  )}
                  <span className="text-xs text-accentMuted ml-auto">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                {r.notes && <p className="text-xs text-accentMuted mt-1">{r.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
