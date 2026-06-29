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
        brand: {
          DEFAULT: "#58cc02",
          dark: "#46a302",
          light: "#89e219",
        },
        ink: "#3c3c3c",
        muted: "#777777",
        sky: "#1cb0f6",
        gold: "#ffc800",
        heart: "#ff4b4b",
        surface: "#ffffff",
        canvas: "#f7f7f7",
        // Japanese "dojo" accents.
        sumi: "#1f2530", // ink black-blue
        washi: "#f4ede0", // paper
        torii: "#c1352b", // vermilion gate red
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
