import { z } from "zod";
import { sql } from "@/lib/db";
import { classify } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Runs up to CONCURRENCY classify() calls in parallel. Bump only if the model
// provider's rate limit genuinely allows it.
const CONCURRENCY = 4;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type Row = { id: number; title: string; body: string | null; labels: string[] };
type Classified = { id: number; category: string; priority: string; complexity: string };
type Skipped = { id: number; reason: string };

const BodySchema = z.object({
  limit: z.number().int().positive().max(MAX_LIMIT).optional(),
  where: z.enum(["unclassified", "all"]).optional(),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json().catch(() => ({}));
    parsed = BodySchema.parse(raw);
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, message: err instanceof Error ? err.message : "bad body" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const limit = parsed.limit ?? DEFAULT_LIMIT;
  const where = parsed.where ?? "unclassified";

  const candidates = (
    where === "unclassified"
      ? ((await sql`
          SELECT i.id, i.title, i.body, i.labels
          FROM issues i
          WHERE NOT EXISTS (SELECT 1 FROM classifications c WHERE c.issue_id = i.id)
          ORDER BY i.github_created_at DESC
          LIMIT ${limit}
        `) as unknown as Row[])
      : ((await sql`
          SELECT i.id, i.title, i.body, i.labels,
            EXISTS (SELECT 1 FROM classifications c WHERE c.issue_id = i.id) AS has_class
          FROM issues i
          ORDER BY i.github_created_at DESC
          LIMIT ${limit}
        `) as unknown as (Row & { has_class: boolean })[])
  ) as (Row & { has_class?: boolean })[];

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const writeLine = (obj: unknown) => controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));

      const classified: Classified[] = [];
      const skipped: Skipped[] = [];

      // Partition: skip already-classified rows (only possible under where='all').
      const work: Row[] = [];
      for (const row of candidates) {
        if (row.has_class) {
          const s: Skipped = { id: row.id, reason: "already_classified" };
          skipped.push(s);
          writeLine({ type: "skipped", ...s });
        } else {
          work.push(row);
        }
      }

      // Slot-based worker pool; no p-limit dep.
      let cursor = 0;
      const runWorker = async () => {
        while (cursor < work.length) {
          const idx = cursor++;
          const row = work[idx];
          try {
            const c = await classify({
              title: row.title,
              body: row.body,
              labels: row.labels,
            });
            await sql`
              INSERT INTO classifications (issue_id, category, priority, complexity, summary, reasoning, model)
              VALUES (${row.id}, ${c.category}, ${c.priority}, ${c.complexity}, ${c.summary}, ${c.reasoning}, ${c.model})
            `;
            const entry: Classified = {
              id: row.id,
              category: c.category,
              priority: c.priority,
              complexity: c.complexity,
            };
            classified.push(entry);
            writeLine({ type: "classified", ...entry });
          } catch (err) {
            const s: Skipped = {
              id: row.id,
              reason: err instanceof Error ? err.message : "classify failed",
            };
            skipped.push(s);
            writeLine({ type: "skipped", ...s });
          }
        }
      };

      try {
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, work.length) }, () => runWorker()),
        );
        writeLine({ type: "done", ok: true, classified, skipped });
      } catch (err) {
        writeLine({
          type: "done",
          ok: false,
          message: err instanceof Error ? err.message : "batch failed",
          classified,
          skipped,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
