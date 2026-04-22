"use client";

import Link from "next/link";
import { useState } from "react";

const MAX_CHARS = 8000;

type Match = {
  github_number: number;
  title: string;
  category: string | null;
  priority: string | null;
  complexity: string | null;
  distance: number;
};

type SearchResponse = {
  ok: boolean;
  model?: string;
  matches?: Match[];
  message?: string;
};

export default function SimilarSearch() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = text.trim().length > 0 && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setMatches(null);
    setModel(null);
    try {
      const res = await fetch("/api/similar/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, MAX_CHARS) }),
      });
      const data = (await res.json()) as SearchResponse;
      if (!res.ok || !data.ok) {
        setError(data.message ?? `request failed (${res.status})`);
        return;
      }
      setMatches(data.matches ?? []);
      setModel(data.model ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="panel space-y-3" data-testid="similar-form">
        <label htmlFor="similar-text" className="block text-xs uppercase tracking-wider text-accentMuted">
          Paste a support ticket or crash snippet
        </label>
        <textarea
          id="similar-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_CHARS}
          rows={8}
          placeholder="Describe the problem or paste a stack trace..."
          className="w-full rounded border border-border bg-panel p-3 text-sm font-mono"
          data-testid="similar-textarea"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-accentMuted">
            {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btn-primary"
            data-testid="similar-submit"
          >
            {loading ? "Searching..." : "Find similar issues"}
          </button>
        </div>
      </form>

      {error && (
        <div className="panel text-sm" data-testid="similar-error">
          <span className="chip chip-bug">error</span> <span className="ml-2">{error}</span>
        </div>
      )}

      {matches && (
        <div className="space-y-3" data-testid="similar-results">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {matches.length === 0 ? "No matches" : `Top ${matches.length} match${matches.length === 1 ? "" : "es"}`}
            </h2>
            {model && <span className="text-xs text-accentMuted">model: {model}</span>}
          </div>
          {matches.length === 0 ? (
            <div className="panel text-sm text-accentMuted">
              No embedded issues yet, or nothing close enough. Run sync + classify from the dashboard to seed data.
            </div>
          ) : (
            <ul className="space-y-3">
              {matches.map((m) => (
                <li key={m.github_number} className="panel" data-testid="similar-card">
                  <div className="flex items-start gap-3">
                    <span className="text-accentMuted text-sm w-14 shrink-0">#{m.github_number}</span>
                    <Link
                      href={`/issues/${m.github_number}`}
                      className="flex-1 no-underline text-foreground hover:text-accent font-medium"
                    >
                      {m.title}
                    </Link>
                    <span className="text-xs text-accentMuted tabular-nums shrink-0">
                      dist {m.distance.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 pl-14">
                    {m.category && <span className={`chip chip-${m.category}`}>{m.category}</span>}
                    {m.priority && <span className={`chip chip-${m.priority}`}>{m.priority}</span>}
                    {m.complexity && <span className="chip">{m.complexity}</span>}
                    {!m.category && !m.priority && !m.complexity && (
                      <span className="text-xs text-accentMuted">not classified</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
