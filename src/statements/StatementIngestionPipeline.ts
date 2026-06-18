/**
 * StatementIngestionPipeline — TRACK-21 Phase 3 Task 9
 *
 * Pipeline that ingests raw financial statements from providers,
 * normalizes them, validates, and stores them in the DB.
 *
 * Flow: Provider → Raw Statement → Validation → Storage
 */

import pool from '../db/index';
import {
  StatementSet,
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  validateStatementSet,
  validateBalanceSheet,
  validateIncomeStatement,
  validateCashFlow,
} from './StatementSchemas';

export interface IngestionResult {
  symbol: string;
  success: boolean;
  statementsStored: {
    balanceSheet: boolean;
    incomeStatement: boolean;
    cashFlow: boolean;
  };
  errors: string[];
  warnings: string[];
  durationMs: number;
}

/**
 * Fetch raw statements from a provider. This interface can be implemented
 * by UpstoxFundamentalsProvider or any other provider.
 */
export interface StatementProvider {
  name: string;
  fetchBalanceSheet(symbol: string, periodType: 'annual' | 'quarterly'): Promise<BalanceSheet | null>;
  fetchIncomeStatement(symbol: string, periodType: 'annual' | 'quarterly'): Promise<IncomeStatement | null>;
  fetchCashFlow(symbol: string, periodType: 'annual' | 'quarterly'): Promise<CashFlowStatement | null>;
}

export class StatementIngestionPipeline {
  constructor(private providers: StatementProvider[]) {}

  /**
   * Ingest all statements for a single symbol.
   */
  async ingestSymbol(
    symbol: string,
    periodTypes: Array<'annual' | 'quarterly'> = ['annual', 'quarterly'],
  ): Promise<IngestionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const statementsStored = { balanceSheet: false, incomeStatement: false, cashFlow: false };

    for (const periodType of periodTypes) {
      // Try each provider in order
      let bs: BalanceSheet | null = null;
      let is: IncomeStatement | null = null;
      let cf: CashFlowStatement | null = null;
      let bsProvider = '';
      let isProvider = '';
      let cfProvider = '';

      for (const provider of this.providers) {
        try {
          if (!bs) {
            bs = await provider.fetchBalanceSheet(symbol, periodType);
            if (bs) bsProvider = provider.name;
          }
          if (!is) {
            is = await provider.fetchIncomeStatement(symbol, periodType);
            if (is) isProvider = provider.name;
          }
          if (!cf) {
            cf = await provider.fetchCashFlow(symbol, periodType);
            if (cf) cfProvider = provider.name;
          }
        } catch (err: any) {
          console.warn(`StatementIngestion: ${provider.name} failed for ${symbol} (${periodType}): ${err.message?.substring(0, 80)}`);
        }

        // Early exit if we have all three
        if (bs && is && cf) break;
      }

      // Validate
      const set: StatementSet = {
        symbol,
        balanceSheet: bs,
        incomeStatement: is,
        cashFlow: cf,
        periodType,
        sourceProvider: [bsProvider, isProvider, cfProvider].filter(Boolean).join(', ') || 'unknown',
      };

      const validation = validateStatementSet(set);
      warnings.push(...validation.warnings);
      if (!validation.valid) {
        errors.push(...validation.issues);
      }

      // Store in DB
      if (bs || is || cf) {
        await this.storeStatements(symbol, bs, is, cf, periodType, set.sourceProvider);
        statementsStored.balanceSheet = bs !== null;
        statementsStored.incomeStatement = is !== null;
        statementsStored.cashFlow = cf !== null;
      } else {
        errors.push(`No statements available for ${symbol} (${periodType})`);
      }
    }

    return {
      symbol,
      success: errors.length === 0,
      statementsStored,
      errors,
      warnings,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Ingest statements for a batch of symbols.
   */
  async ingestBatch(symbols: string[]): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];
    for (const symbol of symbols) {
      const result = await this.ingestSymbol(symbol);
      results.push(result);
    }
    return results;
  }

  // ── Private ──────────────────────────────────────────────

  private async storeStatements(
    symbol: string,
    bs: BalanceSheet | null,
    is: IncomeStatement | null,
    cf: CashFlowStatement | null,
    periodType: 'annual' | 'quarterly' | 'ttm',
    sourceProvider: string,
  ): Promise<void> {
    const periodEnd = bs?.periodEnd ?? is?.periodEnd ?? cf?.periodEnd ?? new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO financial_statements (
         symbol, period_end, period_type,
         total_assets, total_liabilities, total_equity,
         current_assets, current_liabilities,
         cash_and_equivalents, short_term_debt, long_term_debt, total_debt,
         inventory, shares_outstanding, goodwill,
         revenue, cost_of_revenue, gross_profit,
         operating_income, net_income, eps, ebitda,
         interest_expense, income_tax_expense, pre_tax_income,
         operating_cash_flow, capital_expenditure, free_cash_flow,
         dividends_paid, depreciation_amortization,
         source_provider, reporting_currency
       ) VALUES (
         $1, $2, $3,
         $4, $5, $6,
         $7, $8,
         $9, $10, $11, $12,
         $13, $14, $15,
         $16, $17, $18,
         $19, $20, $21, $22,
         $23, $24, $25,
         $26, $27, $28,
         $29, $30,
         $31, 'INR'
       )
       ON CONFLICT (symbol, period_end, period_type) DO UPDATE SET
         total_assets = COALESCE(EXCLUDED.total_assets, financial_statements.total_assets),
         total_liabilities = COALESCE(EXCLUDED.total_liabilities, financial_statements.total_liabilities),
         total_equity = COALESCE(EXCLUDED.total_equity, financial_statements.total_equity),
         current_assets = COALESCE(EXCLUDED.current_assets, financial_statements.current_assets),
         current_liabilities = COALESCE(EXCLUDED.current_liabilities, financial_statements.current_liabilities),
         cash_and_equivalents = COALESCE(EXCLUDED.cash_and_equivalents, financial_statements.cash_and_equivalents),
         short_term_debt = COALESCE(EXCLUDED.short_term_debt, financial_statements.short_term_debt),
         long_term_debt = COALESCE(EXCLUDED.long_term_debt, financial_statements.long_term_debt),
         total_debt = COALESCE(EXCLUDED.total_debt, financial_statements.total_debt),
         inventory = COALESCE(EXCLUDED.inventory, financial_statements.inventory),
         shares_outstanding = COALESCE(EXCLUDED.shares_outstanding, financial_statements.shares_outstanding),
         goodwill = COALESCE(EXCLUDED.goodwill, financial_statements.goodwill),
         revenue = COALESCE(EXCLUDED.revenue, financial_statements.revenue),
         cost_of_revenue = COALESCE(EXCLUDED.cost_of_revenue, financial_statements.cost_of_revenue),
         gross_profit = COALESCE(EXCLUDED.gross_profit, financial_statements.gross_profit),
         operating_income = COALESCE(EXCLUDED.operating_income, financial_statements.operating_income),
         net_income = COALESCE(EXCLUDED.net_income, financial_statements.net_income),
         eps = COALESCE(EXCLUDED.eps, financial_statements.eps),
         ebitda = COALESCE(EXCLUDED.ebitda, financial_statements.ebitda),
         interest_expense = COALESCE(EXCLUDED.interest_expense, financial_statements.interest_expense),
         income_tax_expense = COALESCE(EXCLUDED.income_tax_expense, financial_statements.income_tax_expense),
         pre_tax_income = COALESCE(EXCLUDED.pre_tax_income, financial_statements.pre_tax_income),
         operating_cash_flow = COALESCE(EXCLUDED.operating_cash_flow, financial_statements.operating_cash_flow),
         capital_expenditure = COALESCE(EXCLUDED.capital_expenditure, financial_statements.capital_expenditure),
         free_cash_flow = COALESCE(EXCLUDED.free_cash_flow, financial_statements.free_cash_flow),
         dividends_paid = COALESCE(EXCLUDED.dividends_paid, financial_statements.dividends_paid),
         depreciation_amortization = COALESCE(EXCLUDED.depreciation_amortization, financial_statements.depreciation_amortization),
         source_provider = EXCLUDED.source_provider,
         ingested_at = NOW()`,
      [
        symbol, periodEnd, periodType,
        bs?.totalAssets ?? null, bs?.totalLiabilities ?? null, bs?.totalEquity ?? null,
        bs?.currentAssets ?? null, bs?.currentLiabilities ?? null,
        bs?.cashAndEquivalents ?? null, bs?.shortTermDebt ?? null, bs?.longTermDebt ?? null, bs?.totalDebt ?? null,
        bs?.inventory ?? null, bs?.sharesOutstanding ?? null, bs?.goodwill ?? null,
        is?.revenue ?? null, is?.costOfRevenue ?? null, is?.grossProfit ?? null,
        is?.operatingIncome ?? null, is?.netIncome ?? null, is?.eps ?? null, is?.ebitda ?? null,
        is?.interestExpense ?? null, is?.incomeTaxExpense ?? null, is?.preTaxIncome ?? null,
        cf?.operatingCashFlow ?? null, cf?.capitalExpenditure ?? null, cf?.freeCashFlow ?? null,
        cf?.dividendsPaid ?? null, cf?.depreciationAmortization ?? null,
        sourceProvider,
      ]
    );
  }
}

export default StatementIngestionPipeline;
