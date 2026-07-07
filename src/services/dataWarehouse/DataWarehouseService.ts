import { getStockUniverseAdapter } from '../data/providers/StockUniverseAdapter.js';

export interface OLAPQuery {
  measures: string[];
  dimensions: string[];
  filters?: Array<{ dimension: string; operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in'; value: unknown }>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  groupBy?: string[];
}

export interface OLAPResult {
  columns: string[];
  rows: Record<string, unknown>[][];
  totalRows: number;
  queryTimeMs: number;
}

export interface DataWarehouseMetric {
  name: string;
  expression: string;
  description: string;
  dataType: 'number' | 'percentage' | 'ratio' | 'currency';
}

export interface DataWarehouseDimension {
  name: string;
  description: string;
  cardinality: 'high' | 'medium' | 'low';
}

export interface MaterializedView {
  name: string;
  query: string;
  refreshInterval: string;
  lastRefreshed: string | null;
}

// Previously this service backed every query with generateMockData(), which
// fabricated 100 stocks using Math.random() for P/E, ROE, revenue growth,
// debt-to-equity, profit, revenue and volatility — meaning the live
// /api/analytics/* and /api/screener/* endpoints served entirely fake
// numbers. Real per-symbol fundamentals (P/E, ROE, debt/equity, etc.) exist
// in FinancialEngine but only as an expensive per-symbol call — there is no
// bulk fundamentals dataset to screen 8,18 stocks against. What *is* real
// and bulk-available is the bundled stock-universe.json (StockUniverseAdapter):
// real symbol/sector/market-cap for ~8,500 PSE/PSE names, plus 0-100 factor
// scores (quality, valuation, growth, momentum, risk, health) computed from
// real fundamentals+price data at generation time. The metric/dimension
// catalog below reflects only what is actually real and queryable now.
export class DataWarehouseService {
  private metrics: DataWarehouseMetric[] = [
    { name: 'market_cap', expression: 'market_cap', description: 'Market capitalization (₹ crore)', dataType: 'currency' },
    { name: 'quality_score', expression: 'quality_score', description: 'Quality factor score (0-100)', dataType: 'number' },
    { name: 'valuation_score', expression: 'valuation_score', description: 'Valuation factor score (0-100, higher = cheaper)', dataType: 'number' },
    { name: 'growth_score', expression: 'growth_score', description: 'Growth factor score (0-100)', dataType: 'number' },
    { name: 'momentum_score', expression: 'momentum_score', description: 'Price momentum factor score (0-100)', dataType: 'number' },
    { name: 'risk_score', expression: 'risk_score', description: 'Risk factor score (0-100, higher = riskier)', dataType: 'number' },
    { name: 'health_score', expression: 'health_score', description: 'Financial health factor score (0-100)', dataType: 'number' },
    { name: 'risk_adjusted_score', expression: 'risk_adjusted_score', description: 'Risk-adjusted composite score (0-100)', dataType: 'number' },
  ];

  private dimensions: DataWarehouseDimension[] = [
    { name: 'sector', description: 'Industry sector classification', cardinality: 'low' },
    { name: 'symbol', description: 'Stock ticker symbol', cardinality: 'high' },
    { name: 'exchange', description: 'PSE or PSE', cardinality: 'low' },
    { name: 'market_cap_category', description: 'Large/Mid/Small/Micro cap', cardinality: 'low' },
  ];

  private views: MaterializedView[] = [
    {
      name: 'mv_stock_averages',
      query: 'SELECT symbol, AVG(adjusted_close) as avg_price_52w, MAX(adjusted_close) as high_52w, MIN(adjusted_close) as low_52w FROM daily_prices WHERE trade_date >= NOW() - INTERVAL \'1 year\' GROUP BY symbol',
      refreshInterval: 'daily',
      lastRefreshed: null,
    },
    {
      name: 'mv_sector_performance',
      query: 'SELECT sector, AVG(factor_score) as avg_score, COUNT(*) as company_count FROM factor_snapshots fs JOIN master_security_registry msr ON fs.symbol = msr.symbol GROUP BY sector',
      refreshInterval: 'daily',
      lastRefreshed: null,
    },
    {
      name: 'mv_efficient_frontier',
      query: 'SELECT * FROM cached_efficient_frontier ORDER BY volatility ASC',
      refreshInterval: 'hourly',
      lastRefreshed: null,
    },
  ];

  getAvailableMetrics(): DataWarehouseMetric[] {
    return [...this.metrics];
  }

  getAvailableDimensions(): DataWarehouseDimension[] {
    return [...this.dimensions];
  }

  getMaterializedViews(): MaterializedView[] {
    return [...this.views];
  }

  executeQuery(query: OLAPQuery): OLAPResult {
    const startTime = performance.now();

    const rows = this.loadUniverseRows();
    const filtered = this.applyFilters(rows, query.filters ?? []);
    const sorted = this.applySorting(filtered, query.sortBy, query.sortOrder);
    const limited = sorted.slice(0, query.limit ?? 100);
    const grouped: Record<string, unknown>[][] = query.groupBy
      ? this.applyGrouping(limited, query.groupBy, query.measures)
      : limited.map(r => [r]);

    const elapsed = performance.now() - startTime;

    return {
      columns: [...(query.groupBy ?? []), ...query.measures],
      rows: grouped,
      totalRows: grouped.length,
      queryTimeMs: Math.round(elapsed),
    };
  }

  runScreener(filters: OLAPQuery['filters'], sortBy?: string, limit?: number): OLAPResult {
    return this.executeQuery({
      measures: ['market_cap', 'quality_score', 'valuation_score', 'growth_score', 'risk_adjusted_score'],
      dimensions: ['symbol', 'sector'],
      filters,
      sortBy,
      sortOrder: 'desc',
      limit: limit ?? 50,
    });
  }

  saveScreener(name: string, _query: OLAPQuery): string {
    return `${name}_${Date.now()}`;
  }

  private applyFilters(
    data: Record<string, unknown>[],
    filters: OLAPQuery['filters'],
  ): Record<string, unknown>[] {
    if (!filters || filters.length === 0) return data;
    return data.filter(row => {
      return filters.every(f => {
        const val = row[f.dimension];
        switch (f.operator) {
          case 'eq': return val === f.value;
          case 'gt': return typeof val === 'number' && typeof f.value === 'number' && val > f.value;
          case 'lt': return typeof val === 'number' && typeof f.value === 'number' && val < f.value;
          case 'gte': return typeof val === 'number' && typeof f.value === 'number' && val >= f.value;
          case 'lte': return typeof val === 'number' && typeof f.value === 'number' && val <= f.value;
          case 'in': return Array.isArray(f.value) && f.value.includes(val);
          case 'between': return Array.isArray(f.value) && f.value.length === 2 &&
            typeof val === 'number' && val >= f.value[0] && val <= f.value[1];
          default: return true;
        }
      });
    });
  }

  private applySorting(
    data: Record<string, unknown>[],
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Record<string, unknown>[] {
    if (!sortBy) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortBy] as number;
      const bVal = b[sortBy] as number;
      const direction = sortOrder === 'asc' ? 1 : -1;
      return (aVal - bVal) * direction;
    });
  }

  private applyGrouping(
    data: Record<string, unknown>[],
    groupBy: string[],
    measures: string[],
  ): Record<string, unknown>[][] {
    if (!groupBy.length) return data.map(r => [r]);
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of data) {
      const key = groupBy.map(g => row[g]).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    const result: Record<string, unknown>[][] = [];
    for (const [, group] of groups) {
      const aggregated: Record<string, unknown> = {};
      for (const g of groupBy) aggregated[g] = group[0][g];
      for (const m of measures) {
        const values = group.map(r => r[m] as number).filter(v => typeof v === 'number');
        aggregated[m] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      }
      result.push([aggregated]);
    }
    return result;
  }

  private universeRowsCache: Record<string, unknown>[] | null = null;

  /**
   * Loads the real bundled stock universe (~8,500 PSE/PSE names) and flattens
   * each entry's factor scores into queryable columns. Cached in memory since
   * StockUniverseAdapter itself only reloads the underlying file on demand.
   */
  private loadUniverseRows(): Record<string, unknown>[] {
    if (this.universeRowsCache) return this.universeRowsCache;

    const entries = getStockUniverseAdapter().getAllEntries();
    this.universeRowsCache = entries.map(entry => ({
      symbol: entry.symbol,
      sector: entry.sector ?? 'Unknown',
      exchange: entry.exchange ?? 'UNKNOWN',
      market_cap_category: entry.marketCapCategory ?? 'Unknown',
      market_cap: entry.marketCap ?? 0,
      quality_score: entry.scores?.quality ?? null,
      valuation_score: entry.scores?.valuation ?? null,
      growth_score: entry.scores?.growth ?? null,
      momentum_score: entry.scores?.momentum ?? null,
      risk_score: entry.scores?.risk ?? null,
      health_score: entry.scores?.health ?? null,
      risk_adjusted_score: entry.scores?.riskAdjusted ?? null,
    }));
    return this.universeRowsCache;
  }

  /** Force a reload from disk on the next query (e.g. after the universe file is refreshed). */
  invalidateCache(): void {
    this.universeRowsCache = null;
  }
}

export const dataWarehouseService = new DataWarehouseService();
