export const glow = {
  ambientCyan: "0 0 120px rgba(0,255,210,0.03)",
  ambientDeepBlue: "0 0 120px rgba(0,120,255,0.03)",
  edgeCyan: "0 0 60px rgba(0,255,210,0.08)",
  edgeWarning: "0 0 60px rgba(217,140,122,0.10)",
  orbDiffusion: "0 0 120px rgba(0,255,210,0.04)",
} as const;

export type GlowKey = keyof typeof glow;
