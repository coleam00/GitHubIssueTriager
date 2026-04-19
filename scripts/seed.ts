import "dotenv/config";
import postgres from "postgres";
import { listIssues } from "../src/lib/github.js";
import { classify, embed, vectorToSqlLiteral } from "../src/lib/ai.js";

async function main() {
  const repo = process.env.GITHUB_REPO ?? "coleam00/claude-memory-compiler";
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = postgres(url, { ssl: "require", max: 1 });

  console.log(`[seed] step 1/3 sync issues from ${repo}`);
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
  console.log(`[seed] synced ${issues.length} issue(s)`);

  type Row = { id: number; title: string; body: string | null; labels: string[] };
  const rows = (await sql<Row[]>`
    SELECT id, title, body, labels FROM issues WHERE github_repo = ${repo}
  `) as unknown as Row[];

  console.log(`[seed] step 2/3 classify ${rows.length} issue(s)`);
  for (const row of rows) {
    const c = await classify({ title: row.title, body: row.body, labels: row.labels });
    await sql`
      INSERT INTO classifications (issue_id, category, priority, complexity, summary, reasoning, model)
      VALUES (${row.id}, ${c.category}, ${c.priority}, ${c.complexity}, ${c.summary}, ${c.reasoning}, ${c.model})
    `;
  }

  console.log(`[seed] step 3/3 embed ${rows.length} issue(s)`);
  for (const row of rows) {
    const text = `${row.title}\n\n${row.body || ""}`;
    const { vector, model } = await embed(text);
    const lit = vectorToSqlLiteral(vector);
    await sql`
      INSERT INTO similar_issues (issue_id, embedding, model)
      VALUES (${row.id}, ${lit}::vector, ${model})
      ON CONFLICT (issue_id) DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model
    `;
  }

  console.log(`[seed] done`);
  await sql.end();
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
