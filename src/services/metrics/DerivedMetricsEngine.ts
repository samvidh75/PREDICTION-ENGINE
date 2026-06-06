export interface StatementInput {
  symbol: string;
  periodEnd: string;
  periodType: 'quarterly' | 'annual' | 'ttm';
  revenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  interestExpense?: number | null;
  netIncome?: number | null;
  eps?: number | null;
  totalAssets?: number | null;
  currentAssets?: number | null;
  currentLiabilities?: number | null;
  totalLiabilities?: number | null;
  totalEquity?: number | null;
  operatingCashFlow?: number | null;
  capitalExpenditure?: number | null;
  freeCashFlow?: number | null;
}

export interface DerivedMetricsSnapshot {
  symbol: string;
  periodEnd: string;
  periodType: 'quarterly' | 'annual' | 'ttm';
  epsGrowth: number | null;
  fcfGrowth: number | null;
  currentRatio: number | null;
  grossMargin: number | null;
  assetTurnover: number | null;
  interestCoverage: number | null;
  fcfMargin: number | null;
  workingCapitalRatio: number | null;
  validationErrors: string[];
}

export class DerivedMetricsEngine {
  compute(current: StatementInput, previous?: StatementInput): DerivedMetricsSnapshot {
    const validationErrors = this.validate(current, previous);

    const epsGrowth = this.safeGrowth(current.eps, previous?.eps);
    const fcfGrowth = this.safeGrowth(this.resolveFcf(current), this.resolveFcf(previous));
    const currentRatio = this.safeDivide(current.currentAssets, current.currentLiabilities);
    const grossMargin = this.safeDivide(current.grossProfit, current.revenue);
    const assetTurnover = this.safeDivide(current.revenue, current.totalAssets);
    const interestCoverage = this.safeDivide(current.operatingIncome, current.interestExpense);
    const fcfMargin = this.safeDivide(this.resolveFcf(current), current.revenue);
    const workingCapitalRatio = current.currentAssets != null && current.currentLiabilities != null
      ? this.safeDivide(current.currentAssets - current.currentLiabilities, current.currentLiabilities)
      : null;

    return {
      symbol: current.symbol,
      periodEnd: current.periodEnd,
      periodType: current.periodType,
      epsGrowth,
      fcfGrowth,
      currentRatio,
      grossMargin,
      assetTurnover,
      interestCoverage,
      fcfMargin,
      workingCapitalRatio,
      validationErrors,
    };
  }

  private validate(current: StatementInput, previous?: StatementInput): string[] {
    const errors: string[] = [];
    const values = Object.entries(current).filter(([, value]) => typeof value === 'number') as Array<[string, number]>;
    for (const [field, value] of values) {
      if (!Number.isFinite(value)) errors.push(`${field}: non-finite value`);
    }
    if (current.totalAssets != null && current.totalLiabilities != null && current.totalEquity != null) {
      const delta = Math.abs(current.totalAssets - (current.totalLiabilities + current.totalEquity));
      const tolerance = Math.max(1, Math.abs(current.totalAssets) * 0.02);
      if (delta > tolerance) errors.push('balanceSheet: assets != liabilities + equity');
    }
    if (previous && current.symbol !== previous.symbol) errors.push('history: previous statement symbol mismatch');
    return errors;
  }

  private resolveFcf(statement?: StatementInput): number | null {
    if (!statement) return null;
    if (statement.freeCashFlow != null) return statement.freeCashFlow;
    if (statement.operatingCashFlow != null && statement.capitalExpenditure != null) {
      return statement.operatingCashFlow - Math.abs(statement.capitalExpenditure);
    }
    return null;
  }

  private safeGrowth(current?: number | null, previous?: number | null): number | null {
    if (current == null || previous == null || previous === 0) return null;
    const value = (current - previous) / Math.abs(previous);
    return Number.isFinite(value) ? value : null;
  }

  private safeDivide(numerator?: number | null, denominator?: number | null): number | null {
    if (numerator == null || denominator == null || denominator === 0) return null;
    const value = numerator / denominator;
    return Number.isFinite(value) ? value : null;
  }
}

export default DerivedMetricsEngine;
