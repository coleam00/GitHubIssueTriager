import { NextRequest } from "next/server";
import { fetchFilteredIssues, type FilteredIssueRow } from "@/lib/db";

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

function escapeCsvField(value: string): string {
  if (value === "") return "";
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(values: (string | null | undefined)[]): string {
  return values.map((v) => escapeCsvField(v ?? "")).join(",") + "\n";
}

function rowToCsv(row: FilteredIssueRow): string {
  return toCsvRow([
    String(row.github_number),
    row.title,
    row.state,
    row.category,
    row.priority,
    row.complexity,
    row.github_created_at instanceof Date
      ? row.github_created_at.toISOString()
      : String(row.github_created_at ?? ""),
    row.github_updated_at instanceof Date
      ? row.github_updated_at.toISOString()
      : row.github_updated_at
        ? String(row.github_updated_at)
        : "",
    (row.labels ?? []).join(";"),
  ]);
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const filter = {
    category: sp.get("category") ?? undefined,
    priority: sp.get("priority") ?? undefined,
    state: sp.get("state") ?? undefined,
  };

  const rows = await fetchFilteredIssues(filter);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(toCsvRow([...COLUMNS])));
      for (const row of rows) {
        controller.enqueue(encoder.encode(rowToCsv(row)));
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
