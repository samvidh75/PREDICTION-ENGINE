import { sglangService as sglang } from './AI/SGLangService';
import { marketConfigService as marketConfig } from './MarketConfigService';
import { stockUniverseService as stockUniverse } from './StockUniverseService';

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
    const marketStatus = await marketConfig.getMarketStatus();
    const results: ScannerResult[] = [];

    for (const stock of stocks) {
      try {
        const analysis = await sglang.analyzeStockParallel(stock.symbol, {
          roe: null, roic: null, peRatio: null, pbRatio: null,
          revenueGrowth: null, debtEquity: null,
        });
        results.push({
          symbol: stock.symbol,
          name: stock.name,
          rating: 50,
          qualityScore: analysis.quality ? 50 : 50,
          valuationScore: analysis.valuation ? 50 : 50,
          growthScore: analysis.growth ? 50 : 50,
          riskScore: analysis.risk ? 50 : 50,
          source: marketStatus.isOpen ? 'live' : 'snapshot',
          scannedAt: new Date().toISOString(),
        });
      } catch {
        continue;
      }
    }

    return results.sort((a, b) => b.rating - a.rating).slice(0, limit);
  }

  async scanAllStocks(limit = 100): Promise<ScannerResult[]> {
    const stocks = await stockUniverse.getTopStocks('NSE', limit * 3);
    const marketStatus = await marketConfig.getMarketStatus();
    const results: ScannerResult[] = [];

    for (const stock of stocks) {
      try {
        const analysis = await sglang.analyzeStockParallel(stock.symbol, {
          roe: null, roic: null, peRatio: null, pbRatio: null,
          revenueGrowth: null, debtEquity: null,
        });
        results.push({
          symbol: stock.symbol,
          name: stock.name,
          rating: 50,
          qualityScore: 50,
          valuationScore: 50,
          growthScore: 50,
          riskScore: 50,
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
