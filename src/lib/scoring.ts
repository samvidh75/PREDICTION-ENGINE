export interface ScoreInputs {
  roe: number | null;
  pe: number | null;
  industryPe: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  debtToEquity: number | null;
  interestCoverage: number | null;
  rsi: number | null;
  macdSignal: number | null;
  above50Dma: boolean | null;
  volatility: number | null;
}

export interface FactorScoreSet {
  quality: number | null;
  valuation: number | null;
  growth: number | null;
  risk: number | null;
  momentum: number | null;
  health: number | null;
  riskAdjusted: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

export function fromROE(roe: number | null): number | null {
  if (roe == null || !Number.isFinite(roe)) return null;
  if (roe >= 25) return 90;
  if (roe >= 20) return 80;
  if (roe >= 15) return 65;
  if (roe >= 10) return 40;
  if (roe >= 5) return 28;
  return 18;
}

export function fromPE(pe: number | null, industryPe: number | null): number | null {
  if (pe == null || industryPe == null || pe <= 0 || industryPe <= 0) return null;
  const ratio = pe / industryPe;
  if (ratio <= 0.55) return 92;
  if (ratio <= 0.75) return 80;
  if (ratio <= 0.95) return 68;
  if (ratio <= 1.15) return 56;
  if (ratio <= 1.35) return 44;
  return 28;
}

export function fromGrowth(revenueGrowth: number | null, profitGrowth: number | null): number | null {
  const values = [revenueGrowth, profitGrowth].filter((value): value is number => value != null && Number.isFinite(value));
  if (values.length === 0) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average >= 25) return 90;
  if (average >= 18) return 78;
  if (average >= 10) return 64;
  if (average >= 4) return 52;
  if (average >= 0) return 40;
  return 24;
}

export function fromLeverage(debtToEquity: number | null, interestCoverage: number | null): number | null {
  const scores: number[] = [];
  if (debtToEquity != null && Number.isFinite(debtToEquity)) {
    if (debtToEquity <= 0.2) scores.push(90);
    else if (debtToEquity <= 0.5) scores.push(80);
    else if (debtToEquity <= 1) scores.push(66);
    else if (debtToEquity <= 2) scores.push(48);
    else scores.push(26);
  }
  if (interestCoverage != null && Number.isFinite(interestCoverage)) {
    if (interestCoverage >= 8) scores.push(88);
    else if (interestCoverage >= 5) scores.push(74);
    else if (interestCoverage >= 3) scores.push(58);
    else if (interestCoverage >= 1.5) scores.push(42);
    else scores.push(20);
  }
  if (scores.length === 0) return null;
  return round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

export function fromTech(rsi: number | null, macdSignal: number | null, above50Dma: boolean | null): number | null {
  const scores: number[] = [];
  if (rsi != null && Number.isFinite(rsi)) {
    if (rsi >= 55 && rsi <= 68) scores.push(84);
    else if (rsi >= 45 && rsi < 55) scores.push(66);
    else if (rsi >= 35 && rsi < 45) scores.push(48);
    else scores.push(30);
  }
  if (macdSignal != null && Number.isFinite(macdSignal)) {
    if (macdSignal > 1) scores.push(80);
    else if (macdSignal > 0) scores.push(65);
    else if (macdSignal > -1) scores.push(45);
    else scores.push(28);
  }
  if (above50Dma != null) {
    scores.push(above50Dma ? 72 : 36);
  }
  if (scores.length === 0) return null;
  return round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

function weightedAverage(items: Array<[number | null, number]>): number | null {
  const active = items.filter((item): item is [number, number] => item[0] != null);
  if (active.length === 0) return null;
  const totalWeight = active.reduce((sum, [, weight]) => sum + weight, 0);
  const weighted = active.reduce((sum, [value, weight]) => sum + value * weight, 0);
  return round(weighted / totalWeight);
}

export function computeFactorScores(inputs: ScoreInputs): FactorScoreSet {
  const quality = fromROE(inputs.roe);
  const valuation = fromPE(inputs.pe, inputs.industryPe);
  const growth = fromGrowth(inputs.revenueGrowth, inputs.profitGrowth);
  const risk = fromLeverage(inputs.debtToEquity, inputs.interestCoverage);
  const momentum = fromTech(inputs.rsi, inputs.macdSignal, inputs.above50Dma);
  const health = weightedAverage([
    [quality, 0.3],
    [valuation, 0.25],
    [growth, 0.2],
    [risk, 0.15],
    [momentum, 0.1],
  ]);
  const volatilityPenalty =
    inputs.volatility == null || !Number.isFinite(inputs.volatility)
      ? null
      : clamp((inputs.volatility - 0.18) * 120, 0, 20);

  return {
    quality,
    valuation,
    growth,
    risk,
    momentum,
    health,
    riskAdjusted:
      health == null
        ? null
        : round(health - (volatilityPenalty ?? 0)),
  };
}

export function confidenceFromCoverage(values: Array<unknown>, agreement: number): number {
  const present = values.filter((value) => value != null).length;
  const coverage = values.length === 0 ? 0 : (present / values.length) * 100;
  return round(coverage * 0.7 + clamp(agreement, 0, 100) * 0.3);
}
