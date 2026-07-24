/**
 * Result Repository
 *
 * Stores quarterly results and computes YoY/QoQ comparisons.
 * All values are in PKR crores unless noted otherwise.
 */

import type {
  QuarterlyResult,
  ResultComparison,
  ResultFilter,
  ComparisonMetrics,
} from './ResultTypes';

export class ResultRepository {
  private results: Map<string, QuarterlyResult> = new Map();
  private bySymbol: Map<string, string[]> = new Map(); // symbol → sorted result IDs

  add(result: QuarterlyResult): void {
    this.results.set(result.id, result);

    const key = result.symbol.toUpperCase();
    const ids = this.bySymbol.get(key) ?? [];
    ids.push(result.id);
    // Keep sorted by periodEndDate descending
    ids.sort((a, b) => {
      const ra = this.results.get(a)!;
      const rb = this.results.get(b)!;
      return rb.periodEndDate.localeCompare(ra.periodEndDate);
    });
    this.bySymbol.set(key, ids);
  }

  addMany(results: QuarterlyResult[]): void {
    for (const r of results) this.add(r);
  }

  getById(id: string): QuarterlyResult | undefined {
    return this.results.get(id);
  }

  getBySymbol(symbol: string, filter?: ResultFilter): QuarterlyResult[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];

    let results = ids.map(id => this.results.get(id)!).filter(Boolean);

    if (filter?.fromPeriod) results = results.filter(r => r.period >= filter.fromPeriod!);
    if (filter?.toPeriod) results = results.filter(r => r.period <= filter.toPeriod!);
    if (filter?.resultType) results = results.filter(r => r.resultType === filter.resultType);
    if (filter?.frequency) results = results.filter(r => r.frequency === filter.frequency);

    return results;
  }

  getLatest(symbol: string, resultType?: string): QuarterlyResult | undefined {
    const results = this.getBySymbol(symbol);
    if (resultType) return results.find(r => r.resultType === resultType);
    return results[0];
  }

  getComparison(symbol: string, period: string): ResultComparison | null {
    const results = this.getBySymbol(symbol);
    const current = results.find(r => r.period === period);
    if (!current) return null;

    const periodDate = new Date(current.periodEndDate);
    const prevQuarterDate = new Date(periodDate);
    prevQuarterDate.setMonth(prevQuarterDate.getMonth() - 3);
    const prevQuarterPeriod = this.formatPeriod(prevQuarterDate);

    const prevYearDate = new Date(periodDate);
    prevYearDate.setFullYear(prevYearDate.getFullYear() - 1);
    const prevYearPeriod = this.formatPeriod(prevYearDate);

    const previousQuarter = results.find(r => r.period === prevQuarterPeriod) ?? null;
    const sameQuarterLastYear = results.find(r => r.period === prevYearPeriod) ?? null;

    const metrics: ComparisonMetrics = {
      revenueQoQ: this.pctChange(current.totalRevenue, previousQuarter?.totalRevenue),
      revenueYoY: this.pctChange(current.totalRevenue, sameQuarterLastYear?.totalRevenue),
      netProfitQoQ: this.pctChange(current.netProfit, previousQuarter?.netProfit),
      netProfitYoY: this.pctChange(current.netProfit, sameQuarterLastYear?.netProfit),
      ebitdaMarginChangeQoQ: this.bpsChange(current.ebitdaMargin, previousQuarter?.ebitdaMargin),
      ebitdaMarginChangeYoY: this.bpsChange(current.ebitdaMargin, sameQuarterLastYear?.ebitdaMargin),
      epsQoQ: this.pctChange(current.eps, previousQuarter?.eps),
      epsYoY: this.pctChange(current.eps, sameQuarterLastYear?.eps),
    };

    return { current, previousQuarter, sameQuarterLastYear, metrics };
  }

  private pctChange(current: number | null, previous: number | null | undefined): number | null {
    if (current === null || previous === null || previous === undefined || previous === 0) return null;
    return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
  }

  private bpsChange(current: number | null, previous: number | null | undefined): number | null {
    if (current === null || previous === null || previous === undefined) return null;
    return Math.round((current - previous) * 100);
  }

  private formatPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return `${year}Q${quarter}`;
  }

  query(filter: ResultFilter = {}): QuarterlyResult[] {
    let allResults: QuarterlyResult[] = [];

    if (filter.symbols && filter.symbols.length > 0) {
      for (const sym of filter.symbols) {
        allResults.push(...this.getBySymbol(sym));
      }
    } else {
      allResults = Array.from(this.results.values());
    }

    if (filter.fromPeriod) allResults = allResults.filter(r => r.period >= filter.fromPeriod!);
    if (filter.toPeriod) allResults = allResults.filter(r => r.period <= filter.toPeriod!);
    if (filter.fromDate) allResults = allResults.filter(r => r.filingDate >= filter.fromDate!);
    if (filter.toDate) allResults = allResults.filter(r => r.filingDate <= filter.toDate!);
    if (filter.resultType) allResults = allResults.filter(r => r.resultType === filter.resultType);
    if (filter.frequency) allResults = allResults.filter(r => r.frequency === filter.frequency);

    allResults.sort((a, b) => b.filingDate.localeCompare(a.filingDate));

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? allResults.length;
    return allResults.slice(offset, offset + limit);
  }

  getStats(): {
    totalResults: number;
    symbolsCovered: number;
    consolidatedResults: number;
    standaloneResults: number;
    auditedResults: number;
    withSegments: number;
    latestPeriod: string | null;
  } {
    let consolidated = 0;
    let standalone = 0;
    let audited = 0;
    let withSegments = 0;
    let latestPeriod: string | null = null;

    for (const r of this.results.values()) {
      if (r.resultType === 'consolidated') consolidated++;
      if (r.resultType === 'standalone') standalone++;
      if (r.audited) audited++;
      if (r.segments.length > 0) withSegments++;
      if (!latestPeriod || r.periodEndDate > latestPeriod) latestPeriod = r.periodEndDate;
    }

    return {
      totalResults: this.results.size,
      symbolsCovered: this.bySymbol.size,
      consolidatedResults: consolidated,
      standaloneResults: standalone,
      auditedResults: audited,
      withSegments,
      latestPeriod,
    };
  }
}

export const resultRepository = new ResultRepository();
