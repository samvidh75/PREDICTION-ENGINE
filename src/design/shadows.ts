export const shadows = {
  layer1: "0 0 40px rgba(0,0,0,0.45)",
  layer2: "0 20px 80px rgba(0,0,0,0.32)",
  layer3: "0 0 120px rgba(0,255,210,0.03)",
} as const;

export type ShadowKey = keyof typeof shadows;
