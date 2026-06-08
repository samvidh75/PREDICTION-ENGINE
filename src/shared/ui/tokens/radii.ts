/**
 * Unified border-radius tokens.
 */
export const radii = {
  control: "8px",
  small: "14px",
  medium: "22px",
  panel: "8px",
  modal: "8px",
  large: "28px",
  orbital: "999px",
  pill: "999px",
} as const;

export type Radii = typeof radii;
