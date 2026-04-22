import { assignPort } from "./assign-port";

const port = Number(process.env.PORT ?? assignPort());
const base = `http://localhost:${port}`;

const routes = ["/", "/issues", "/issues/1"];
const fails: string[] = [];

async function checkClassifyBatch() {
  const res = await fetch(base + "/api/classify-batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ limit: 3, where: "unclassified" }),
  });
  if (!res.ok || !res.body) {
    fails.push(`/api/classify-batch -> ${res.status}`);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawDone = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const evt = JSON.parse(line) as { type: string; ok?: boolean };
      if (evt.type === "done") {
        sawDone = true;
        if (!evt.ok) fails.push(`/api/classify-batch -> done with ok=false`);
      }
    }
  }
  if (!sawDone) fails.push(`/api/classify-batch -> stream ended without done`);
  else console.log(`  /api/classify-batch -> ok (stream terminated)`);
}

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
  try {
    await checkClassifyBatch();
  } catch (err) {
    fails.push(
      `/api/classify-batch -> ${err instanceof Error ? err.message : "fetch error"}`,
    );
  }
  if (fails.length > 0) {
    console.error(`[smoke] FAIL\n  ${fails.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`[smoke] OK (${routes.length} routes + classify-batch)`);
}

run();
