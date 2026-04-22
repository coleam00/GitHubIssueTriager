import { NextRequest } from "next/server";
import { getIssues, type IssueListRow } from "@/lib/issues";

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

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toIso(value: string | Date | null): string {
  if (value === null) return "";
  if (value instanceof Date) return value.toISOString();
  return value;
}

function rowToCsv(row: IssueListRow): string {
  const fields = [
    String(row.github_number),
    row.title,
    row.state,
    row.category ?? "",
    row.priority ?? "",
    row.complexity ?? "",
    toIso(row.github_created_at),
    toIso(row.github_updated_at),
    row.labels.join(";"),
  ];
  return fields.map(csvEscape).join(",");
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const filter = {
    category: sp.get("category") ?? undefined,
    priority: sp.get("priority") ?? undefined,
    state: sp.get("state") ?? undefined,
  };

  const rows = await getIssues(filter);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(COLUMNS.join(",") + "\n"));
      for (const row of rows) {
        controller.enqueue(encoder.encode(rowToCsv(row) + "\n"));
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
