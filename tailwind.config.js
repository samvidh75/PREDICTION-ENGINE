/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Satoshi", "Geist", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial"],
      },
      boxShadow: {
        orb: "0 0 60px rgba(0,255,210,0.10)",
      },
      screens: {
        xs: "420px",
      },
    },
  },
  plugins: [],
};
