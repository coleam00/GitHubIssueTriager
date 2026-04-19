import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

  // 1. Confirm vector dims
  const dims = await sql`
    SELECT issue_id, vector_dims(embedding) AS dims, model
    FROM similar_issues
    ORDER BY issue_id
  `;
  console.log("Dims per row:");
  for (const r of dims) console.log(r);

  // 2. Pull vector for issue 1 and verify self-similarity
  const [v1] = (await sql`SELECT embedding::text AS emb FROM similar_issues WHERE issue_id = 1`) as unknown as [{ emb: string }];
  const self = await sql`SELECT 1 - (embedding <=> ${v1.emb}::vector) AS sim FROM similar_issues WHERE issue_id = 1`;
  console.log("Self similarity (should be ~1.0):", self[0]);

  // 3. EXPLAIN the query pattern
  const plan = await sql`EXPLAIN
    SELECT issue_id, 1 - (embedding <=> ${v1.emb}::vector) AS sim
    FROM similar_issues WHERE issue_id <> 1
    ORDER BY embedding <=> ${v1.emb}::vector ASC LIMIT 3`;
  console.log("\nEXPLAIN:");
  for (const p of plan) console.log(p);

  // 4. Check upsert updated, not duplicated (similar_issues has issue_id PK)
  const counts = await sql`SELECT COUNT(*)::int AS n FROM similar_issues`;
  console.log("\nTotal embeddings:", counts[0]);

  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
