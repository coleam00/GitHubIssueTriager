import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = postgres(url, { ssl: "require", max: 1 });
  const dir = join(process.cwd(), "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const path = join(dir, file);
    const content = readFileSync(path, "utf8");
    console.log(`[migrate] applying ${file}`);
    await sql.unsafe(content);
  }

  console.log(`[migrate] done. ${files.length} file(s) applied.`);
  await sql.end();
}

main().catch((err) => {
  console.error("[migrate] FAILED:", err);
  process.exit(1);
});
