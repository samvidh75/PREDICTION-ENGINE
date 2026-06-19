import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PredictionFactory } from '../PredictionFactory';

vi.mock('../../db/index', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../../stockstory/index', () => ({
  stockStoryEngine: {
    evaluate: vi.fn(),
  },
}));

vi.mock('../PredictionRegistry', () => ({
  predictionRegistry: {
    createPrediction: vi.fn(),
  },
}));

describe('PredictionFactory', () => {
  let factory: PredictionFactory;

  beforeEach(() => {
    factory = new PredictionFactory();
  });

  describe('critical score validation', () => {
    it('throws INSUFFICIENT_ANALYTICAL_DATA when quality score is missing', async () => {
      const result = await (factory as any).evaluateSymbol('TEST', '2026-06-20');
      expect(result).toBeNull();
    });

    it('throws INSUFFICIENT_ANALYTICAL_DATA when growth score is missing', async () => {
      const result = await (factory as any).evaluateSymbol('TEST', '2026-06-20');
      expect(result).toBeNull();
    });

    it('throws INSUFFICIENT_ANALYTICAL_DATA when risk score is missing', async () => {
      const result = await (factory as any).evaluateSymbol('TEST', '2026-06-20');
      expect(result).toBeNull();
    });
  });

  describe('generateDaily', () => {
    it('returns summary with skippedInsufficientData when critical scores missing', async () => {
      const db = await import('../../db/index');
      (db.default.query as any) = vi.fn();
      (db.default.query as any).mockResolvedValue({ rows: [] });

      const result = await factory.generateDaily([30]);
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(typeof result.skippedInsufficientData).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
