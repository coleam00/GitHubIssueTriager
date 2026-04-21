import OpenAI from "openai";
import { createHash } from "node:crypto";

const EMBED_DIMS = 1536;
const EMBED_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-5.4-nano";

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export type ClassifyInput = {
  title: string;
  body: string | null;
  labels: string[];
};

export type ClassifyResult = {
  category: "bug" | "feature" | "question" | "docs" | "chore";
  priority: "P0" | "P1" | "P2" | "P3";
  complexity: "small" | "medium" | "large";
  summary: string;
  reasoning: string;
  model: string;
};

export async function classify(input: ClassifyInput): Promise<ClassifyResult> {
  const client = getOpenAI();
  if (!client) return mockClassify(input);

  const sys = `You triage GitHub issues. Return JSON only with this exact shape:
{
  "category": "bug" | "feature" | "question" | "docs" | "chore",
  "priority": "P0" | "P1" | "P2" | "P3",
  "complexity": "small" | "medium" | "large",
  "summary": "one sentence",
  "reasoning": "one or two sentences explaining the calls"
}
P0 = broken/blocking many users. P1 = important, clear user impact. P2 = nice to have. P3 = trivial/polish.`;

  const user = `Title: ${input.title}
Labels: ${input.labels.join(", ") || "(none)"}
Body: ${(input.body || "").slice(0, 300)}`;

  const res = await client.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<ClassifyResult>;
  return {
    category: parsed.category ?? "chore",
    priority: parsed.priority ?? "P2",
    complexity: parsed.complexity ?? "medium",
    summary: parsed.summary ?? input.title,
    reasoning: parsed.reasoning ?? "",
    model: CHAT_MODEL,
  };
}

export async function embed(text: string): Promise<{ vector: number[]; model: string }> {
  const client = getOpenAI();
  if (!client) return { vector: mockEmbed(text), model: "mock-hash-v1" };
  const res = await client.embeddings.create({
    model: EMBED_MODEL,
    input: text.slice(0, 8000),
  });
  return { vector: res.data[0].embedding, model: EMBED_MODEL };
}

export async function generatePlan(input: ClassifyInput): Promise<{ content: string; model: string }> {
  const client = getOpenAI();
  if (!client) return { content: mockPlan(input), model: "mock-template-v1" };

  const sys = `You are an AI coding assistant that writes concise implementation plans for GitHub issues.
Return markdown only. Sections: ## Context, ## Approach, ## Files to touch, ## Validation, ## Risks.
Keep it under 300 words. Be concrete.`;

  const user = `Issue: ${input.title}
Labels: ${input.labels.join(", ") || "(none)"}
Body: ${(input.body || "").slice(0, 3000)}`;

  const res = await client.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  });
  return {
    content: res.choices[0]?.message?.content ?? mockPlan(input),
    model: CHAT_MODEL,
  };
}

function mockClassify(input: ClassifyInput): ClassifyResult {
  const t = `${input.title} ${(input.body || "").slice(0, 500)}`.toLowerCase();
  const labels = input.labels.map((l) => l.toLowerCase());

  let category: ClassifyResult["category"] = "chore";
  if (/\bbug\b|broken|error|fail|crash|\bnot work/i.test(t) || labels.includes("bug")) category = "bug";
  else if (/feature|request|add|support|allow/i.test(t) || labels.includes("enhancement")) category = "feature";
  else if (/\?|how do|question/i.test(t) || labels.includes("question")) category = "question";
  else if (/docs?|readme|documentation/i.test(t) || labels.includes("documentation")) category = "docs";

  let priority: ClassifyResult["priority"] = "P2";
  if (/blocker|critical|p0|crash|security/i.test(t)) priority = "P0";
  else if (category === "bug") priority = "P1";
  else if (category === "docs" || category === "chore") priority = "P3";

  const words = t.split(/\s+/).length;
  const complexity: ClassifyResult["complexity"] =
    words < 30 ? "small" : words < 120 ? "medium" : "large";

  return {
    category,
    priority,
    complexity,
    summary: input.title,
    reasoning: `Rule-based triage (no OPENAI_API_KEY). Matched category=${category}, priority=${priority} from keywords and labels.`,
    model: "mock-rule-based-v1",
  };
}

function mockEmbed(text: string): number[] {
  // Deterministic hash-based embedding. Not semantic, but stable so cosine is consistent within the POC.
  const out = new Array<number>(EMBED_DIMS).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const tok of tokens) {
    const h = createHash("sha256").update(tok).digest();
    for (let i = 0; i < EMBED_DIMS; i++) {
      const byte = h[i % h.length];
      out[i] += (byte / 255 - 0.5) * 2;
    }
  }
  // L2 normalize so cosine distance behaves reasonably
  const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0)) || 1;
  return out.map((v) => v / norm);
}

function mockPlan(input: ClassifyInput): string {
  return `## Context
${input.title}

${(input.body || "").slice(0, 500)}

## Approach
1. Reproduce the issue locally against the failing path.
2. Identify the root cause in the relevant module.
3. Apply a targeted fix with no scope creep.
4. Add a regression test covering the reported behavior.

## Files to touch
- Likely: source module referenced in the issue body
- New: corresponding test file

## Validation
- Unit tests pass
- Manual smoke test reproduces the original flow
- No regressions in adjacent functionality

## Risks
- Template plan generated without OPENAI_API_KEY. Review before implementing.
`;
}

export function vectorToSqlLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
