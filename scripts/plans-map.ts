import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const r = await sql`
    SELECT i.id, i.github_number, COUNT(p.id)::int AS plan_count
    FROM issues i
    LEFT JOIN plans p ON p.issue_id = i.id
    GROUP BY i.id, i.github_number
    ORDER BY i.id
  `;
  for (const row of r) console.log(row);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
