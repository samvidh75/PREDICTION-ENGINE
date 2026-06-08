/**
 * Unified shadow tokens — merged from design/, design-system/.
 */
export const shadows = {
  // Canvas layering
  layer1: "0 0 40px rgba(0, 0, 0, 0.45)",
  layer2: "0 20px 80px rgba(0, 0, 0, 0.32)",
  layer3: "0 0 120px rgba(0, 255, 210, 0.03)",

  // Accent glows
  blueGlow: "0 0 20px rgba(0, 200, 255, 0.35)",
  cyanGlow: "0 0 24px rgba(0, 255, 224, 0.25)",
  purpleGlow: "0 0 30px rgba(123, 97, 255, 0.25)",

  // Panel elevation
  panel: "0 18px 60px rgba(0, 0, 0, 0.35)",
  elevated: "0 24px 80px rgba(0, 0, 0, 0.46)",
} as const;

export type Shadows = typeof shadows;
