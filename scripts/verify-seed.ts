import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  console.log("Latest classifications per issue:");
  const rows = await sql`
    SELECT DISTINCT ON (i.id)
      i.github_number, c.category, c.priority, c.complexity, c.model, c.summary
    FROM issues i
    JOIN classifications c ON c.issue_id = i.id
    ORDER BY i.id, c.created_at DESC
  `;
  for (const r of rows) console.log(" ", r);

  const models = await sql`SELECT model, COUNT(*)::int AS n FROM similar_issues GROUP BY model`;
  console.log("Embedding models:", models);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
