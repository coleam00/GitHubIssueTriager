import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { embed, vectorToSqlLiteral } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EMBED_CHARS = 8000;

type Match = {
  github_number: number;
  title: string;
  url: string;
  category: string | null;
  priority: string | null;
  complexity: string | null;
  distance: number;
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "invalid json" }, { status: 400 });
  }

  const text = typeof (body as { text?: unknown })?.text === "string" ? (body as { text: string }).text : "";
  const trimmed = text.trim();
  if (!trimmed) {
    return NextResponse.json({ ok: false, message: "text is required" }, { status: 400 });
  }

  const capped = trimmed.slice(0, MAX_EMBED_CHARS);

  try {
    const { vector, model } = await embed(capped);
    const lit = vectorToSqlLiteral(vector);

    const matches = (await sql`
      SELECT
        i.github_number,
        i.title,
        i.url,
        latest.category,
        latest.priority,
        latest.complexity,
        s.embedding <=> ${lit}::vector AS distance
      FROM similar_issues s
      JOIN issues i ON i.id = s.issue_id
      LEFT JOIN LATERAL (
        SELECT category, priority, complexity FROM classifications c
        WHERE c.issue_id = i.id
        ORDER BY c.created_at DESC LIMIT 1
      ) latest ON TRUE
      ORDER BY s.embedding <=> ${lit}::vector ASC
      LIMIT 5
    `) as unknown as Match[];

    return NextResponse.json({ ok: true, model, matches });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "search failed" },
      { status: 500 },
    );
  }
}
