export const radii = {
  small: "14px",
  medium: "22px",
  large: "28px",
  orbital: "999px",
} as const;

export type RadiusKey = keyof typeof radii;
