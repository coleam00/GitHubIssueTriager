import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { classify } from "@/lib/ai";

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
    const c = await classify({ title: issue.title, body: issue.body, labels: issue.labels });
    await sql`
      INSERT INTO classifications (issue_id, category, priority, complexity, summary, reasoning, model)
      VALUES (${issue.id}, ${c.category}, ${c.priority}, ${c.complexity}, ${c.summary}, ${c.reasoning}, ${c.model})
    `;
    return NextResponse.json({
      ok: true,
      classification: c,
      message: `classified as ${c.category} / ${c.priority} / ${c.complexity}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "classify failed" },
      { status: 500 },
    );
  }
}
