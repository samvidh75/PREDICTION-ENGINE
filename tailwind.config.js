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
        ivory: {
          bg: "#FAF9F6",
          soft: "#F6F3EE",
          surface: "#FFFFFF",
          warm: "#FEFDFB",
        },
        ink: {
          DEFAULT: "#111111",
          2: "#343434",
          3: "#686868",
          4: "#9A9A9A",
        },
        border: {
          DEFAULT: "#E9E4DC",
          soft: "#F0ECE5",
        },
        positive: {
          DEFAULT: "#12823B",
          soft: "#EAF7EF",
        },
        negative: {
          DEFAULT: "#B42318",
          soft: "#FFF1F0",
        },
        caution: {
          DEFAULT: "#B7791F",
          soft: "#FFF8E6",
        },
        action: {
          DEFAULT: "#111111",
          hover: "#000000",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 30px rgba(16, 24, 40, 0.06)",
        floating: "0 20px 60px rgba(16, 24, 40, 0.10)",
      },
      borderRadius: {
        xs: "6px",
        sm: "10px",
        md: "14px",
        lg: "18px",
        xl: "24px",
      },
      screens: {
        xs: "420px",
      },
    },
  },
  plugins: [],
};
