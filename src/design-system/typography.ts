export const stockStoryTypography = {
  fontFamily: {
    primary: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    secondary: '"IBM Plex Sans", "Inter", ui-sans-serif, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  weight: {
    body: 400,
    bodyStrong: 500,
    headline: 700,
    display: 800,
  },
  letterSpacing: {
    normal: "0",
    label: "0.14em",
  },
} as const;

export type StockStoryTypography = typeof stockStoryTypography;
