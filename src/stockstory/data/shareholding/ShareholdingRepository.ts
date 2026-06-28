/**
 * Shareholding Repository
 *
 * Tracks shareholding patterns, computes trends,
 * and identifies promoter risk flags.
 */

import type {
  ShareholdingPattern,
  ShareholdingTrend,
  PromoterRisk,
  ShareholdingFilter,
  ShareholderCategory,
} from './ShareholdingTypes';

export class ShareholdingRepository {
  private patterns: Map<string, ShareholdingPattern> = new Map();
  private bySymbol: Map<string, string[]> = new Map();

  add(pattern: ShareholdingPattern): void {
    this.patterns.set(pattern.id, pattern);

    const key = pattern.symbol.toUpperCase();
    const ids = this.bySymbol.get(key) ?? [];
    ids.push(pattern.id);
    ids.sort((a, b) => {
      const pa = this.patterns.get(a)!;
      const pb = this.patterns.get(b)!;
      return pb.periodEndDate.localeCompare(pa.periodEndDate);
    });
    this.bySymbol.set(key, ids);
  }

  getBySymbol(symbol: string): ShareholdingPattern[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];
    return ids.map(id => this.patterns.get(id)!).filter(Boolean);
  }

  getLatest(symbol: string): ShareholdingPattern | undefined {
    return this.getBySymbol(symbol)[0];
  }

  getTrend(symbol: string, quarters: number = 4): ShareholdingTrend {
    const patterns = this.getBySymbol(symbol).slice(0, quarters);
    if (patterns.length === 0) {
      return {
        symbol,
        periods: [],
        promoterTrend: 'unknown',
        fiiTrend: 'unknown',
        diiTrend: 'unknown',
        retailTrend: 'unknown',
      };
    }

    return {
      symbol: symbol.toUpperCase(),
      periods: patterns,
      promoterTrend: this.categoryTrend(patterns, 'promoter'),
      fiiTrend: this.categoryTrend(patterns, 'fii'),
      diiTrend: this.categoryTrend(patterns, 'dii'),
      retailTrend: this.categoryTrend(patterns, 'retail'),
    };
  }

  private categoryTrend(
    patterns: ShareholdingPattern[],
    category: ShareholderCategory
  ): ShareholdingTrend['promoterTrend'] {
    if (patterns.length < 2) return 'unknown';
    const first = patterns[patterns.length - 1];
    const last = patterns[0];

    const firstHolding = first.holdings.find(h => h.category === category);
    const lastHolding = last.holdings.find(h => h.category === category);

    if (!firstHolding || !lastHolding) return 'unknown';

    const change = lastHolding.percentage - firstHolding.percentage;
    if (change > 1) return 'increasing';
    if (change < -1) return 'decreasing';
    return 'stable';
  }

  getPromoterRisk(symbol: string): PromoterRisk {
    const latest = this.getLatest(symbol);
    if (!latest) {
      return {
        symbol: symbol.toUpperCase(),
        promoterHolding: 0,
        pledgedPercentage: 0,
        riskLevel: 'high',
        flags: ['No shareholding data available'],
      };
    }

    const promoterHolding = latest.holdings
      .filter(h => h.category === 'promoter' || h.category === 'promoter_group')
      .reduce((sum, h) => sum + h.percentage, 0);

    const pledged = latest.promoterPledgedPercentage ?? 0;
    const flags: string[] = [];

    if (promoterHolding < 20) flags.push('Low promoter holding (<20%)');
    if (promoterHolding > 75) flags.push('Very high promoter holding (>75%) — low free float');
    if (pledged > 50) flags.push('High promoter pledge (>50%)');
    if (pledged > 25 && pledged <= 50) flags.push('Elevated promoter pledge (>25%)');

    // Decreasing promoter holding over 4 quarters
    const trend = this.getTrend(symbol, 4);
    if (trend.promoterTrend === 'decreasing') {
      flags.push('Promoter holding declining over last 4 quarters');
    }

    let riskLevel: PromoterRisk['riskLevel'] = 'low';
    if (pledged > 50 || promoterHolding < 10 || flags.length >= 3) {
      riskLevel = 'high';
    } else if (pledged > 25 || flags.length >= 2) {
      riskLevel = 'medium';
    }

    return {
      symbol: symbol.toUpperCase(),
      promoterHolding,
      pledgedPercentage: pledged,
      riskLevel,
      flags,
    };
  }

  query(filter: ShareholdingFilter = {}): ShareholdingPattern[] {
    let results: ShareholdingPattern[] = [];

    if (filter.symbols && filter.symbols.length > 0) {
      for (const sym of filter.symbols) {
        results.push(...this.getBySymbol(sym));
      }
    } else {
      results = Array.from(this.patterns.values());
    }

    if (filter.fromDate) results = results.filter(p => p.periodEndDate >= filter.fromDate!);
    if (filter.toDate) results = results.filter(p => p.periodEndDate <= filter.toDate!);

    if (filter.minPromoterHolding !== undefined || filter.maxPromoterHolding !== undefined) {
      results = results.filter(p => {
        const promoterPct = p.holdings
          .filter(h => h.category === 'promoter' || h.category === 'promoter_group')
          .reduce((sum, h) => sum + h.percentage, 0);
        if (filter.minPromoterHolding !== undefined && promoterPct < filter.minPromoterHolding) return false;
        if (filter.maxPromoterHolding !== undefined && promoterPct > filter.maxPromoterHolding) return false;
        return true;
      });
    }

    results.sort((a, b) => b.periodEndDate.localeCompare(a.periodEndDate));

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  getStats(): {
    totalPatterns: number;
    symbolsCovered: number;
    averagePromoterHolding: number;
    highPledgeSymbols: number;
  } {
    let totalPromoterHolding = 0;
    let countWithPromoter = 0;
    let highPledgeCount = 0;

    for (const sym of this.bySymbol.keys()) {
      const risk = this.getPromoterRisk(sym);
      totalPromoterHolding += risk.promoterHolding;
      countWithPromoter++;
      if ((this.getLatest(sym)?.promoterPledgedPercentage ?? 0) > 50) {
        highPledgeCount++;
      }
    }

    return {
      totalPatterns: this.patterns.size,
      symbolsCovered: this.bySymbol.size,
      averagePromoterHolding: countWithPromoter > 0
        ? Math.round((totalPromoterHolding / countWithPromoter) * 10) / 10
        : 0,
      highPledgeSymbols: highPledgeCount,
    };
  }
}

export const shareholdingRepository = new ShareholdingRepository();
