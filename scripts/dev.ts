import { spawn } from "node:child_process";
import { assignPort } from "./assign-port";

const port = assignPort();
const mode = process.argv[2] === "start" ? "start" : "dev";

console.log(`[${mode}] port=${port}`);

const child = spawn("next", [mode, "-p", String(port)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT: String(port) },
});

child.on("exit", (code) => process.exit(code ?? 0));
