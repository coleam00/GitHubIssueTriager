import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "var(--color-surface)",
        panel: "var(--color-panel)",
        accent: "var(--color-accent)",
        accentMuted: "var(--color-muted)",
        border: "var(--color-border)",
        foreground: "var(--color-text)",
      },
    },
  },
  plugins: [],
};

export default config;
