import type { BandConfig } from '../scoring/BandScorer';

export interface WeightDefinition {
  metric: string;
  weight: number;
  config?: BandConfig;
}

export const GROWTH_WEIGHTS: WeightDefinition[] = [
  {
    metric: 'revenueGrowth',
    weight: 3,
    config: {
      bands: [
        { threshold: 0.20, score: 95 },
        { threshold: 0.15, score: 85 },
        { threshold: 0.10, score: 75 },
        { threshold: 0.05, score: 60 },
        { threshold: 0.00, score: 40 },
        { threshold: -0.05, score: 25 },
      ],
      belowMin: 10,
      nullScore: 50,
    },
  },
  {
    metric: 'epsGrowth',
    weight: 3,
    config: {
      bands: [
        { threshold: 0.25, score: 95 },
        { threshold: 0.15, score: 80 },
        { threshold: 0.10, score: 70 },
        { threshold: 0.05, score: 55 },
        { threshold: 0.00, score: 40 },
        { threshold: -0.10, score: 25 },
      ],
      belowMin: 10,
      nullScore: 50,
    },
  },
  {
    metric: 'fcfGrowth',
    weight: 2,
    config: {
      bands: [
        { threshold: 0.20, score: 95 },
        { threshold: 0.10, score: 80 },
        { threshold: 0.05, score: 65 },
        { threshold: 0.00, score: 45 },
        { threshold: -0.10, score: 25 },
      ],
      belowMin: 10,
      nullScore: 50,
    },
  },
  {
    metric: 'profitGrowth',
    weight: 2,
    config: {
      bands: [
        { threshold: 0.25, score: 95 },
        { threshold: 0.15, score: 85 },
        { threshold: 0.10, score: 70 },
        { threshold: 0.05, score: 55 },
        { threshold: 0.00, score: 40 },
        { threshold: -0.10, score: 25 },
      ],
      belowMin: 10,
      nullScore: 50,
    },
  },
];

export const GROWTH_FACTOR_ADJUST = 0.3;
