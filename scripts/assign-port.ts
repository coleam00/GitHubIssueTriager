import { createHash } from "node:crypto";
import { basename } from "node:path";

const BASE_PORT = 4000;
const WORKTREE_BASE = 4100;
const WORKTREE_RANGE = 100;

export function assignPort(): number {
  const explicit = process.env.PORT;
  if (explicit) return Number(explicit);

  const cwd = process.cwd();
  const leaf = basename(cwd);

  if (leaf === "GitHubIssueTriager") return BASE_PORT;

  const digest = createHash("md5").update(cwd).digest();
  const offset = digest.readUInt32BE(0) % WORKTREE_RANGE;
  return WORKTREE_BASE + offset;
}

const invokedAsScript = process.argv[1]?.toLowerCase().endsWith("assign-port.ts");
if (invokedAsScript) {
  process.stdout.write(String(assignPort()) + "\n");
}
