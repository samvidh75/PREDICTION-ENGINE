// src/services/providers/FinancialProvider.ts
export interface FinancialProvider {
  /**
   * Retrieves financial statements or key metrics for a company.
   * The concrete return type can be defined later (e.g., Financials type).
   */
  getFinancials(symbol: string): Promise<any>;
}
