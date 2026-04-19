import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

  console.log("== Extensions ==");
  console.log(await sql`SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector','uuid-ossp','pgcrypto')`);

  console.log("\n== Tables ==");
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `;
  console.log(tables);

  console.log("\n== Columns ==");
  const cols = await sql`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;
  for (const c of cols) console.log(c);

  console.log("\n== Constraints ==");
  const cons = await sql`
    SELECT conname, contype, conrelid::regclass AS "table", pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY conrelid::regclass::text, conname
  `;
  for (const c of cons) console.log(c);

  console.log("\n== Indexes ==");
  const idx = await sql`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;
  for (const i of idx) console.log(i);

  console.log("\n== Row counts ==");
  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM issues) AS issues,
      (SELECT COUNT(*)::int FROM classifications) AS classifications,
      (SELECT COUNT(*)::int FROM similar_issues) AS embeddings,
      (SELECT COUNT(*)::int FROM plans) AS plans,
      (SELECT COUNT(*)::int FROM runs) AS runs
  `;
  console.log(counts[0]);

  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
