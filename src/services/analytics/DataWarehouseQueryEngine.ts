// Screener / analytics query engine over the star-schema warehouse.
// Builds parameterized filters, executes against a pluggable query runner
// (Supabase in production, in-memory for tests), and caches hot queries.

export interface ScreenerCriterion {
  field: ScreenerField;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'in';
  value: number | string | Array<number | string>;
}

export type ScreenerField =
  | 'close_price'
  | 'volume'
  | 'pe_ratio'
  | 'pb_ratio'
  | 'roe'
  | 'debt_to_equity'
  | 'market_cap'
  | 'conviction_score'
  | 'sector'
  | 'dividend_yield'
  | 'revenue_growth'
  | 'eps_growth';

export interface ScreenerQuery {
  criteria: ScreenerCriterion[];
  logic?: 'and' | 'or'; // default 'and'
  sortBy?: ScreenerField;
  sortDir?: 'asc' | 'desc';
  limit?: number; // default 100, max 1000
}

export interface ScreenerRow {
  symbol: string;
  [field: string]: number | string;
}

export interface ScreenerResult {
  rows: ScreenerRow[];
  totalMatches: number;
  fromCache: boolean;
  queryTimeMs: number;
}

/** Abstraction over the actual data store so the engine is unit-testable. */
export interface WarehouseRunner {
  run(query: ScreenerQuery): Promise<{ rows: ScreenerRow[]; totalMatches: number }>;
}

const VALID_FIELDS = new Set<ScreenerField>([
  'close_price', 'volume', 'pe_ratio', 'pb_ratio', 'roe', 'debt_to_equity',
  'market_cap', 'conviction_score', 'sector', 'dividend_yield', 'revenue_growth', 'eps_growth',
]);
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_LIMIT = 1000;

export class DataWarehouseQueryEngine {
  private cache = new Map<string, { result: ScreenerResult; expiresAt: number }>();

  constructor(private readonly runner: WarehouseRunner) {}

  async execute(query: ScreenerQuery): Promise<ScreenerResult> {
    this.validateQuery(query);
    const key = this.cacheKey(query);
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return { ...cached.result, fromCache: true };
    }

    const start = Date.now();
    const { rows, totalMatches } = await this.runner.run(this.normalize(query));
    const result: ScreenerResult = {
      rows,
      totalMatches,
      fromCache: false,
      queryTimeMs: Date.now() - start,
    };
    this.cache.set(key, { result, expiresAt: now + CACHE_TTL_MS });
    return result;
  }

  invalidateCache(): void {
    this.cache.clear();
  }

  /** Apply a screener query to an in-memory row set (used by InMemoryRunner and previews). */
  static applyCriteria(rows: ScreenerRow[], query: ScreenerQuery): ScreenerRow[] {
    const logic = query.logic ?? 'and';
    const matches = rows.filter(row => {
      const results = query.criteria.map(c => DataWarehouseQueryEngine.matchCriterion(row, c));
      return logic === 'and' ? results.every(Boolean) : results.some(Boolean);
    });

    if (query.sortBy) {
      const dir = query.sortDir === 'asc' ? 1 : -1;
      const field = query.sortBy;
      matches.sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    return matches.slice(0, Math.min(query.limit ?? 100, MAX_LIMIT));
  }

  private static matchCriterion(row: ScreenerRow, c: ScreenerCriterion): boolean {
    const actual = row[c.field];
    if (actual === undefined || actual === null) return false;
    switch (c.operator) {
      case 'gt': return typeof actual === 'number' && actual > (c.value as number);
      case 'gte': return typeof actual === 'number' && actual >= (c.value as number);
      case 'lt': return typeof actual === 'number' && actual < (c.value as number);
      case 'lte': return typeof actual === 'number' && actual <= (c.value as number);
      case 'eq': return actual === c.value;
      case 'neq': return actual !== c.value;
      case 'in': return Array.isArray(c.value) && c.value.includes(actual);
    }
  }

  private validateQuery(query: ScreenerQuery): void {
    if (!Array.isArray(query.criteria) || query.criteria.length === 0) {
      throw new Error('DataWarehouseQueryEngine: query must contain at least one criterion');
    }
    if (query.criteria.length > 20) {
      throw new Error('DataWarehouseQueryEngine: too many criteria (max 20)');
    }
    for (const c of query.criteria) {
      if (!VALID_FIELDS.has(c.field)) {
        throw new Error(`DataWarehouseQueryEngine: unknown field "${c.field}"`);
      }
      if (c.operator === 'in' && !Array.isArray(c.value)) {
        throw new Error('DataWarehouseQueryEngine: "in" operator requires an array value');
      }
      if (['gt', 'gte', 'lt', 'lte'].includes(c.operator) && typeof c.value !== 'number') {
        throw new Error(`DataWarehouseQueryEngine: "${c.operator}" requires a numeric value`);
      }
    }
    if (query.sortBy && !VALID_FIELDS.has(query.sortBy)) {
      throw new Error(`DataWarehouseQueryEngine: unknown sort field "${query.sortBy}"`);
    }
    if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1)) {
      throw new Error('DataWarehouseQueryEngine: limit must be a positive integer');
    }
  }

  private normalize(query: ScreenerQuery): ScreenerQuery {
    return {
      ...query,
      logic: query.logic ?? 'and',
      limit: Math.min(query.limit ?? 100, MAX_LIMIT),
    };
  }

  private cacheKey(query: ScreenerQuery): string {
    return JSON.stringify(this.normalize(query));
  }
}

/** In-memory runner for tests and offline/preview mode. */
export class InMemoryWarehouseRunner implements WarehouseRunner {
  constructor(private readonly rows: ScreenerRow[]) {}

  async run(query: ScreenerQuery): Promise<{ rows: ScreenerRow[]; totalMatches: number }> {
    const unlimited = DataWarehouseQueryEngine.applyCriteria(this.rows, { ...query, limit: MAX_LIMIT });
    const limited = unlimited.slice(0, query.limit ?? 100);
    return { rows: limited, totalMatches: unlimited.length };
  }
}
