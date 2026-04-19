import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const r = await sql`
    SELECT issue_id, COUNT(*)::int AS n
    FROM classifications
    GROUP BY issue_id ORDER BY issue_id
  `;
  for (const row of r) console.log(row);
  const total = await sql`SELECT COUNT(*)::int AS n FROM classifications`;
  console.log("TOTAL:", total[0]);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
