import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

  // Clean up any leftover test rows
  await sql`DELETE FROM issues WHERE github_repo = 'TEST/unique'`;

  // First insert should succeed
  await sql`
    INSERT INTO issues (github_repo, github_number, title, state, url, github_created_at)
    VALUES ('TEST/unique', 1, 'A', 'open', 'https://x.com', NOW())
  `;
  console.log("First insert OK");

  // Second insert with same (repo, number) should fail with unique violation
  try {
    await sql`
      INSERT INTO issues (github_repo, github_number, title, state, url, github_created_at)
      VALUES ('TEST/unique', 1, 'B', 'open', 'https://x.com', NOW())
    `;
    console.log("UNEXPECTED: duplicate insert succeeded");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = (e as { code?: string }).code;
    console.log("Duplicate rejected as expected. Code:", code, "Msg:", msg.slice(0, 100));
  }

  // Different repo + same number should succeed (composite uniqueness)
  await sql`
    INSERT INTO issues (github_repo, github_number, title, state, url, github_created_at)
    VALUES ('TEST/unique2', 1, 'C', 'open', 'https://x.com', NOW())
  `;
  console.log("Different repo + same number OK (composite unique confirmed)");

  // Cleanup
  await sql`DELETE FROM issues WHERE github_repo IN ('TEST/unique', 'TEST/unique2')`;

  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
