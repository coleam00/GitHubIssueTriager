import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const r = await sql`DELETE FROM issues WHERE github_repo LIKE 'TEST/%' RETURNING id`;
  console.log("Deleted", r.length, "test rows");
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
