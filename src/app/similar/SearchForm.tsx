"use client";

import { useState } from "react";

const MAX_CHARS = 8000;

type Match = {
  github_number: number;
  title: string;
  url: string;
  category: string | null;
  priority: string | null;
  complexity: string | null;
  distance: number;
};

type SearchResponse =
  | { ok: true; model: string; matches: Match[] }
  | { ok: false; message: string };

export default function SearchForm() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setMatches(null);
    setModel(null);
    try {
      const res = await fetch("/api/similar/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as SearchResponse;
      if (!data.ok) {
        setError(data.message);
      } else {
        setMatches(data.matches);
        setModel(data.model);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "search failed");
    } finally {
      setLoading(false);
    }
  };

  const charCount = text.length;
  const overLimit = charCount > MAX_CHARS;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="panel space-y-3" data-testid="similar-search-form">
        <label className="block text-sm font-medium" htmlFor="similar-text">
          Paste a support ticket, crash log, or description
        </label>
        <textarea
          id="similar-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="e.g. App crashes on login when 2FA token is empty…"
          className="w-full rounded border border-border bg-background p-3 font-mono text-sm"
          data-testid="similar-textarea"
        />
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs ${overLimit ? "text-red-500" : "text-accentMuted"}`}>
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
            {overLimit ? " — will be truncated" : ""}
          </span>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="btn btn-primary"
            data-testid="similar-submit"
          >
            {loading ? "Searching…" : "Find similar issues"}
          </button>
        </div>
      </form>

      {error && (
        <div className="panel text-sm text-red-500" data-testid="similar-error">
          {error}
        </div>
      )}

      {matches && (
        <div className="panel" data-testid="similar-results">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Top {matches.length} matches</h2>
            {model && <span className="text-xs text-accentMuted">model: {model}</span>}
          </div>
          {matches.length === 0 ? (
            <p className="text-accentMuted text-sm">
              No issues indexed yet. Run sync + classify to populate embeddings.
            </p>
          ) : (
            <ul className="space-y-3">
              {matches.map((m) => (
                <li
                  key={m.github_number}
                  className="border border-border rounded p-3 flex items-center gap-3"
                  data-testid="similar-card"
                >
                  <span className="text-accentMuted text-sm w-14">#{m.github_number}</span>
                  <a
                    href={`/issues/${m.github_number}`}
                    className="flex-1 no-underline text-foreground hover:text-accent"
                  >
                    {m.title}
                  </a>
                  {m.category && <span className={`chip chip-${m.category}`}>{m.category}</span>}
                  {m.priority && <span className={`chip chip-${m.priority}`}>{m.priority}</span>}
                  {m.complexity && <span className="chip">{m.complexity}</span>}
                  <span
                    className="text-xs text-accentMuted w-20 text-right tabular-nums"
                    title="cosine distance (lower = closer)"
                  >
                    {m.distance.toFixed(4)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
