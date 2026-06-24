/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Noto Sans", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "ui-monospace", "monospace"],
      },
      colors: {
        green: { DEFAULT: '#1a7f4b', light: '#22c55e', bg: '#ebf7f1', dark: '#0d5c34' },
        ink: { DEFAULT: '#0a0a0a', 2: '#2d2d2d', 3: '#555', 4: '#888', 5: '#bbb' },
        line: { DEFAULT: '#e8e8e8', light: '#f2f2f2' },
        ivory: { bg: '#f7f7f5', soft: '#f0f0ec', surface: '#FFFFFF' },
        positive: { DEFAULT: '#12823B', soft: '#EAF7EF' },
        negative: { DEFAULT: '#B42318', soft: '#FFF1F0' },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 30px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
};
