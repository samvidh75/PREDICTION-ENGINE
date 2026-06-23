import type { StockIntelligenceSnapshot } from '../../../shared/intelligence/IndianApiPremiumTypes';

export interface SuperScanDefinition {
  key: string;
  label: string;
  description: string;
}

export interface SuperScanEntry {
  symbol: string;
  score: number;
  reason: string;
  dataQuality: string;
}

export const SUPER_SCAN_DEFINITIONS: SuperScanDefinition[] = [
  { key: 'value-with-quality', label: 'Value with quality', description: 'Stocks with reasonable valuation backed by solid profitability and low debt' },
  { key: 'promoter-confidence', label: 'Promoter confidence', description: 'Companies where promoters hold significant stake with healthy fundamentals' },
  { key: 'profitability-leaders', label: 'Profitability leaders', description: 'Companies with strong ROE, ROCE, and operating margins' },
  { key: 'momentum-with-quality', label: 'Momentum with quality', description: 'Stocks showing positive momentum with acceptable quality metrics' },
  { key: 'balance-sheet-strength', label: 'Balance-sheet strength', description: 'Companies with strong balance sheets and low debt' },
  { key: 'risk-rising', label: 'Risk rising', description: 'Stocks showing elevated debt, margin compression, or profit decline' },
];

export class SuperScanService {
  runScan(scanKey: string, snapshots: StockIntelligenceSnapshot[]): SuperScanEntry[] {
    switch (scanKey) {
      case 'value-with-quality': return this.scanValueWithQuality(snapshots);
      case 'promoter-confidence': return this.scanPromoterConfidence(snapshots);
      case 'profitability-leaders': return this.scanProfitabilityLeaders(snapshots);
      case 'momentum-with-quality': return this.scanMomentumWithQuality(snapshots);
      case 'balance-sheet-strength': return this.scanBalanceSheetStrength(snapshots);
      case 'risk-rising': return this.scanRiskRising(snapshots);
      default: return [];
    }
  }

  private scanValueWithQuality(snapshots: StockIntelligenceSnapshot[]): SuperScanEntry[] {
    const results: SuperScanEntry[] = [];
    for (const s of snapshots) {
      if (s.peRatio == null || s.peRatio <= 0 || s.peRatio >= 30) continue;
      if (s.roe == null || s.roe < 10) continue;
      if (s.debtToEquity != null && s.debtToEquity > 2) continue;
      const score = this.computeScore([
        { value: (30 - s.peRatio) / 30 * 30, max: 30 },
        { value: Math.min(s.roe, 40) / 40 * 30, max: 30 },
        { value: s.roce != null && s.roce > 12 ? 20 : 10, max: 20 },
        { value: s.debtToEquity == null || s.debtToEquity < 1 ? 20 : 10, max: 20 },
      ]);
      const parts = [`PE=${s.peRatio}`, `ROE=${s.roe}%`];
      if (s.debtToEquity != null) parts.push(`D/E=${s.debtToEquity}`);
      results.push({ symbol: s.symbol, score, reason: parts.join(' '), dataQuality: s.sourceState });
    }
    return this.rank(results);
  }

  private scanPromoterConfidence(snapshots: StockIntelligenceSnapshot[]): SuperScanEntry[] {
    const results: SuperScanEntry[] = [];
    for (const s of snapshots) {
      if (s.promoterHolding == null || s.promoterHolding < 40) continue;
      const score = this.computeScore([
        { value: Math.min(s.promoterHolding, 90) / 90 * 40, max: 40 },
        { value: s.roe != null && s.roe > 8 ? 30 : 0, max: 30 },
        { value: s.debtToEquity == null || s.debtToEquity < 1.5 ? 30 : 10, max: 30 },
      ]);
      const parts = [`Promoter=${s.promoterHolding}%`];
      if (s.roe != null) parts.push(`ROE=${s.roe}%`);
      results.push({ symbol: s.symbol, score, reason: parts.join(' '), dataQuality: s.sourceState });
    }
    return this.rank(results);
  }

  private scanProfitabilityLeaders(snapshots: StockIntelligenceSnapshot[]): SuperScanEntry[] {
    const results: SuperScanEntry[] = [];
    for (const s of snapshots) {
      if (s.roe == null || s.roe < 15) continue;
      if (s.operatingMargin != null && s.operatingMargin < 10) continue;
      const score = this.computeScore([
        { value: Math.min(s.roe, 50) / 50 * 35, max: 35 },
        { value: s.operatingMargin != null ? Math.min(s.operatingMargin, 40) / 40 * 25 : 0, max: 25 },
        { value: s.netMargin != null ? Math.min(s.netMargin, 25) / 25 * 20 : 10, max: 20 },
        { value: 20, max: 20 },
      ]);
      const parts = [`ROE=${s.roe}%`];
      if (s.operatingMargin != null) parts.push(`OPM=${s.operatingMargin}%`);
      results.push({ symbol: s.symbol, score, reason: parts.join(' '), dataQuality: s.sourceState });
    }
    return this.rank(results);
  }

  private scanMomentumWithQuality(snapshots: StockIntelligenceSnapshot[]): SuperScanEntry[] {
    const results: SuperScanEntry[] = [];
    for (const s of snapshots) {
      if (s.changePercent == null || s.changePercent <= 0) continue;
      if (s.roe == null || s.roe < 8) continue;
      if (s.debtToEquity != null && s.debtToEquity > 2.5) continue;
      const score = this.computeScore([
        { value: Math.min(s.changePercent, 20) / 20 * 25, max: 25 },
        { value: Math.min(s.roe, 35) / 35 * 30, max: 30 },
        { value: s.debtToEquity == null || s.debtToEquity < 1.5 ? 20 : 10, max: 20 },
        { value: 25, max: 25 },
      ]);
      const parts = [`Change=${s.changePercent}%`, `ROE=${s.roe}%`];
      results.push({ symbol: s.symbol, score, reason: parts.join(' '), dataQuality: s.sourceState });
    }
    return this.rank(results);
  }

  private scanBalanceSheetStrength(snapshots: StockIntelligenceSnapshot[]): SuperScanEntry[] {
    const results: SuperScanEntry[] = [];
    for (const s of snapshots) {
      if (s.debtToEquity == null || s.debtToEquity >= 1) continue;
      if (s.roe == null || s.roe < 8) continue;
      const score = this.computeScore([
        { value: Math.max(0, (1 - s.debtToEquity) / 1 * 35), max: 35 },
        { value: Math.min(s.roe, 30) / 30 * 30, max: 30 },
        { value: 20, max: 20 },
        { value: 15, max: 15 },
      ]);
      results.push({
        symbol: s.symbol, score,
        reason: `D/E=${s.debtToEquity} ROE=${s.roe}%`,
        dataQuality: s.sourceState,
      });
    }
    return this.rank(results);
  }

  private scanRiskRising(snapshots: StockIntelligenceSnapshot[]): SuperScanEntry[] {
    const results: SuperScanEntry[] = [];
    for (const s of snapshots) {
      const debtRisk = s.debtToEquity != null && s.debtToEquity > 1.5;
      const profitRisk = s.profitGrowth != null && s.profitGrowth < -10;
      const marginRisk = s.operatingMargin != null && s.operatingMargin < 5;
      if (!debtRisk && !profitRisk && !marginRisk) continue;
      const score = this.computeScore([
        { value: s.debtToEquity != null && s.debtToEquity > 1.5 ? Math.min(s.debtToEquity, 5) / 5 * 40 : 0, max: 40 },
        { value: s.profitGrowth != null && s.profitGrowth < -10 ? Math.min(Math.abs(s.profitGrowth), 50) / 50 * 30 : 0, max: 30 },
        { value: marginRisk ? 20 : 0, max: 20 },
        { value: 10, max: 10 },
      ]);
      const parts: string[] = [];
      if (debtRisk) parts.push(`D/E=${s.debtToEquity}`);
      if (profitRisk) parts.push(`Profit growth=${s.profitGrowth}%`);
      if (marginRisk) parts.push(`OPM=${s.operatingMargin}%`);
      results.push({ symbol: s.symbol, score, reason: parts.join(' '), dataQuality: s.sourceState });
    }
    return this.rank(results);
  }

  private computeScore(entries: { value: number; max: number }[]): number {
    const total = entries.reduce((sum, e) => sum + Math.min(e.value, e.max), 0);
    const maxTotal = entries.reduce((sum, e) => sum + e.max, 0);
    return Math.min(100, Math.round((total / maxTotal) * 100));
  }

  private rank(results: SuperScanEntry[]): SuperScanEntry[] {
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }
}
