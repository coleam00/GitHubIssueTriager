import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM issues) AS issues,
      (SELECT COUNT(*)::int FROM classifications) AS classifications,
      (SELECT COUNT(*)::int FROM similar_issues) AS embeddings,
      (SELECT COUNT(*)::int FROM plans) AS plans,
      (SELECT COUNT(*)::int FROM runs) AS runs
  `;
  console.log("DB state:", counts[0]);
  const runs = await sql`SELECT id, issue_id, status, branch_name FROM runs ORDER BY created_at DESC LIMIT 5`;
  console.log("Recent runs:");
  for (const r of runs) console.log(" ", r);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
