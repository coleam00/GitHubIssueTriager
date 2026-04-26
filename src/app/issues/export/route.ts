import { listIssuesForExport, type IssueFilter } from "@/lib/issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = [
  "number",
  "title",
  "state",
  "category",
  "priority",
  "complexity",
  "created_at",
  "updated_at",
  "labels",
] as const;

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(values: Array<string | null | undefined>): string {
  return values.map(csvEscape).join(",") + "\r\n";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const filter: IssueFilter = {
    category: url.searchParams.get("category") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
  };

  const rows = await listIssuesForExport(filter);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(csvRow([...COLUMNS])));
      for (const r of rows) {
        controller.enqueue(
          encoder.encode(
            csvRow([
              String(r.github_number),
              r.title,
              r.state,
              r.category,
              r.priority,
              r.complexity,
              r.github_created_at,
              r.github_updated_at,
              (r.labels ?? []).join(";"),
            ]),
          ),
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="issues.csv"',
      "Cache-Control": "no-store",
    },
  });
}
