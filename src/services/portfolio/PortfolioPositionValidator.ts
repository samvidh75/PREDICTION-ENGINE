export interface PortfolioPositionInput {
  symbol: string;
  weight: number;
}

export interface RejectedPortfolioPosition {
  symbol: string;
  reason: 'EMPTY_SYMBOL' | 'INVALID_WEIGHT';
}

export interface ValidatedPortfolioPositions {
  positions: PortfolioPositionInput[];
  rejected: RejectedPortfolioPosition[];
}

function finitePositiveWeight(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Validate, merge and normalize portfolio-intelligence positions.
 *
 * This is a server-side trust boundary. UI validation is not sufficient because
 * API callers can invoke portfolio intelligence directly. Invalid weights are
 * removed before any database query executes, duplicate symbols are merged and
 * the remaining positive weights are normalized to sum to one.
 */
export function validatePortfolioPositions(inputs: unknown[]): ValidatedPortfolioPositions {
  const rejected: RejectedPortfolioPosition[] = [];
  const mergedWeights = new Map<string, number>();

  for (const input of inputs) {
    const candidate = input && typeof input === 'object'
      ? input as Partial<PortfolioPositionInput>
      : {};
    const symbol = typeof candidate.symbol === 'string' ? candidate.symbol.toUpperCase().trim() : '';
    if (!symbol) {
      rejected.push({ symbol: symbol || '(empty)', reason: 'EMPTY_SYMBOL' });
      continue;
    }

    const weight = finitePositiveWeight(candidate.weight);
    if (weight === null) {
      rejected.push({ symbol, reason: 'INVALID_WEIGHT' });
      continue;
    }

    mergedWeights.set(symbol, (mergedWeights.get(symbol) ?? 0) + weight);
  }

  const totalWeight = [...mergedWeights.values()].reduce((sum, weight) => sum + weight, 0);
  const positions = totalWeight > 0
    ? [...mergedWeights.entries()].map(([symbol, weight]) => ({ symbol, weight: weight / totalWeight }))
    : [];

  return { positions, rejected };
}
