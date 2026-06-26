import { sglangService as sglang } from './AI/SGLangService';
import { marketConfigService as marketConfig } from './MarketConfigService';
import { stockUniverseService as stockUniverse } from './StockUniverseService';

export type ScanStrategy = 'all' | 'value' | 'growth' | 'quality' | 'momentum';

export interface ScannerResult {
  symbol: string;
  name: string;
  rating: number;
  qualityScore: number;
  valuationScore: number;
  growthScore: number;
  riskScore: number;
  source: 'live' | 'snapshot';
  scannedAt: string;
}

export class SmartScannerService {
  async scanSector(sector: string, limit = 50): Promise<ScannerResult[]> {
    const stocks = await stockUniverse.getStocksBySector(sector, limit * 2);
    return this.runAnalysis(stocks, limit);
  }

  async scanAllStocks(limit = 100): Promise<ScannerResult[]> {
    const stocks = await stockUniverse.getTopStocks('NSE', limit * 3);
    return this.runAnalysis(stocks, limit);
  }

  async scanByStrategy(strategy: ScanStrategy, limit = 50): Promise<ScannerResult[]> {
    const stocks = await stockUniverse.getTopStocks('NSE', limit * 5);
    const results = await this.runAnalysis(stocks, limit * 3);

    switch (strategy) {
      case 'value':
        return results.sort((a, b) => b.valuationScore - a.valuationScore).slice(0, limit);
      case 'growth':
        return results.sort((a, b) => b.growthScore - a.growthScore).slice(0, limit);
      case 'quality':
        return results.sort((a, b) => b.qualityScore - a.qualityScore).slice(0, limit);
      case 'momentum':
        return results.sort((a, b) => b.rating - a.rating).slice(0, limit);
      default:
        return results.slice(0, limit);
    }
  }

  private async runAnalysis(stocks: Array<{ symbol: string; name: string }>, limit: number): Promise<ScannerResult[]> {
    const marketStatus = await marketConfig.getMarketStatus();
    const results: ScannerResult[] = [];

    for (const stock of stocks) {
      try {
        const analysis = await sglang.analyzeStockParallel(stock.symbol, {
          roe: null, roic: null, peRatio: null, pbRatio: null,
          revenueGrowth: null, debtEquity: null,
        });
        const s = analysis.scores || { quality: 50, valuation: 50, growth: 50, risk: 50, overall: 50 };
        results.push({
          symbol: stock.symbol,
          name: stock.name,
          rating: s.overall,
          qualityScore: s.quality,
          valuationScore: s.valuation,
          growthScore: s.growth,
          riskScore: s.risk,
          source: marketStatus.isOpen ? 'live' : 'snapshot',
          scannedAt: new Date().toISOString(),
        });
      } catch {
        continue;
      }
    }

    return results.sort((a, b) => b.rating - a.rating).slice(0, limit);
  }
}

export const smartScannerService = new SmartScannerService();
