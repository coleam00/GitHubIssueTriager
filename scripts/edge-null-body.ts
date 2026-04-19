import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

  // Clean up
  await sql`DELETE FROM issues WHERE github_repo = 'TEST/edge'`;

  // Issue with null body, empty label array
  await sql`
    INSERT INTO issues (github_repo, github_number, title, body, state, url, github_created_at)
    VALUES ('TEST/edge', 100, 'empty body test', NULL, 'open', 'https://x.com', NOW())
  `;
  const [row] = (await sql`SELECT id, title, body, labels FROM issues WHERE github_repo = 'TEST/edge'`) as unknown as [{ id: number; title: string; body: string | null; labels: string[] }];
  console.log("Inserted:", row);
  console.log("body is null:", row.body === null);
  console.log("labels is array:", Array.isArray(row.labels), "length:", row.labels.length);

  await sql`DELETE FROM issues WHERE github_repo = 'TEST/edge'`;

  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
