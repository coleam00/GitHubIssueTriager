import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GitHub Issue Triager",
  description: "AI-powered triage dashboard on Neon Postgres",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-border bg-panel">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold text-accent no-underline">
              GitHub Issue Triager
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/" className="no-underline">Dashboard</Link>
              <Link href="/issues" className="no-underline">Issues</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        <footer className="max-w-6xl mx-auto px-6 py-6 text-xs text-accentMuted">
          Built on Neon Postgres + pgvector. Sync from GitHub via gh CLI.
        </footer>
      </body>
    </html>
  );
}
