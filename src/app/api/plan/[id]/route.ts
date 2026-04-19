import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generatePlan } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { id: number; title: string; body: string | null; labels: string[] };

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const issueId = parseInt(id, 10);
  if (Number.isNaN(issueId)) {
    return NextResponse.json({ ok: false, message: "bad id" }, { status: 400 });
  }

  const rows = (await sql`
    SELECT id, title, body, labels FROM issues WHERE id = ${issueId} LIMIT 1
  `) as unknown as Row[];
  const issue = rows[0];
  if (!issue) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });

  try {
    const plan = await generatePlan({
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
    });
    await sql`
      INSERT INTO plans (issue_id, content, model)
      VALUES (${issue.id}, ${plan.content}, ${plan.model})
    `;
    return NextResponse.json({
      ok: true,
      model: plan.model,
      message: `plan generated (${plan.model})`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "plan failed" },
      { status: 500 },
    );
  }
}
