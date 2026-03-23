import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        dm:   ["var(--font-dm)", "sans-serif"],
      },
      colors: {
        // Backgrounds
        base:        "var(--bg)",
        surface:     "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        // Borders
        line:        "var(--border)",
        "line-2":    "var(--border-2)",
        // Text (ink-* avoids conflicts with Tailwind text-* size classes)
        ink:         "var(--text)",
        "ink-2":     "var(--text-2)",
        "ink-3":     "var(--text-3)",
        "ink-4":     "var(--text-4)",
        // Accent
        hi: {
          DEFAULT: "var(--accent)",
          hover:   "var(--accent-hover)",
          fg:      "var(--accent-fg)",
          sub:     "var(--accent-subtle)",
          border:  "var(--accent-border)",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
