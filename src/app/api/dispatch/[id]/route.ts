import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createBranchName } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IssueRow = { id: number; github_repo: string; github_number: number; title: string };
type PlanRow = { id: number };

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ ok: false, message: "bad id" }, { status: 400 });
  }
  const issueId = parseInt(id, 10);
  if (!Number.isSafeInteger(issueId) || issueId < 1 || issueId > 2147483647) {
    return NextResponse.json({ ok: false, message: "bad id" }, { status: 400 });
  }

  const issue = ((await sql`
    SELECT id, github_repo, github_number, title FROM issues WHERE id = ${issueId} LIMIT 1
  `) as unknown as IssueRow[])[0];
  if (!issue) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });

  const plan = ((await sql`
    SELECT id FROM plans WHERE issue_id = ${issueId} ORDER BY created_at DESC LIMIT 1
  `) as unknown as PlanRow[])[0];
  if (!plan) {
    return NextResponse.json(
      { ok: false, message: "generate a plan before dispatching" },
      { status: 400 },
    );
  }

  const branch = await createBranchName(issue.github_repo, issue.github_number, issue.title);
  const notes = `Simulated dispatch. In production this would call Archon / Claude Agent SDK against a Neon branch for isolated E2E testing.`;

  await sql`
    INSERT INTO runs (issue_id, plan_id, status, branch_name, notes, updated_at)
    VALUES (${issue.id}, ${plan.id}, 'dispatched', ${branch}, ${notes}, NOW())
  `;

  return NextResponse.json({
    ok: true,
    branch,
    message: `dispatched on branch ${branch}`,
  });
}
