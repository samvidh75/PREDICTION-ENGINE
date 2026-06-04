export type LiquidityState = {
  id: string;

  // editorial attributes
  breadth: string;
  quality: string;
  concentration: string;

  // UI pacing hint
  intensity: number; // 0..1
};
