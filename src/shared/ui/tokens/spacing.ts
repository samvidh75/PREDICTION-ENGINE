/**
 * Unified spacing tokens — merged from design/, design-system/.
 */
export const spacing = {
  4: "4px",
  8: "8px",
  12: "12px",
  16: "16px",
  24: "24px",
  32: "32px",
  48: "48px",
  72: "72px",
  96: "96px",
} as const;

export type Spacing = typeof spacing;
