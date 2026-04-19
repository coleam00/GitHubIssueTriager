import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

  // Use a fresh synthetic issue so we don't disturb real data
  const [inserted] = (await sql`
    INSERT INTO issues (github_repo, github_number, title, body, state, url, labels, github_created_at)
    VALUES ('TEST/fk', 9999, 'fk test', 'body', 'open', 'https://example.com', ARRAY['tag']::text[], NOW())
    RETURNING id
  `) as unknown as [{ id: number }];
  const testId = inserted.id;
  console.log("Inserted test issue id=", testId);

  // Insert one row in every child table
  await sql`INSERT INTO classifications (issue_id, category, priority, complexity, summary, reasoning, model) VALUES (${testId}, 'bug', 'P0', 'small', 's', 'r', 'm')`;
  const dummy = Array(1536).fill(0.1);
  const lit = `[${dummy.join(",")}]`;
  await sql`INSERT INTO similar_issues (issue_id, embedding, model) VALUES (${testId}, ${lit}::vector, 'm')`;
  const [plan] = (await sql`INSERT INTO plans (issue_id, content, model) VALUES (${testId}, 'plan', 'm') RETURNING id`) as unknown as [{ id: number }];
  await sql`INSERT INTO runs (issue_id, plan_id, status, branch_name, notes) VALUES (${testId}, ${plan.id}, 'x', 'b', 'n')`;

  const before = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM classifications WHERE issue_id = ${testId}) AS classifications,
      (SELECT COUNT(*)::int FROM similar_issues WHERE issue_id = ${testId}) AS embeddings,
      (SELECT COUNT(*)::int FROM plans WHERE issue_id = ${testId}) AS plans,
      (SELECT COUNT(*)::int FROM runs WHERE issue_id = ${testId}) AS runs
  `;
  console.log("Before delete:", before[0]);

  // SET NULL test: delete only the plan, verify run.plan_id becomes NULL
  await sql`DELETE FROM plans WHERE id = ${plan.id}`;
  const [setNullCheck] = (await sql`SELECT plan_id FROM runs WHERE issue_id = ${testId}`) as unknown as [{ plan_id: number | null }];
  console.log("After deleting plan, runs.plan_id =", setNullCheck.plan_id);

  // CASCADE test
  await sql`DELETE FROM issues WHERE id = ${testId}`;
  const after = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM classifications WHERE issue_id = ${testId}) AS classifications,
      (SELECT COUNT(*)::int FROM similar_issues WHERE issue_id = ${testId}) AS embeddings,
      (SELECT COUNT(*)::int FROM plans WHERE issue_id = ${testId}) AS plans,
      (SELECT COUNT(*)::int FROM runs WHERE issue_id = ${testId}) AS runs
  `;
  console.log("After delete:", after[0]);

  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
