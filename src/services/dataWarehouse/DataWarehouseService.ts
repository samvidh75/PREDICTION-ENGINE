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

export class DataWarehouseService {
  private metrics: DataWarehouseMetric[] = [
    { name: 'revenue', expression: 'SUM(revenue)', description: 'Total revenue', dataType: 'currency' },
    { name: 'profit', expression: 'SUM(profit)', description: 'Net profit', dataType: 'currency' },
    { name: 'market_cap', expression: 'AVG(market_cap)', description: 'Market capitalization', dataType: 'currency' },
    { name: 'pe_ratio', expression: 'AVG(pe_ratio)', description: 'Price-to-earnings ratio', dataType: 'ratio' },
    { name: 'roe', expression: 'AVG(roe)', description: 'Return on equity', dataType: 'percentage' },
    { name: 'debt_to_equity', expression: 'AVG(debt_to_equity)', description: 'Debt-to-equity ratio', dataType: 'ratio' },
    { name: 'revenue_growth', expression: 'AVG(revenue_growth)', description: 'Revenue growth rate', dataType: 'percentage' },
    { name: 'profit_growth', expression: 'AVG(profit_growth)', description: 'Profit growth rate', dataType: 'percentage' },
    { name: 'volume', expression: 'SUM(volume)', description: 'Trading volume', dataType: 'number' },
    { name: 'volatility', expression: 'AVG(volatility)', description: 'Price volatility', dataType: 'percentage' },
  ];

  private dimensions: DataWarehouseDimension[] = [
    { name: 'sector', description: 'Industry sector classification', cardinality: 'low' },
    { name: 'symbol', description: 'Stock ticker symbol', cardinality: 'high' },
    { name: 'trade_date', description: 'Trading date', cardinality: 'high' },
    { name: 'market_cap_category', description: 'Large/Mid/Small cap', cardinality: 'low' },
    { name: 'pe_category', description: 'PE ratio bucket', cardinality: 'low' },
    { name: 'listing_status', description: 'Active/Delisted status', cardinality: 'low' },
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

    const mockData = this.generateMockData(query);
    const filtered = this.applyFilters(mockData, query.filters ?? []);
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
      measures: ['market_cap', 'pe_ratio', 'roe', 'revenue_growth', 'debt_to_equity'],
      dimensions: ['symbol', 'sector'],
      filters,
      sortBy,
      sortOrder: 'desc',
      limit: limit ?? 50,
    });
  }

  saveScreener(name: string, query: OLAPQuery): string {
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

  private generateMockData(_query: OLAPQuery): Record<string, unknown>[] {
    const sectors = ['Technology', 'Finance', 'Healthcare', 'Energy', 'Consumer', 'Industrial'];
    const data: Record<string, unknown>[] = [];
    for (let i = 0; i < 100; i++) {
      data.push({
        symbol: `STOCK${i}`,
        sector: sectors[i % sectors.length],
        market_cap: 1000 + Math.random() * 500000,
        pe_ratio: 5 + Math.random() * 50,
        roe: -10 + Math.random() * 40,
        revenue_growth: -20 + Math.random() * 60,
        debt_to_equity: Math.random() * 3,
        profit: Math.random() * 10000,
        revenue: Math.random() * 50000,
        volume: Math.floor(Math.random() * 10000000),
        volatility: 10 + Math.random() * 40,
      });
    }
    return data;
  }
}

export const dataWarehouseService = new DataWarehouseService();
