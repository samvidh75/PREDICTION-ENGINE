/**
 * TTMCalculator — TRACK-21 Phase 3 Task 10
 *
 * Computes Trailing Twelve Months (TTM) metrics from quarterly statements.
 * TTM = sum of last 4 quarterly periods.
 *
 * Generates:
 *   - TTM Revenue
 *   - TTM Net Income → TTM EPS
 *   - TTM Free Cash Flow
 *   - TTM Margins (from TTM totals, NOT avg of quarterly margins)
 *
 * Rule for ratios: compute from TTM totals, not average of quarterly ratios
 *   ✓ ttmGrossMargin = sum(grossProfit_q) / sum(revenue_q)
 *   ✗ ttmGrossMargin = avg(quarterly grossMargin)
 */

import pool from '../db/index';

export interface TTMData {
  symbol: string;
  periodEnd: string;          // Latest quarter end date
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebitda: number | null;
  netIncome: number | null;
  eps: number | null;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  depreciationAmortization: number | null;
  interestExpense: number | null;
  incomeTaxExpense: number | null;
  sharesOutstanding: number | null;  // from latest BS

  // Derived margins
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  fcfMargin: number | null;

  // Quality flags
  quartersUsed: number;       // How many quarters contributed (should be 4)
  dataQuality: 'full' | 'partial' | 'unavailable';
  warnings: string[];
}

export class TTMCalculator {
  /**
   * Compute TTM for a symbol from the last 4 quarterly statements.
   */
  async computeTTM(symbol: string): Promise<TTMData> {
    const warnings: string[] = [];

    // Fetch last 4 quarterly records from DB
    const result = await pool.query(
      `SELECT * FROM financial_statements
       WHERE symbol = $1 AND period_type = 'quarterly'
       ORDER BY period_end DESC
       LIMIT 4`,
      [symbol]
    );

    const quarters = result.rows;
    const quartersUsed = quarters.length;

    if (quarters.length === 0) {
      return {
        symbol,
        periodEnd: new Date().toISOString().split('T')[0],
        revenue: null, costOfRevenue: null, grossProfit: null,
        operatingIncome: null, ebitda: null, netIncome: null, eps: null,
        operatingCashFlow: null, capitalExpenditure: null, freeCashFlow: null,
        depreciationAmortization: null, interestExpense: null, incomeTaxExpense: null,
        sharesOutstanding: null,
        grossMargin: null, operatingMargin: null, netMargin: null, fcfMargin: null,
        quartersUsed: 0,
        dataQuality: 'unavailable',
        warnings: ['No quarterly statements found'],
      };
    }

    if (quarters.length < 4) {
      warnings.push(`Only ${quarters.length}/4 quarters available — TTM is partial`);
    }

    // Sum quarterly values
    const sum = (field: string): number | null => {
      const values = quarters.map(q => q[field]).filter(v => v !== null && v !== undefined && isFinite(v));
      if (values.length === 0) return null;
      return values.reduce((a: number, b: number) => a + b, 0);
    };

    const ttmRevenue = sum('revenue');
    const ttmCostOfRevenue = sum('cost_of_revenue');
    const ttmGrossProfit = sum('gross_profit');
    const ttmOperatingIncome = sum('operating_income');
    const ttmEbitda = sum('ebitda');
    const ttmNetIncome = sum('net_income');
    const ttmOperatingCF = sum('operating_cash_flow');
    const ttmCapEx = sum('capital_expenditure');
    const ttmFCF = sum('free_cash_flow');
    const ttmDAndA = sum('depreciation_amortization');
    const ttmInterestExpense = sum('interest_expense');
    const ttmIncomeTaxExpense = sum('income_tax_expense');

    // Latest quarter's shares outstanding (BS field)
    const latestShares = quarters[0]?.shares_outstanding ?? null;

    // TTM EPS = TTM Net Income / Shares Outstanding
    let ttmEps: number | null;
    if (ttmNetIncome !== null && latestShares !== null && latestShares > 0) {
      ttmEps = ttmNetIncome / latestShares;
    } else {
      // Fallback: sum quarterly EPS
      ttmEps = sum('eps');
    }

    // Derived TTM margins — compute from TTM totals, not avg quarterly ratios
    let ttmGrossMargin: number | null = null;
    if (ttmGrossProfit !== null && ttmRevenue !== null && ttmRevenue > 0) {
      ttmGrossMargin = this.clamp(ttmGrossProfit / ttmRevenue, 0, 1);
    }

    let ttmOperatingMargin: number | null = null;
    if (ttmOperatingIncome !== null && ttmRevenue !== null && ttmRevenue > 0) {
      ttmOperatingMargin = this.clamp(ttmOperatingIncome / ttmRevenue, -1, 1);
    }

    let ttmNetMargin: number | null = null;
    if (ttmNetIncome !== null && ttmRevenue !== null && ttmRevenue > 0) {
      ttmNetMargin = this.clamp(ttmNetIncome / ttmRevenue, -1, 1);
    }

    let ttmFcfMargin: number | null = null;
    if (ttmFCF !== null && ttmRevenue !== null && ttmRevenue > 0) {
      ttmFcfMargin = this.clamp(ttmFCF / ttmRevenue, -1, 1);
    }

    const latestPeriodEnd = quarters[0]?.period_end ?? new Date().toISOString().split('T')[0];
    const dataQuality = quarters.length >= 4 ? 'full' : 'partial';

    return {
      symbol,
      periodEnd: latestPeriodEnd,
      revenue: ttmRevenue,
      costOfRevenue: ttmCostOfRevenue,
      grossProfit: ttmGrossProfit,
      operatingIncome: ttmOperatingIncome,
      ebitda: ttmEbitda,
      netIncome: ttmNetIncome,
      eps: ttmEps,
      operatingCashFlow: ttmOperatingCF,
      capitalExpenditure: ttmCapEx,
      freeCashFlow: ttmFCF,
      depreciationAmortization: ttmDAndA,
      interestExpense: ttmInterestExpense,
      incomeTaxExpense: ttmIncomeTaxExpense,
      sharesOutstanding: latestShares,
      grossMargin: ttmGrossMargin,
      operatingMargin: ttmOperatingMargin,
      netMargin: ttmNetMargin,
      fcfMargin: ttmFcfMargin,
      quartersUsed,
      dataQuality,
      warnings,
    };
  }

  /**
   * Compute TTM for a batch of symbols.
   */
  async computeBatch(symbols: string[]): Promise<Map<string, TTMData>> {
    const results = new Map<string, TTMData>();
    for (const symbol of symbols) {
      results.set(symbol, await this.computeTTM(symbol));
    }
    return results;
  }

  /**
   * Store TTM data in financial_statements table.
   */
  async storeTTM(ttm: TTMData): Promise<void> {
    if (ttm.dataQuality === 'unavailable') return;

    await pool.query(
      `INSERT INTO financial_statements (
         symbol, period_end, period_type,
         revenue, cost_of_revenue, gross_profit,
         operating_income, net_income, eps, ebitda,
         interest_expense, income_tax_expense,
         operating_cash_flow, capital_expenditure, free_cash_flow,
         depreciation_amortization, shares_outstanding,
         source_provider
       ) VALUES (
         $1, $2, 'ttm',
         $3, $4, $5,
         $6, $7, $8, $9,
         $10, $11,
         $12, $13, $14,
         $15, $16,
         'TTMCalculator'
       )
       ON CONFLICT (symbol, period_end, period_type) DO UPDATE SET
         revenue = EXCLUDED.revenue,
         cost_of_revenue = EXCLUDED.cost_of_revenue,
         gross_profit = EXCLUDED.gross_profit,
         operating_income = EXCLUDED.operating_income,
         net_income = EXCLUDED.net_income,
         eps = EXCLUDED.eps,
         ebitda = EXCLUDED.ebitda,
         interest_expense = EXCLUDED.interest_expense,
         income_tax_expense = EXCLUDED.income_tax_expense,
         operating_cash_flow = EXCLUDED.operating_cash_flow,
         capital_expenditure = EXCLUDED.capital_expenditure,
         free_cash_flow = EXCLUDED.free_cash_flow,
         depreciation_amortization = EXCLUDED.depreciation_amortization,
         shares_outstanding = EXCLUDED.shares_outstanding,
         source_provider = EXCLUDED.source_provider,
         ingested_at = NOW()`,
      [
        ttm.symbol, ttm.periodEnd,
        ttm.revenue, ttm.costOfRevenue, ttm.grossProfit,
        ttm.operatingIncome, ttm.netIncome, ttm.eps, ttm.ebitda,
        ttm.interestExpense, ttm.incomeTaxExpense,
        ttm.operatingCashFlow, ttm.capitalExpenditure, ttm.freeCashFlow,
        ttm.depreciationAmortization, ttm.sharesOutstanding,
      ]
    );
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

export default TTMCalculator;
