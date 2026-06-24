import { UnifiedPredictionOutput } from '../types';

export interface StabilityResult {
  averageScoreChange: number;
  maxScoreChange: number;
  scoreChangeStdDev: number;
  classificationFlipRate: number;
  topDecileTurnover: number;
  bottomDecileTurnover: number;
  overallStabilityScore: number;
  warnings: string[];
}

export class RankingStabilityValidator {
  validateStability(outputs: UnifiedPredictionOutput[]): StabilityResult {
    if (outputs.length < 2) {
      return {
        averageScoreChange: 0,
        maxScoreChange: 0,
        scoreChangeStdDev: 0,
        classificationFlipRate: 0,
        topDecileTurnover: 0,
        bottomDecileTurnover: 0,
        overallStabilityScore: 100,
        warnings: ['Fewer than 2 outputs provided; stability cannot be assessed.'],
      };
    }

    const scores = outputs.map(o => o.rankingScore).filter((s): s is number => s !== null);
    const scoreChanges: number[] = [];
    let classificationFlips = 0;

    for (let i = 1; i < outputs.length; i++) {
      const prev = outputs[i - 1].rankingScore;
      const curr = outputs[i].rankingScore;
      if (prev !== null && curr !== null) {
        scoreChanges.push(Math.abs(curr - prev));
      }
      if (outputs[i - 1].classification !== outputs[i].classification) {
        classificationFlips++;
      }
    }

    const averageScoreChange = scoreChanges.length > 0
      ? scoreChanges.reduce((s, c) => s + c, 0) / scoreChanges.length
      : 0;

    const maxScoreChange = scoreChanges.length > 0 ? Math.max(...scoreChanges) : 0;

    const variance = scoreChanges.length > 0
      ? scoreChanges.reduce((s, c) => s + (c - averageScoreChange) ** 2, 0) / scoreChanges.length
      : 0;
    const scoreChangeStdDev = Math.sqrt(variance);

    const totalComparisons = outputs.length - 1;
    const classificationFlipRate = totalComparisons > 0 ? classificationFlips / totalComparisons : 0;

    const sortedByScore = [...outputs]
      .filter(o => o.rankingScore !== null)
      .sort((a, b) => (b.rankingScore as number) - (a.rankingScore as number));

    const topDecileTurnover = this.calculateDecileTurnover(outputs, 0.1, true);
    const bottomDecileTurnover = this.calculateDecileTurnover(outputs, 0.1, false);

    const warnings: string[] = [];
    if (maxScoreChange > 30) {
      warnings.push(`Max score change of ${maxScoreChange.toFixed(1)} exceeds 30-point threshold.`);
    }
    if (classificationFlipRate > 0.3) {
      warnings.push(`Classification flip rate of ${(classificationFlipRate / 0.01).toFixed(1)}% suggests unstable classifications.`);
    }
    if (averageScoreChange > 15) {
      warnings.push(`Average score change of ${averageScoreChange.toFixed(1)} indicates high score volatility.`);
    }

    const stabilityComponents = [
      Math.max(0, 100 - averageScoreChange * 2),
      Math.max(0, 100 - maxScoreChange * 1.5),
      Math.max(0, 100 - classificationFlipRate / 0.01),
    ];
    const overallStabilityScore = Math.round(
      stabilityComponents.reduce((s, v) => s + v, 0) / stabilityComponents.length
    );

    return {
      averageScoreChange,
      maxScoreChange,
      scoreChangeStdDev,
      classificationFlipRate,
      topDecileTurnover,
      bottomDecileTurnover,
      overallStabilityScore,
      warnings,
    };
  }

  detectScoreCollapse(scores: number[]): boolean {
    if (scores.length < 5) return false;
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return stdDev < 3;
  }

  rankCorrelation(current: UnifiedPredictionOutput[], previous: UnifiedPredictionOutput[]): number {
    const currentMap = new Map(current.map(o => [o.symbol, o.rankingScore]));
    const previousMap = new Map(previous.map(o => [o.symbol, o.rankingScore]));

    const commonSymbols = [...currentMap.keys()].filter(s => previousMap.has(s));
    if (commonSymbols.length < 2) return 0;

    const currentRanks = commonSymbols
      .map(s => ({ symbol: s, score: currentMap.get(s) as number }))
      .filter(x => x.score !== null)
      .sort((a, b) => b.score - a.score)
      .map((x, i) => ({ ...x, rank: i + 1 }));

    const previousRanks = commonSymbols
      .map(s => ({ symbol: s, score: previousMap.get(s) as number }))
      .filter(x => x.score !== null)
      .sort((a, b) => b.score - a.score)
      .map((x, i) => ({ ...x, rank: i + 1 }));

    const currRankMap = new Map(currentRanks.map(x => [x.symbol, x.rank]));
    const prevRankMap = new Map(previousRanks.map(x => [x.symbol, x.rank]));

    const paired = commonSymbols
      .filter(s => currRankMap.has(s) && prevRankMap.has(s))
      .map(s => ({ currentRank: currRankMap.get(s) as number, previousRank: prevRankMap.get(s) as number }));

    if (paired.length < 2) return 0;

    const n = paired.length;
    const dSquared = paired.reduce((sum, p) => sum + (p.currentRank - p.previousRank) ** 2, 0);
    return 1 - (6 * dSquared) / (n * (n * n - 1));
  }

  private calculateDecileTurnover(
    outputs: UnifiedPredictionOutput[],
    fraction: number,
    top: boolean
  ): number {
    if (outputs.length < 2) return 0;

    const mid = Math.floor(outputs.length / 2);
    const firstHalf = outputs.slice(0, mid);
    const secondHalf = outputs.slice(mid);

    const topCount = Math.max(1, Math.floor(firstHalf.length * fraction));
    const cmp = (a: UnifiedPredictionOutput, b: UnifiedPredictionOutput) =>
      ((b.rankingScore ?? 0) - (a.rankingScore ?? 0));

    const firstDecile = [...firstHalf].sort(cmp).slice(0, topCount);
    const secondDecile = [...secondHalf].sort(cmp).slice(0, topCount);

    if (!top) {
      const revCmp = (a: UnifiedPredictionOutput, b: UnifiedPredictionOutput) =>
        ((a.rankingScore ?? 0) - (b.rankingScore ?? 0));
      firstDecile.length = 0;
      secondDecile.length = 0;
      firstDecile.push(...[...firstHalf].sort(revCmp).slice(0, topCount));
      secondDecile.push(...[...secondHalf].sort(revCmp).slice(0, topCount));
    }

    const firstSet = new Set(firstDecile.map(o => o.symbol));
    const overlap = secondDecile.filter(o => firstSet.has(o.symbol)).length;
    return 1 - (secondDecile.length > 0 ? overlap / secondDecile.length : 0);
  }
}
