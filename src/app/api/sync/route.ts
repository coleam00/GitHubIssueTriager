import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { listIssues } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const repo = process.env.GITHUB_REPO ?? "coleam00/claude-memory-compiler";
  try {
    const issues = await listIssues(repo, 50);
    for (const gh of issues) {
      await sql`
        INSERT INTO issues (
          github_repo, github_number, title, body, state, author, url, labels,
          github_created_at, github_updated_at, synced_at
        )
        VALUES (
          ${repo},
          ${gh.number},
          ${gh.title},
          ${gh.body || null},
          ${gh.state.toLowerCase()},
          ${gh.author?.login || null},
          ${gh.url},
          ${gh.labels.map((l) => l.name)},
          ${gh.createdAt},
          ${gh.updatedAt || null},
          NOW()
        )
        ON CONFLICT (github_repo, github_number) DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          state = EXCLUDED.state,
          labels = EXCLUDED.labels,
          synced_at = NOW()
      `;
    }
    return NextResponse.json({
      ok: true,
      repo,
      count: issues.length,
      message: `synced ${issues.length} issue(s) from ${repo}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "sync failed" },
      { status: 500 },
    );
  }
}
