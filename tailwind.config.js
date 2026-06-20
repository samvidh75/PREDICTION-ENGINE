/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        graphite: {
          bg: "#070A0F",
          surface: "#0D1117",
          elevated: "#111827",
          secondary: "#161B22",
        },
        border: {
          DEFAULT: "rgba(148,163,184,0.16)",
          light: "rgba(148,163,184,0.08)",
        },
        text: {
          primary: "#E6EDF3",
          secondary: "#9AA7B5",
          muted: "#64748B",
        },
        action: {
          blue: "#2962FF",
          positive: "#16A34A",
          caution: "#F59E0B",
          negative: "#EF4444",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.12)",
        panel: "0 8px 24px rgba(0,0,0,0.18)",
        modal: "0 18px 48px rgba(0,0,0,0.24)",
        glow: "0 0 20px rgba(41,98,255,0.08)",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "24px",
      },
      screens: {
        xs: "420px",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "12px",
        lg: "20px",
      },
    },
  },
  plugins: [],
};
