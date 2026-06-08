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
        // Background scale
        background: {
          DEFAULT: "#080C10",
          secondary: "#11161C",
          panel: "#161B22",
          elevated: "#1C2128",
          hover: "#1F242B",
        },
        // Surface scale
        surface: {
          card: "#0D1117",
          input: "#161B22",
          tooltip: "#1C2128",
          modal: "#0D1117",
        },
        // Accent — single primary blue
        accent: {
          primary: "#2962FF",
          hover: "#1E53E5",
          muted: "rgba(41, 98, 255, 0.12)",
          success: "#22AB94",
          danger: "#F23645",
          warning: "#EF9A09",
        },
        // Border scale
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          subtle: "rgba(255, 255, 255, 0.04)",
          focus: "rgba(41, 98, 255, 0.40)",
          divider: "rgba(255, 255, 255, 0.05)",
        },
        // Text scale
        text: {
          primary: "#E6EDF3",
          secondary: "#8B949E",
          muted: "#484F58",
          inverse: "#0D1117",
        },
        // Legacy brand colours — kept for component compatibility
        brand: {
          void: "#080C10",
          surface: "#0D1117",
          magenta: "#D16BA5",
          cyan: "#43D9BD",
          emerald: "#22AB94",
          amber: "#EF9A09",
          crimson: "#F23645",
          muted: "#8B949E",
        },
      },
      boxShadow: {
        none: "none",
        sm: "0 1px 2px rgba(0, 0, 0, 0.30)",
        md: "0 2px 6px rgba(0, 0, 0, 0.35)",
        lg: "0 4px 12px rgba(0, 0, 0, 0.40)",
        xl: "0 8px 24px rgba(0, 0, 0, 0.50)",
        panel: "0 1px 3px rgba(0, 0, 0, 0.30), 0 4px 16px rgba(0, 0, 0, 0.35)",
        elevated: "0 2px 8px rgba(0, 0, 0, 0.40), 0 8px 32px rgba(0, 0, 0, 0.45)",
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
