export const stockStoryTypography = {
  fontFamily: {
    primary: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  size: {
    xs: "0.75rem",
    sm: "0.8125rem",
    base: "0.875rem",
    lg: "1rem",
    xl: "1.125rem",
    "2xl": "1.25rem",
    "3xl": "1.5rem",
    "4xl": "1.875rem",
    "5xl": "2.25rem",
    "6xl": "3rem",
  },
  lineHeight: {
    tight: "1.15",
    normal: "1.5",
    relaxed: "1.625",
    loose: "1.75",
  },
  letterSpacing: {
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    label: "0.08em",
  },
} as const;

export type StockStoryTypography = typeof stockStoryTypography;
