/**
 * ProviderValidation validates and reconciles quote accuracy across active
 * quote providers. Legacy removed providers are not part of this check.
 */

import { YahooProvider } from './YahooProvider';
import { IndianMarketProvider } from './IndianMarketProvider';

export interface QuoteReconciliationResult {
  symbol: string;
  yahooPrice: number | null;
  indianMarketPrice: number | null;
  variance: number;
  status: 'HIGH_VARIANCE' | 'RECONCILED' | 'INCOMPLETE';
}

export class ProviderValidation {
  private static yahoo = new YahooProvider();
  private static indianMarket = new IndianMarketProvider();

  static async reconcileQuotes(symbols: string[]): Promise<QuoteReconciliationResult[]> {
    const results: QuoteReconciliationResult[] = [];

    for (const symbol of symbols) {
      let yahooPrice: number | null = null;
      let indianMarketPrice: number | null = null;

      try {
        const q = await this.yahoo.getQuote(symbol);
        yahooPrice = q.price;
      } catch {
        // Continue; reconciliation can run with partial provider availability.
      }

      try {
        const q = await this.indianMarket.getQuote(symbol);
        indianMarketPrice = q.price;
      } catch {
        // Continue; reconciliation can run with partial provider availability.
      }

      const validPrices = [yahooPrice, indianMarketPrice].filter(
        (p): p is number => p !== null && p > 0,
      );

      let variance = 0;
      let status: QuoteReconciliationResult['status'] = 'INCOMPLETE';

      if (validPrices.length >= 2) {
        const max = Math.max(...validPrices);
        const min = Math.min(...validPrices);
        variance = ((max - min) / min) * 100;
        status = variance > 2 ? 'HIGH_VARIANCE' : 'RECONCILED';
      }

      results.push({
        symbol,
        yahooPrice,
        indianMarketPrice,
        variance,
        status,
      });
    }

    return results;
  }

  static generateReport(results: QuoteReconciliationResult[]): string {
    const timestamp = new Date().toISOString();
    let md = `# Provider Accuracy Report\n\n`;
    md += `**Timestamp:** \`${timestamp}\`  \n`;
    md += `**Target symbols:** RELIANCE, TCS, HDFCBANK, INFY, SBIN\n\n`;
    md += `| Symbol | Yahoo Price | IndianMarket Price | Variance (%) | Status |\n`;
    md += `| --- | --- | --- | --- | --- |\n`;

    for (const r of results) {
      const yStr = r.yahooPrice !== null ? `₱${r.yahooPrice.toFixed(2)}` : 'N/A';
      const iStr = r.indianMarketPrice !== null ? `₱${r.indianMarketPrice.toFixed(2)}` : 'N/A';
      const varStr = r.variance > 0 ? `${r.variance.toFixed(2)}%` : '-';
      md += `| **${r.symbol}** | ${yStr} | ${iStr} | ${varStr} | ${r.status} |\n`;
    }

    md += `\n## Provider Reliability Rankings\n\n`;
    md += `1. Yahoo Finance: active quote provider.\n`;
    md += `2. IndianMarket: active secondary quote provider where available.\n`;
    md += `\nLegacy removed providers are not part of the production provider set.\n`;

    return md;
  }
}
