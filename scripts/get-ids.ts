import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`SELECT id, github_number FROM issues ORDER BY github_number`;
  for (const r of rows) console.log(r);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
