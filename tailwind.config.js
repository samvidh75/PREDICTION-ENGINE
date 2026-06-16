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
          DEFAULT: "#f8f9fb",
          secondary: "#f1f3f6",
          panel: "#ffffff",
          elevated: "#ffffff",
          hover: "#f3f4f6",
        },
        surface: {
          card: "#ffffff",
          input: "#ffffff",
          tooltip: "#1e293b",
          modal: "#ffffff",
        },
        accent: {
          primary: "#1a5632",
          hover: "#147a3e",
          muted: "rgba(22, 101, 52, 0.08)",
          success: "#1a7d4e",
          danger: "#dc2626",
          warning: "#d97706",
        },
        border: {
          DEFAULT: "rgba(0, 0, 0, 0.06)",
          subtle: "rgba(0, 0, 0, 0.03)",
          focus: "rgba(22, 101, 52, 0.35)",
          divider: "rgba(0, 0, 0, 0.04)",
        },
        text: {
          primary: "#0f172a",
          secondary: "#475569",
          muted: "#94a3b8",
          inverse: "#ffffff",
        },
        brand: {
          void: "#0f172a",
          surface: "#ffffff",
          emerald: "#1a7d4e",
          amber: "#d97706",
          crimson: "#dc2626",
          muted: "#94a3b8",
        },
      },
      boxShadow: {
        none: "none",
        sm: "0 1px 2px rgba(0, 0, 0, 0.04)",
        md: "0 2px 4px rgba(0, 0, 0, 0.04)",
        lg: "0 4px 12px rgba(0, 0, 0, 0.05)",
        xl: "0 8px 24px rgba(0, 0, 0, 0.06)",
        panel: "0 1px 3px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04)",
        elevated: "0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      screens: {
        xs: "420px",
      },
    },
  },
  plugins: [],
};
