import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

  await sql`DELETE FROM issues WHERE github_repo = 'TEST/unicode'`;

  const longBody = "Ω".repeat(5000) + "\n```code\nconsole.log('x')\n```\n日本語テスト 😀🚀 <script>alert(1)</script>";
  const title = "Unicode ✨ 中文 Тест — unicode title";
  const labels = ["文档", "bug 🐛", "help wanted"];

  await sql`
    INSERT INTO issues (github_repo, github_number, title, body, state, url, labels, github_created_at)
    VALUES ('TEST/unicode', 200, ${title}, ${longBody}, 'open', 'https://x.com', ${labels}::text[], NOW())
  `;

  const [row] = (await sql`SELECT id, title, body, labels, length(body) AS body_len FROM issues WHERE github_repo = 'TEST/unicode'`) as unknown as [{ id: number; title: string; body: string; labels: string[]; body_len: number }];
  console.log("Title:", row.title);
  console.log("Labels:", row.labels);
  console.log("Body length (chars):", row.body_len);
  console.log("Body first 30:", row.body.slice(0, 30));
  console.log("Round-trip OK:", row.title === title && row.labels.join("|") === labels.join("|"));

  console.log("\nTest id:", row.id);
  console.log("To visit: /issues/200 (requires running server)");

  // Don't delete - we want to visit the page to verify rendering
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
