import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const r = await sql`SELECT github_number, title, synced_at FROM issues WHERE github_number = 1`;
  console.log("After sync:", r[0]);
  const n = await sql`SELECT COUNT(*)::int AS n FROM issues`;
  console.log("Total issues:", n[0]);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
