/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        background: {
          DEFAULT: "#f5f4f1",
          secondary: "#eeedea",
          panel: "#ffffff",
          elevated: "#ffffff",
          hover: "#efeeeb",
        },
        surface: {
          card: "#ffffff",
          input: "#ffffff",
          tooltip: "#1a1d23",
          modal: "#ffffff",
        },
        accent: {
          primary: "#1a4a3a",
          hover: "#15573f",
          muted: "rgba(26, 74, 58, 0.08)",
          subtle: "#e8f0ec",
          success: "#1a6e4a",
          danger: "#c0392b",
          warning: "#b8860b",
          info: "#2c6b9e",
        },
        border: {
          DEFAULT: "rgba(0, 0, 0, 0.06)",
          subtle: "rgba(0, 0, 0, 0.03)",
          focus: "rgba(26, 74, 58, 0.35)",
          divider: "rgba(0, 0, 0, 0.04)",
        },
        text: {
          primary: "#0f1419",
          secondary: "#536471",
          muted: "#8b98a5",
          inverse: "#ffffff",
        },
        market: {
          positive: "#16a34a",
          negative: "#dc2626",
          neutral: "#6b7280",
          positiveBg: "rgba(22, 163, 74, 0.08)",
          negativeBg: "rgba(220, 38, 38, 0.08)",
          positiveMuted: "#15803d",
          negativeMuted: "#b91c1c",
        },
      },
      boxShadow: {
        none: "none",
        sm: "0 1px 2px rgba(0, 0, 0, 0.03)",
        md: "0 2px 4px rgba(0, 0, 0, 0.04)",
        lg: "0 4px 12px rgba(0, 0, 0, 0.05)",
        xl: "0 8px 24px rgba(0, 0, 0, 0.06)",
        panel: "0 1px 2px rgba(0, 0, 0, 0.03)",
        elevated: "0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.03)",
        focus: "0 0 0 3px rgba(26, 74, 58, 0.15)",
        card: "0 1px 3px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      screens: {
        xs: "420px",
      },
    },
  },
  plugins: [],
};
