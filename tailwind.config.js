/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Satoshi", "Geist", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial"],
      },
      colors: {
        canvas: "#FAFAFA",
        surface: "#FFFFFF",
        "ink-primary": "#0A0A0A",
        "ink-secondary": "#525252",
        "telemetry-cyan": "#06B6D4",
        "telemetry-magenta": "#D946EF",
        "border-grid": "#E5E5E5",
        brand: {
          void: "#030303",
          surface: "#ffffff",
          magenta: "#ff007f",
          cyan: "#00f0ff",
          emerald: "#00ff66",
          amber: "#ffaa00",
          crimson: "#ff3333",
          muted: "#666666",
        },
      },
      boxShadow: {
        orb: "0 0 60px rgba(0,255,210,0.10)",
        lockCard: "0 4px 20px rgba(0,0,0,0.03)",
        "hologram-cyan": "0 0 20px rgba(0, 240, 255, 0.15)",
        "hologram-magenta": "0 0 20px rgba(255, 0, 127, 0.15)",
        "premium-card": "0 10px 30px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
      },
      backgroundImage: {
        "planetary-haze": "radial-gradient(circle at 50% -20%, rgba(0, 240, 255, 0.08), transparent 70%)",
        "magenta-glow": "radial-gradient(circle at 80% 20%, rgba(255, 0, 127, 0.05), transparent 50%)",
      },
      screens: {
        xs: "420px",
      },
    },
  },
  plugins: [],
};
