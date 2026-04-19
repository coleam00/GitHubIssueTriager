import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

  const [stats] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM issues) AS total,
      (SELECT COUNT(*)::int FROM issues WHERE state = 'open') AS open,
      (SELECT COUNT(DISTINCT issue_id)::int FROM classifications) AS classified,
      (SELECT COUNT(DISTINCT issue_id)::int FROM plans) AS planned,
      (SELECT COUNT(*)::int FROM runs) AS runs
  `;
  console.log("Stats:", stats);

  const byCat = await sql`
    SELECT category, COUNT(*)::int AS count
    FROM (SELECT DISTINCT ON (issue_id) issue_id, category FROM classifications ORDER BY issue_id, created_at DESC) l
    GROUP BY category ORDER BY count DESC
  `;
  console.log("\nBy category:");
  for (const r of byCat) console.log(r);

  const byPri = await sql`
    SELECT priority, COUNT(*)::int AS count
    FROM (SELECT DISTINCT ON (issue_id) issue_id, priority FROM classifications ORDER BY issue_id, created_at DESC) l
    GROUP BY priority ORDER BY priority
  `;
  console.log("\nBy priority:");
  for (const r of byPri) console.log(r);

  const recent = await sql`
    SELECT i.github_number, i.title
    FROM issues i ORDER BY i.github_created_at DESC LIMIT 8
  `;
  console.log("\nRecent 8:");
  for (const r of recent) console.log(r);

  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
