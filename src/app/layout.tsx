import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "GitHub Issue Triager",
  description: "AI-powered triage dashboard on Neon Postgres",
};

const themeScript = `
(function () {
  try {
    var theme = localStorage.getItem("theme");
    if (theme !== "light" && theme !== "dark") {
      theme = "dark";
    }
    document.documentElement.setAttribute("data-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header className="border-b border-border bg-panel">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="text-lg font-bold text-accent no-underline">
              GitHub Issue Triager
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="no-underline">
                Dashboard
              </Link>
              <Link href="/issues" className="no-underline">
                Issues
              </Link>
              <Link href="/similar" className="no-underline">
                Similar
              </Link>
              <ThemeToggle />
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
