import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tokens read CSS custom properties (globals.css) so the whole palette
        // is themeable and opacity modifiers (bg-brand/10) still work.
        brand: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          dark: "rgb(var(--c-brand-dark) / <alpha-value>)",
          light: "rgb(var(--c-brand-light) / <alpha-value>)",
        },
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        sky: "rgb(var(--c-sky) / <alpha-value>)",
        gold: "rgb(var(--c-gold) / <alpha-value>)",
        heart: "rgb(var(--c-heart) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        // Japanese "dojo" accents.
        sumi: "rgb(var(--c-sumi) / <alpha-value>)",
        washi: "rgb(var(--c-washi) / <alpha-value>)",
        torii: "rgb(var(--c-torii) / <alpha-value>)",
        wood: "rgb(var(--c-wood) / <alpha-value>)",
      },
      fontFamily: {
        jp: ["var(--font-noto-jp)", "ui-rounded", "Nunito", "sans-serif"],
      },
      boxShadow: {
        node: "0 4px 0 rgba(0,0,0,0.15)",
        card: "0 2px 0 rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
