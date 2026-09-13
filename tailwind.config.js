/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0b0d",
          900: "#111318",
          850: "#161923",
          800: "#1b1f2a",
          700: "#242938",
          600: "#333a4d",
        },
        accent: {
          DEFAULT: "#6ee7d8",
          dim: "#3fae9e",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
