import { assignPort } from "./assign-port";

const port = Number(process.env.PORT ?? assignPort());
const base = `http://localhost:${port}`;

const routes = ["/", "/issues", "/issues/1"];
const fails: string[] = [];

async function run() {
  console.log(`[smoke] hitting ${base}`);
  for (const r of routes) {
    try {
      const res = await fetch(base + r, { redirect: "manual" });
      if (res.status >= 500) fails.push(`${r} -> ${res.status}`);
      else console.log(`  ${r} -> ${res.status}`);
    } catch (err) {
      fails.push(`${r} -> ${err instanceof Error ? err.message : "fetch error"}`);
    }
  }
  if (fails.length > 0) {
    console.error(`[smoke] FAIL\n  ${fails.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`[smoke] OK (${routes.length} routes)`);
}

run();
