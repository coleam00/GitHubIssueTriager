import { sql } from "@/lib/db";
import { classify } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { id: number; title: string; body: string | null; labels: string[] };
type Where = "unclassified" | "all";
type Body = { limit?: number; where?: Where };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_CONCURRENCY = 4;

function parseConcurrency(): number {
  const raw = process.env.CLASSIFY_BATCH_CONCURRENCY;
  if (!raw) return DEFAULT_CONCURRENCY;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 16) return DEFAULT_CONCURRENCY;
  return n;
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    const text = await req.text();
    body = text ? (JSON.parse(text) as Body) : {};
  } catch {
    return Response.json({ ok: false, message: "invalid JSON body" }, { status: 400 });
  }

  const where: Where = body.where === "all" ? "all" : "unclassified";
  const requested = typeof body.limit === "number" ? body.limit : DEFAULT_LIMIT;
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(requested)));
  const concurrency = parseConcurrency();

  const rows = (
    where === "all"
      ? await sql`
          SELECT id, title, body, labels FROM issues
          ORDER BY github_created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT i.id, i.title, i.body, i.labels FROM issues i
          LEFT JOIN classifications c ON c.issue_id = i.id
          WHERE c.id IS NULL
          ORDER BY i.github_created_at DESC
          LIMIT ${limit}
        `
  ) as unknown as Row[];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      send({ type: "start", total: rows.length, where, limit, concurrency });

      const classified: Array<{ id: number; category: string; priority: string; complexity: string }> = [];
      const skipped: Array<{ id: number; message: string }> = [];

      let cursor = 0;
      const worker = async () => {
        while (true) {
          const i = cursor++;
          if (i >= rows.length) return;
          const issue = rows[i];
          try {
            const c = await classify({ title: issue.title, body: issue.body, labels: issue.labels });
            await sql`
              INSERT INTO classifications (issue_id, category, priority, complexity, summary, reasoning, model)
              VALUES (${issue.id}, ${c.category}, ${c.priority}, ${c.complexity}, ${c.summary}, ${c.reasoning}, ${c.model})
            `;
            const entry = { id: issue.id, category: c.category, priority: c.priority, complexity: c.complexity };
            classified.push(entry);
            send({ type: "item", ...entry });
          } catch (err) {
            const entry = { id: issue.id, message: err instanceof Error ? err.message : "classify failed" };
            skipped.push(entry);
            send({ type: "skip", ...entry });
          }
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, rows.length) }, () => worker());
      await Promise.all(workers);
      send({ ok: true, type: "done", classified, skipped });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
