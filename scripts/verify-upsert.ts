import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

  const before = await sql`SELECT COUNT(*)::int AS n, MAX(synced_at) AS last_sync FROM issues`;
  console.log("Before:", before[0]);

  // Trigger a fake update via direct SQL to simulate re-sync overwrite
  await sql`UPDATE issues SET title = title || ' (marker)' WHERE github_number = 1`;
  const after = await sql`SELECT github_number, title, synced_at FROM issues WHERE github_number = 1`;
  console.log("Marker applied:", after[0]);

  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
