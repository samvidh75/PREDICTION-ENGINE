export type SectorState = {
  id: string;

  // editorial attributes
  momentum: string;
  institutional: string;
  liquidity: string;
  sentiment: string;
  volatility: string;

  // UI pacing hint
  intensity: number; // 0..1
};
