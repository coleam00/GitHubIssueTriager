"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Progress = { done: number; skipped: number; total: number | null };

export default function ClassifyAllButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setMsg(null);
    setProgress({ done: 0, skipped: 0, total: null });
    try {
      const res = await fetch("/api/classify-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ where: "unclassified", limit: 50 }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = 0;
      let skipped = 0;
      let total: number | null = null;
      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        let nl = buf.indexOf("\n");
        while (nl !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) {
            try {
              const evt = JSON.parse(line) as { type: string; total?: number };
              if (evt.type === "start" && typeof evt.total === "number") total = evt.total;
              else if (evt.type === "item") done += 1;
              else if (evt.type === "skip") skipped += 1;
              setProgress({ done, skipped, total });
            } catch {
              // ignore malformed line
            }
          }
          nl = buf.indexOf("\n");
        }
      }
      setMsg(
        total === 0
          ? "nothing to classify"
          : `classified ${done}${skipped ? `, skipped ${skipped}` : ""}`,
      );
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  };

  const label =
    loading && progress
      ? `Classifying ${progress.done}${progress.total ? ` / ${progress.total}` : ""}...`
      : loading
        ? "Classifying..."
        : "Classify all pending";

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-accentMuted">{msg}</span>}
      <button
        onClick={run}
        disabled={loading}
        className="btn"
        data-testid="classify-all-btn"
      >
        {label}
      </button>
    </div>
  );
}
