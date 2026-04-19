import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const issues = await sql`
    SELECT github_number, state, title, array_length(labels, 1) AS label_count, github_repo
    FROM issues ORDER BY github_number
  `;
  for (const i of issues) console.log(i);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
