export interface PortfolioOptimizationInput {
  symbol: string;
  expectedReturn: number;
  volatility: number;
  currentWeight?: number;
  sector?: string;
}

export interface PortfolioOptimizationResult {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  expectedReturn: number;
  volatility: number;
  score: number;
  sector: string | null;
}

export interface PortfolioOptimizationResponse {
  objective: 'max_sharpe_proxy';
  expectedPortfolioReturn: number;
  expectedPortfolioVolatility: number;
  concentrationScore: number;
  rebalanceIntensity: 'low' | 'medium' | 'high';
  allocations: PortfolioOptimizationResult[];
  diagnostics: string[];
}

export interface PortfolioStressScenario {
  name: string;
  marketShockPct: number;
  sectorShocks?: Record<string, number>;
}

export interface PortfolioStressHoldingResult {
  symbol: string;
  baseWeight: number;
  shockedReturnPct: number;
  contributionPct: number;
}

export interface PortfolioStressResponse {
  scenario: PortfolioStressScenario;
  expectedPortfolioMovePct: number;
  largestDetractor: string | null;
  holdings: PortfolioStressHoldingResult[];
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeWeight(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function normalizeExpectedReturn(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function normalizeVolatility(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function sanitizeHoldings(inputs: PortfolioOptimizationInput[]): {
  holdings: Required<Pick<PortfolioOptimizationInput, 'symbol' | 'expectedReturn' | 'volatility' | 'currentWeight'>> & { sector: string | null }[];
  diagnostics: string[];
} {
  const diagnostics: string[] = [];
  const valid = inputs.flatMap((input) => {
    const symbol = typeof input.symbol === 'string' ? input.symbol.trim().toUpperCase() : '';
    const expectedReturn = normalizeExpectedReturn(input.expectedReturn);
    const volatility = normalizeVolatility(input.volatility);
    const currentWeight = normalizeWeight(input.currentWeight ?? 0);
    const sector = typeof input.sector === 'string' && input.sector.trim() ? input.sector.trim() : null;

    if (!symbol || expectedReturn === null || volatility === null || currentWeight === null) {
      diagnostics.push(`Excluded invalid holding input for symbol '${symbol || 'unknown'}'.`);
      return [];
    }

    return [{ symbol, expectedReturn, volatility, currentWeight, sector }];
  });

  const totalWeight = valid.reduce((sum, holding) => sum + holding.currentWeight, 0);
  const normalized = valid.map((holding) => ({
    ...holding,
    currentWeight: totalWeight > 0 ? holding.currentWeight / totalWeight : 1 / Math.max(valid.length, 1),
  }));

  return { holdings: normalized, diagnostics };
}

export function optimizePortfolio(inputs: PortfolioOptimizationInput[]): PortfolioOptimizationResponse {
  const { holdings, diagnostics } = sanitizeHoldings(inputs);
  if (holdings.length === 0) {
    return {
      objective: 'max_sharpe_proxy',
      expectedPortfolioReturn: 0,
      expectedPortfolioVolatility: 0,
      concentrationScore: 0,
      rebalanceIntensity: 'low',
      allocations: [],
      diagnostics: [...diagnostics, 'No valid holdings supplied for optimization.'],
    };
  }

  const scored = holdings.map((holding) => ({
    ...holding,
    score: holding.expectedReturn / holding.volatility,
  }));

  const positiveScoreSum = scored.reduce((sum, holding) => sum + Math.max(holding.score, 0.01), 0);
  const rawTargets = scored.map((holding) => ({
    ...holding,
    targetWeight: Math.max(holding.score, 0.01) / positiveScoreSum,
  }));

  const capped = rawTargets.map((holding) => ({
    ...holding,
    targetWeight: Math.min(holding.targetWeight, 0.35),
  }));
  const cappedTotal = capped.reduce((sum, holding) => sum + holding.targetWeight, 0);
  const allocations = capped
    .map((holding) => ({
      symbol: holding.symbol,
      currentWeight: round(holding.currentWeight, 4),
      targetWeight: round(holding.targetWeight / cappedTotal, 4),
      expectedReturn: round(holding.expectedReturn, 4),
      volatility: round(holding.volatility, 4),
      score: round(holding.score, 4),
      sector: holding.sector,
    }))
    .sort((a, b) => b.targetWeight - a.targetWeight);

  const expectedPortfolioReturn = round(
    allocations.reduce((sum, holding) => sum + holding.targetWeight * holding.expectedReturn, 0),
    4,
  );
  const expectedPortfolioVolatility = round(
    Math.sqrt(allocations.reduce((sum, holding) => sum + (holding.targetWeight ** 2) * (holding.volatility ** 2), 0)),
    4,
  );

  const topThreeWeight = allocations.slice(0, 3).reduce((sum, holding) => sum + holding.targetWeight, 0);
  const concentrationScore = round(topThreeWeight * 100, 2);
  const turnover = allocations.reduce((sum, holding) => sum + Math.abs(holding.targetWeight - holding.currentWeight), 0) / 2;
  const rebalanceIntensity = turnover >= 0.2 ? 'high' : turnover >= 0.08 ? 'medium' : 'low';

  if (topThreeWeight > 0.65) {
    diagnostics.push('Top three positions exceed 65% of target weight; concentration should be reviewed.');
  }

  return {
    objective: 'max_sharpe_proxy',
    expectedPortfolioReturn,
    expectedPortfolioVolatility,
    concentrationScore,
    rebalanceIntensity,
    allocations,
    diagnostics,
  };
}

export function runPortfolioStressTest(
  inputs: PortfolioOptimizationInput[],
  scenario: PortfolioStressScenario,
): PortfolioStressResponse {
  const { holdings } = sanitizeHoldings(inputs);
  const results = holdings.map((holding) => {
    const sectorShock = holding.sector ? scenario.sectorShocks?.[holding.sector] ?? 0 : 0;
    const shockedReturnPct = scenario.marketShockPct + sectorShock - holding.volatility * 0.25;
    const contributionPct = holding.currentWeight * shockedReturnPct;
    return {
      symbol: holding.symbol,
      baseWeight: round(holding.currentWeight, 4),
      shockedReturnPct: round(shockedReturnPct, 2),
      contributionPct: round(contributionPct, 2),
    };
  });

  const sortedDetractors = [...results].sort((a, b) => a.contributionPct - b.contributionPct);
  return {
    scenario,
    expectedPortfolioMovePct: round(results.reduce((sum, holding) => sum + holding.contributionPct, 0), 2),
    largestDetractor: sortedDetractors[0]?.symbol ?? null,
    holdings: results.sort((a, b) => a.symbol.localeCompare(b.symbol)),
  };
}
