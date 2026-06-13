import { UnifiedPredictionInput, UnifiedPredictionOutput, UnifiedHorizon } from '../types';
import { UnifiedPredictionEngine } from '../UnifiedPredictionEngine';

export interface WalkForwardWindow {
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
}

export interface WalkForwardResult {
  window: WalkForwardWindow;
  symbolCount: number;
  predictionCount: number;
  hitRate: number;
  avgReturnByDecile: Array<{ decile: number; avgReturn: number | null; count: number }>;
  avgConfidenceByDecile: Array<{ decile: number; avgConfidence: number; count: number }>;
  classificationAccuracy: Record<string, number>;
  scoreStability: number;
  missingDataImpact: number;
}

export class WalkForwardValidator {
  constructor(
    private engine: UnifiedPredictionEngine,
    private windows: WalkForwardWindow[]
  ) {}

  async validate(predictionHistory: Array<{
    symbol: string;
    predictionDate: string;
    horizon: UnifiedHorizon;
    actualReturn: number | null;
    realizedVolatility?: number;
  }>): Promise<WalkForwardResult[]> {
    return this.windows.map(window => this.evaluateWindow(window, predictionHistory));
  }

  private evaluateWindow(
    window: WalkForwardWindow,
    history: Array<{
      symbol: string;
      predictionDate: string;
      horizon: UnifiedHorizon;
      actualReturn: number | null;
      realizedVolatility?: number;
    }>
  ): WalkForwardResult {
    const testRecords = history.filter(r =>
      r.predictionDate >= window.testStart && r.predictionDate <= window.testEnd
    );

    if (testRecords.length === 0) {
      return {
        window,
        symbolCount: 0,
        predictionCount: 0,
        hitRate: 0,
        avgReturnByDecile: [],
        avgConfidenceByDecile: [],
        classificationAccuracy: {},
        scoreStability: 0,
        missingDataImpact: 0,
      };
    }

    const uniqueSymbols = new Set(testRecords.map(r => r.symbol));
    const predictionCount = testRecords.length;
    const hits = testRecords.filter(r => r.actualReturn !== null && r.actualReturn > 0).length;
    const hitRate = predictionCount > 0 ? hits / predictionCount : 0;

    const withReturns = testRecords.filter(r => r.actualReturn !== null) as Array<
      typeof testRecords[0] & { actualReturn: number }
    >;

    const sorted = [...withReturns].sort((a, b) => b.actualReturn - a.actualReturn);
    const decileSize = Math.max(1, Math.floor(sorted.length / 10));
    const avgReturnByDecile: WalkForwardResult['avgReturnByDecile'] = [];
    for (let d = 0; d < 10; d++) {
      const slice = sorted.slice(d * decileSize, (d + 1) * decileSize);
      const avgReturn = slice.length > 0
        ? slice.reduce((s, r) => s + r.actualReturn, 0) / slice.length
        : null;
      avgReturnByDecile.push({ decile: d + 1, avgReturn, count: slice.length });
    }

    const missingDataCount = testRecords.filter(r => r.actualReturn === null).length;
    const missingDataImpact = predictionCount > 0 ? missingDataCount / predictionCount : 0;

    return {
      window,
      symbolCount: uniqueSymbols.size,
      predictionCount,
      hitRate,
      avgReturnByDecile,
      avgConfidenceByDecile: [],
      classificationAccuracy: {},
      scoreStability: 0,
      missingDataImpact,
    };
  }
}
