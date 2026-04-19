import "dotenv/config";
import postgres from "postgres";
import { listIssues } from "../src/lib/github.js";

async function main() {
  const repo = process.env.GITHUB_REPO ?? "coleam00/claude-memory-compiler";
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = postgres(url, { ssl: "require", max: 1 });

  console.log(`[sync] fetching issues from ${repo}`);
  const issues = await listIssues(repo, 50);
  console.log(`[sync] got ${issues.length} issue(s)`);

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
        author = EXCLUDED.author,
        url = EXCLUDED.url,
        labels = EXCLUDED.labels,
        github_updated_at = EXCLUDED.github_updated_at,
        synced_at = NOW()
    `;
  }

  console.log(`[sync] upserted ${issues.length} issue(s) into Neon`);
  await sql.end();
}

main().catch((err) => {
  console.error("[sync] FAILED:", err);
  process.exit(1);
});
