// src/services/providers/FinancialProvider.ts
import type { YahooFinancials } from './YahooProvider';

/**
 * FinancialData — generic financial data contract accepted from all providers.
 * Providers return their own shape; the coordinator normalizes downstream.
 */
export type FinancialData = Record<string, unknown> | YahooFinancials;

export interface FinancialProvider {
  /**
   * Retrieves financial statements or key metrics for a company.
   */
  getFinancials(symbol: string): Promise<FinancialData>;
}
