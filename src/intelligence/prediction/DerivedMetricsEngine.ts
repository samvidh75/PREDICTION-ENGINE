/**
 * DerivedMetricsEngine — TRACK-21 Phase 4 Tasks 11-12
 *
 * Computes 11 derived financial metrics from raw statement data.
 * Uses audited formulas from TRACK-20 design.
 *
 * Metrics computed:
 *   - EPS Growth
 *   - FCF Growth
 *   - Current Ratio
 *   - Gross Margin
 *   - FCF Margin
 *   - Asset Turnover
 *   - Interest Coverage
 *   - ROA (Return on Assets)
 *   - ROIC (Return on Invested Capital)
 *   - Debt to Equity
 *   - Operating Margin
 *
 * Validation layer (Task 12):
 *   - Rejects NaN
 *   - Rejects Infinity
 *   - Rejects divide-by-zero
 *   - Rejects negative denominator anomalies
 *   - Range-clamps outputs
 */

// ProviderCapabilityRegistry types are not currently needed —
// field resolution uses string-based dispatch in computeField().

export interface DerivedMetricsInput {
  // Balance Sheet
  totalAssets?: number | null;
  totalLiabilities?: number | null;
  totalEquity?: number | null;
  currentAssets?: number | null;
  currentLiabilities?: number | null;
  cashAndEquivalents?: number | null;
  inventory?: number | null;
  sharesOutstanding?: number | null;

  // Income Statement
  revenue?: number | null;
  costOfRevenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null;
  eps?: number | null;
  ebitda?: number | null;
  interestExpense?: number | null;
  incomeTaxExpense?: number | null;
  preTaxIncome?: number | null;

  // Cash Flow
  operatingCashFlow?: number | null;
  capitalExpenditure?: number | null;
  freeCashFlow?: number | null;

  // Market data
  marketCap?: number | null;

  // Historical (for growth rates)
  previousRevenue?: number | null;
  previousNetIncome?: number | null;
  previousEps?: number | null;
  previousFcf?: number | null;

  // TTM totals
  ttmRevenue?: number | null;
  ttmNetIncome?: number | null;
  ttmFcf?: number | null;
  ttmGrossProfit?: number | null;
  ttmOperatingIncome?: number | null;
}

export interface DerivedMetricsOutput {
  epsGrowth: number | null;
  fcfGrowth: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  currentRatio: number | null;
  grossMargin: number | null;
  fcfMargin: number | null;
  assetTurnover: number | null;
  interestCoverage: number | null;
  roa: number | null;
  roic: number | null;
  debtToEquity: number | null;
  operatingMargin: number | null;

  // Quality metadata
  computedFields: string[];
  skippedFields: Array<{ field: string; reason: string }>;
  validationErrors: string[];
}

const VALIDATION_ERRORS = {
  NAN: 'NaN detected — value rejected',
  INFINITY: 'Infinity detected — value rejected',
  DIVIDE_BY_ZERO: 'Divide by zero — value rejected',
  NEGATIVE_DENOMINATOR: 'Negative denominator — value rejected',
  MISSING_INPUT: 'Required input missing — value skipped',
} as const;

export class DerivedMetricsEngine {
  /**
   * Compute all derivable metrics from raw statement + market data.
   * Provider-returned values should be used preferentially;
   * Derived values fill gaps only.
   */
  computeAll(input: DerivedMetricsInput): DerivedMetricsOutput {
    const computedFields: string[] = [];
    const skippedFields: Array<{ field: string; reason: string }> = [];
    const validationErrors: string[] = [];

    const epsGrowth = this.computeEpsGrowth(input, computedFields, skippedFields);
    const fcfGrowth = this.computeFcfGrowth(input, computedFields, skippedFields);
    const revenueGrowth = this.computeRevenueGrowth(input, computedFields, skippedFields);
    const profitGrowth = this.computeProfitGrowth(input, computedFields, skippedFields);
    const currentRatio = this.computeCurrentRatio(input, computedFields, skippedFields);
    const grossMargin = this.computeGrossMargin(input, computedFields, skippedFields);
    const fcfMargin = this.computeFcfMargin(input, computedFields, skippedFields);
    const assetTurnover = this.computeAssetTurnover(input, computedFields, skippedFields);
    const interestCoverage = this.computeInterestCoverage(input, computedFields, skippedFields);
    const roa = this.computeRoa(input, computedFields, skippedFields);
    const roic = this.computeRoic(input, computedFields, skippedFields);
    const debtToEquity = this.computeDebtToEquity(input, computedFields, skippedFields);
    const operatingMargin = this.computeOperatingMargin(input, computedFields, skippedFields);

    return {
      epsGrowth,
      fcfGrowth,
      revenueGrowth,
      profitGrowth,
      currentRatio,
      grossMargin,
      fcfMargin,
      assetTurnover,
      interestCoverage,
      roa,
      roic,
      debtToEquity,
      operatingMargin,
      computedFields,
      skippedFields,
      validationErrors,
    };
  }

  /**
   * Compute a single field. Used by ProviderFailoverManager for field-level
   * resolution when DerivedMetricsEngine is one of the providers.
   */
  computeField(input: DerivedMetricsInput, field: string): number | null {
    const dummy: string[] = [];
    const skipDummy: Array<{ field: string; reason: string }> = [];

    switch (field) {
      case 'epsGrowth': return this.computeEpsGrowth(input, dummy, skipDummy);
      case 'fcfGrowth': return this.computeFcfGrowth(input, dummy, skipDummy);
      case 'revenueGrowth': return this.computeRevenueGrowth(input, dummy, skipDummy);
      case 'profitGrowth': return this.computeProfitGrowth(input, dummy, skipDummy);
      case 'currentRatio': return this.computeCurrentRatio(input, dummy, skipDummy);
      case 'grossMargin': return this.computeGrossMargin(input, dummy, skipDummy);
      case 'fcfYield': {
        // fcfYield = FCF / MarketCap
        const fcf = input.freeCashFlow ?? input.ttmFcf;
        const mcap = input.marketCap;
        if (!this.isValidNumber(fcf) || !this.isValidNumber(mcap) || mcap! <= 0) return null;
        return this.clamp(fcf! / mcap!, -2, 2);
      }
      case 'operatingMargin': return this.computeOperatingMargin(input, dummy, skipDummy);
      case 'roa': return this.computeRoa(input, dummy, skipDummy);
      case 'roic': return this.computeRoic(input, dummy, skipDummy);
      case 'debtToEquity': return this.computeDebtToEquity(input, dummy, skipDummy);
      default: return null;
    }
  }

  // ── Individual Metric Computations ─────────────────────

  private computeEpsGrowth(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const current = i.eps;
    const previous = i.previousEps;
    if (!this.isValidNumber(current) || !this.isValidNumber(previous)) {
      skipped.push({ field: 'epsGrowth', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (previous === 0) {
      skipped.push({ field: 'epsGrowth', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const growth = (current - previous) / Math.abs(previous);
    const clamped = this.clamp(growth, -10, 10);
    if (!this.isValidResult(clamped)) return null;
    computed.push('epsGrowth');
    return clamped;
  }

  private computeFcfGrowth(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const current = i.freeCashFlow ?? i.ttmFcf;
    const previous = i.previousFcf;
    if (!this.isValidNumber(current) || !this.isValidNumber(previous)) {
      skipped.push({ field: 'fcfGrowth', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (previous === 0) {
      skipped.push({ field: 'fcfGrowth', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const growth = (current - previous) / Math.abs(previous);
    const clamped = this.clamp(growth, -10, 10);
    if (!this.isValidResult(clamped)) return null;
    computed.push('fcfGrowth');
    return clamped;
  }

  private computeRevenueGrowth(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const current = i.revenue ?? i.ttmRevenue;
    const previous = i.previousRevenue;
    if (!this.isValidNumber(current) || !this.isValidNumber(previous)) {
      skipped.push({ field: 'revenueGrowth', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (previous === 0) {
      skipped.push({ field: 'revenueGrowth', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const growth = (current - previous) / Math.abs(previous);
    const clamped = this.clamp(growth, -10, 10);
    if (!this.isValidResult(clamped)) return null;
    computed.push('revenueGrowth');
    return clamped;
  }

  private computeProfitGrowth(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const current = i.netIncome ?? i.ttmNetIncome;
    const previous = i.previousNetIncome;
    if (!this.isValidNumber(current) || !this.isValidNumber(previous)) {
      skipped.push({ field: 'profitGrowth', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (previous === 0) {
      skipped.push({ field: 'profitGrowth', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const growth = (current - previous) / Math.abs(previous);
    const clamped = this.clamp(growth, -10, 10);
    if (!this.isValidResult(clamped)) return null;
    computed.push('profitGrowth');
    return clamped;
  }

  private computeCurrentRatio(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const ca = i.currentAssets;
    const cl = i.currentLiabilities;
    if (!this.isValidNumber(ca) || !this.isValidNumber(cl)) {
      skipped.push({ field: 'currentRatio', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (cl <= 0) {
      skipped.push({ field: 'currentRatio', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const ratio = ca / cl;
    const clamped = this.clamp(ratio, 0, 20);
    if (!this.isValidResult(clamped)) return null;
    computed.push('currentRatio');
    return clamped;
  }

  private computeGrossMargin(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const gp = i.grossProfit ?? i.ttmGrossProfit;
    const rev = i.revenue ?? i.ttmRevenue;
    if (!this.isValidNumber(gp) || !this.isValidNumber(rev)) {
      skipped.push({ field: 'grossMargin', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (rev <= 0) {
      skipped.push({ field: 'grossMargin', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const margin = gp / rev;
    const clamped = this.clamp(margin, 0, 1);
    if (!this.isValidResult(clamped)) return null;
    computed.push('grossMargin');
    return clamped;
  }

  private computeFcfMargin(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const fcf = i.freeCashFlow ?? i.ttmFcf;
    const rev = i.revenue ?? i.ttmRevenue;
    if (!this.isValidNumber(fcf) || !this.isValidNumber(rev)) {
      skipped.push({ field: 'fcfMargin', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (rev <= 0) {
      skipped.push({ field: 'fcfMargin', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const margin = fcf / rev;
    const clamped = this.clamp(margin, -1, 1);
    if (!this.isValidResult(clamped)) return null;
    computed.push('fcfMargin');
    return clamped;
  }

  private computeAssetTurnover(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const rev = i.revenue ?? i.ttmRevenue;
    const ta = i.totalAssets;
    if (!this.isValidNumber(rev) || !this.isValidNumber(ta)) {
      skipped.push({ field: 'assetTurnover', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (ta <= 0) {
      skipped.push({ field: 'assetTurnover', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const turnover = rev / ta;
    const clamped = this.clamp(turnover, 0, 10);
    if (!this.isValidResult(clamped)) return null;
    computed.push('assetTurnover');
    return clamped;
  }

  private computeInterestCoverage(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const ebit = i.operatingIncome ?? i.ttmOperatingIncome;
    const interest = i.interestExpense;
    if (!this.isValidNumber(ebit) || !this.isValidNumber(interest)) {
      skipped.push({ field: 'interestCoverage', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    // Interest coverage = EBIT / Interest Expense
    if (interest === 0) {
      // Zero interest → infinite coverage (no debt burden)
      computed.push('interestCoverage');
      return 999; // Sentinel for "no debt interest"
    }
    if (interest < 0) {
      skipped.push({ field: 'interestCoverage', reason: VALIDATION_ERRORS.NEGATIVE_DENOMINATOR });
      return null;
    }
    const coverage = ebit / interest;
    const clamped = this.clamp(coverage, -100, 100);
    if (!this.isValidResult(clamped)) return null;
    computed.push('interestCoverage');
    return clamped;
  }

  private computeRoa(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const ni = i.netIncome ?? i.ttmNetIncome;
    const ta = i.totalAssets;
    if (!this.isValidNumber(ni) || !this.isValidNumber(ta)) {
      skipped.push({ field: 'roa', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (ta <= 0) {
      skipped.push({ field: 'roa', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const roa = ni / ta;
    const clamped = this.clamp(roa, -1, 1);
    if (!this.isValidResult(clamped)) return null;
    computed.push('roa');
    return clamped;
  }

  private computeRoic(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const oi = i.operatingIncome ?? i.ttmOperatingIncome;
    const ta = i.totalAssets;
    const cl = i.currentLiabilities;
    const cash = i.cashAndEquivalents;

    if (!this.isValidNumber(oi) || !this.isValidNumber(ta)) {
      skipped.push({ field: 'roic', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }

    // Estimate tax rate
    let taxRate = 0.2517; // Default Indian corporate tax rate FY2024-25
    if (this.isValidNumber(i.incomeTaxExpense) && this.isValidNumber(i.preTaxIncome) && i.preTaxIncome! > 0) {
      taxRate = i.incomeTaxExpense! / i.preTaxIncome!;
      taxRate = this.clamp(taxRate, 0, 0.5);
    }

    // NOPAT = Operating Income × (1 - tax rate)
    const nopat = oi * (1 - taxRate);

    // Invested Capital = Total Assets - Current Liabilities - Cash
    const investedCapital = ta - (cl ?? 0) - (cash ?? 0);

    if (investedCapital <= 0) {
      skipped.push({ field: 'roic', reason: 'Invested capital <= 0' });
      return null;
    }

    const roic = nopat / investedCapital;
    const clamped = this.clamp(roic, -2, 2);
    if (!this.isValidResult(clamped)) return null;
    computed.push('roic');
    return clamped;
  }

  private computeDebtToEquity(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const tl = i.totalLiabilities;
    const te = i.totalEquity;
    if (!this.isValidNumber(tl) || !this.isValidNumber(te)) {
      skipped.push({ field: 'debtToEquity', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (te <= 0) {
      skipped.push({ field: 'debtToEquity', reason: 'Negative equity — cannot compute D/E' });
      return null;
    }
    const de = tl / te;
    const clamped = this.clamp(de, -50, 50);
    if (!this.isValidResult(clamped)) return null;
    computed.push('debtToEquity');
    return clamped;
  }

  private computeOperatingMargin(
    i: DerivedMetricsInput,
    computed: string[],
    skipped: Array<{ field: string; reason: string }>,
  ): number | null {
    const oi = i.operatingIncome ?? i.ttmOperatingIncome;
    const rev = i.revenue ?? i.ttmRevenue;
    if (!this.isValidNumber(oi) || !this.isValidNumber(rev)) {
      skipped.push({ field: 'operatingMargin', reason: VALIDATION_ERRORS.MISSING_INPUT });
      return null;
    }
    if (rev <= 0) {
      skipped.push({ field: 'operatingMargin', reason: VALIDATION_ERRORS.DIVIDE_BY_ZERO });
      return null;
    }
    const margin = oi / rev;
    const clamped = this.clamp(margin, -1, 1);
    if (!this.isValidResult(clamped)) return null;
    computed.push('operatingMargin');
    return clamped;
  }

  // ── Validation Utilities ──────────────────────────────

  /** Check that a value is non-null and finite. */
  private isValidNumber(value: unknown): value is number {
    if (value === null || value === undefined) return false;
    if (typeof value !== 'number') return false;
    if (!Number.isFinite(value)) return false;
    if (Number.isNaN(value)) return false;
    return true;
  }

  /** Validate a computed result — must be finite and not NaN. */
  private isValidResult(value: number): boolean {
    if (!Number.isFinite(value)) return false;
    if (Number.isNaN(value)) return false;
    return true;
  }

  /** Clamp value to range. */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

export default DerivedMetricsEngine;
