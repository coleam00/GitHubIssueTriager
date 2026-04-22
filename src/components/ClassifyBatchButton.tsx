"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Counts = { classified: number; skipped: number };

export default function ClassifyBatchButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setMsg(null);
    setCounts({ classified: 0, skipped: 0 });

    try {
      const res = await fetch("/api/classify-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ where: "unclassified" }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let live: Counts = { classified: 0, skipped: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line) as {
              type: string;
              ok?: boolean;
              message?: string;
            };
            if (evt.type === "classified") {
              live = { ...live, classified: live.classified + 1 };
              setCounts(live);
            } else if (evt.type === "skipped") {
              live = { ...live, skipped: live.skipped + 1 };
              setCounts(live);
            } else if (evt.type === "done") {
              setMsg(
                evt.ok
                  ? `classified ${live.classified} · skipped ${live.skipped}`
                  : evt.message ?? "batch failed",
              );
            }
          } catch {
            // ignore malformed lines; server always emits JSON per line
          }
        }
      }

      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  };

  const label = loading
    ? counts
      ? `Classifying… ${counts.classified}/${counts.classified + counts.skipped}`
      : "Classifying…"
    : "Classify all pending";

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-accentMuted">{msg}</span>}
      <button
        onClick={run}
        disabled={loading}
        className="btn btn-primary"
        data-testid="classify-batch-btn"
      >
        {label}
      </button>
    </div>
  );
}
