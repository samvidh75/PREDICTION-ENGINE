/**
 * Quarterly Result Normalizer
 *
 * Normalizes quarterly financial results and computes YoY/QoQ comparisons
 * when prior period data exists. Also calculates EBITDA margin, net profit
 * margin, and EPS if available.
 *
 * Does NOT generate beat/miss language without consensus data.
 */

export interface QuarterlyResult {
  symbol: string;
  companyName: string;
  period: string; // e.g., 'Q1FY24'
  fiscalYear: number;
  quarter: number; // 1-4
  filingDate: string;
  revenue: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  ebitda: number | null;
  netProfit: number | null;
  eps: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  // Prior period values for comparison
  priorYearRevenue: number | null;
  priorYearNetProfit: number | null;
  priorYearEps: number | null;
  priorQuarterRevenue: number | null;
  priorQuarterNetProfit: number | null;
  priorQuarterEps: number | null;
  priorYearEbitda: number | null;
  priorQuarterEbitda: number | null;
}

export interface NormalizedResult {
  symbol: string;
  companyName: string;
  period: string;
  fiscalYear: number;
  quarter: number;
  filingDate: string;
  // Absolute values
  revenue: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  ebitda: number | null;
  netProfit: number | null;
  eps: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  // Computed margins
  ebitdaMargin: number | null; // EBITDA / Revenue
  netProfitMargin: number | null; // Net Profit / Revenue
  // YoY comparisons (only if prior year data exists)
  revenueGrowthYoY: number | null;
  netProfitGrowthYoY: number | null;
  epsGrowthYoY: number | null;
  ebitdaGrowthYoY: number | null;
  // QoQ comparisons (only if prior quarter data exists)
  revenueGrowthQoQ: number | null;
  netProfitGrowthQoQ: number | null;
  epsGrowthQoQ: number | null;
  ebitdaGrowthQoQ: number | null;
}

export class QuarterlyResultNormalizer {
  /**
   * Normalize a quarterly result, computing margins and growth metrics.
   * Growth metrics are only computed when prior period exists.
   */
  normalize(result: QuarterlyResult): NormalizedResult {
    // Compute EBITDA margin
    const ebitdaMargin = this.computeMargin(result.ebitda, result.revenue);

    // Compute Net Profit margin
    const netProfitMargin = this.computeMargin(result.netProfit, result.revenue);

    // Compute YoY growth
    const revenueGrowthYoY = this.computeGrowth(result.revenue, result.priorYearRevenue);
    const netProfitGrowthYoY = this.computeGrowth(result.netProfit, result.priorYearNetProfit);
    const epsGrowthYoY = this.computeGrowth(result.eps, result.priorYearEps);
    const ebitdaGrowthYoY = this.computeGrowth(result.ebitda, result.priorYearEbitda);

    // Compute QoQ growth
    const revenueGrowthQoQ = this.computeGrowth(result.revenue, result.priorQuarterRevenue);
    const netProfitGrowthQoQ = this.computeGrowth(result.netProfit, result.priorQuarterNetProfit);
    const epsGrowthQoQ = this.computeGrowth(result.eps, result.priorQuarterEps);
    const ebitdaGrowthQoQ = this.computeGrowth(result.ebitda, result.priorQuarterEbitda);

    return {
      symbol: result.symbol,
      companyName: result.companyName,
      period: result.period,
      fiscalYear: result.fiscalYear,
      quarter: result.quarter,
      filingDate: result.filingDate,
      revenue: result.revenue,
      operatingExpenses: result.operatingExpenses,
      operatingIncome: result.operatingIncome,
      ebitda: result.ebitda,
      netProfit: result.netProfit,
      eps: result.eps,
      totalAssets: result.totalAssets,
      totalLiabilities: result.totalLiabilities,
      ebitdaMargin,
      netProfitMargin,
      revenueGrowthYoY,
      netProfitGrowthYoY,
      epsGrowthYoY,
      ebitdaGrowthYoY,
      revenueGrowthQoQ,
      netProfitGrowthQoQ,
      epsGrowthQoQ,
      ebitdaGrowthQoQ,
    };
  }

  /**
   * Compute a percentage margin. Returns null if denominator is null or zero.
   */
  private computeMargin(numerator: number | null, denominator: number | null): number | null {
    if (numerator === null || denominator === null || denominator === 0) return null;
    return parseFloat(((numerator / denominator) * 100).toFixed(2));
  }

  /**
   * Compute percentage growth. Returns null if prior period is null or zero.
   */
  private computeGrowth(current: number | null, prior: number | null): number | null {
    if (current === null || prior === null || prior === 0) return null;
    return parseFloat((((current - prior) / Math.abs(prior)) * 100).toFixed(2));
  }
}

export const quarterlyResultNormalizer = new QuarterlyResultNormalizer();