import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0f2a4a", soft: "#334e6e", mute: "#64748b" },
        brand: { 50: "#eef6ff", 100: "#d9ebff", 200: "#b6d8ff", 300: "#84bcff", 400: "#4f9bf7", 500: "#2b7de9", 600: "#1d63c9", 700: "#1a4fa1", 800: "#1b437f", 900: "#0f2a4a" },
        ok: { 50: "#ecfdf3", 500: "#16a34a", 700: "#15803d" },
        warn: { 50: "#fff7ed", 500: "#f97316", 700: "#c2410c" },
        bad: { 50: "#fef2f2", 500: "#dc2626", 700: "#b91c1c" },
        paper: "#f6f8fb",
      },
      fontFamily: {
        sans: ["var(--font-arabic)", "Tahoma", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: { card: "0 1px 2px rgba(15,42,74,.06), 0 4px 16px rgba(15,42,74,.06)" },
    },
  },
  plugins: [],
} satisfies Config;
