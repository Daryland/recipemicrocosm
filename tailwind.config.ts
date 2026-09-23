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
        paper: "#FAFAF8",
        ink: {
          DEFAULT: "#1B211D",
          muted: "#66706A",
          faint: "#9AA19C",
        },
        line: {
          DEFAULT: "#E4E6E1",
          strong: "#CDD1CB",
        },
        tomato: {
          50: "#FCEDE8",
          500: "#CF3A1F",
          600: "#B02F17",
        },
        basil: {
          600: "#3F6B3A",
        },
      },
      fontFamily: {
        sans: ["var(--font-schibsted)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
    },
  },
  plugins: [],
};

export default config;
