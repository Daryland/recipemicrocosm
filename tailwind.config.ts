import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FFF8EE",
          dark: "#FBEEDB",
        },
        charcoal: {
          DEFAULT: "#2A2018",
          light: "#5B4B3C",
        },
        ember: {
          50: "#FDEEE9",
          100: "#FAD9CC",
          300: "#F0916A",
          500: "#E4572E",
          600: "#C7441F",
          700: "#A3361A",
        },
        gold: {
          200: "#FBE3A3",
          400: "#F4B942",
          500: "#F0A500",
        },
        basil: {
          500: "#5B7B4B",
          600: "#496238",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(42, 32, 24, 0.08)",
        "card-hover": "0 8px 24px rgba(42, 32, 24, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
