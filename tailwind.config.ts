import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0b1020",
        panel: "#121832",
        accent: "#7cc6fe",
        accentMuted: "#3c6a99",
        border: "#1e2749",
      },
    },
  },
  plugins: [],
};

export default config;
