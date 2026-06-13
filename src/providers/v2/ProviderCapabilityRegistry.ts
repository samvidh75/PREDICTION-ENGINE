/**
 * ProviderCapabilityRegistry — TRACK-21 Phase 1 Task 1
 *
 * Declarative registry of which provider can supply which financial field.
 * Used by ProviderPriorityResolver and ProviderFailoverManager to make
 * field-level routing decisions at runtime.
 *
 * Each capability entry tracks:
 *   - field name (e.g., "peRatio")
 *   - provider name
 *   - reliability (0-1, estimated accuracy)
 *   - freshness category
 *   - whether authentication is required
 */

export interface ProviderCapability {
  field: string;
  provider: string;
  reliability: number;      // 0-1, estimated accuracy
  freshness: 'real-time' | 'daily' | 'quarterly' | 'unreliable';
  authRequired: boolean;
  costPerCall: number;      // estimated cost in USD
}

export interface CoverageScore {
  provider: string;
  fieldsCovered: number;
  totalFields: number;
  score: number;            // 0-100
}

export const ALL_FINANCIAL_FIELDS = [
  'peRatio',
  'pbRatio',
  'roe',
  'roa',
  'roic',
  'evEbitda',
  'debtToEquity',
  'marketCap',
  'eps',
  'dividendYield',
  'beta',
  'freeFloat',
  'fcfYield',
  'revenueGrowth',
  'profitGrowth',
  'epsGrowth',
  'fcfGrowth',
  'grossMargin',
  'operatingMargin',
  'currentRatio',
] as const;

export type FinancialField = typeof ALL_FINANCIAL_FIELDS[number];

/** Capability matrix defined in TRACK-20 Task 4 design. */
const DEFAULT_CAPABILITY_MATRIX: ProviderCapability[] = [
  // ─── UpstoxFundamentalsProvider ─────────────────────────
  { field: 'peRatio', provider: 'UpstoxFundamentalsProvider', reliability: 0.95, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'pbRatio', provider: 'UpstoxFundamentalsProvider', reliability: 0.95, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'roe', provider: 'UpstoxFundamentalsProvider', reliability: 0.95, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'roa', provider: 'UpstoxFundamentalsProvider', reliability: 0.90, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'roic', provider: 'UpstoxFundamentalsProvider', reliability: 0.90, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'evEbitda', provider: 'UpstoxFundamentalsProvider', reliability: 0.90, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'debtToEquity', provider: 'UpstoxFundamentalsProvider', reliability: 0.90, freshness: 'quarterly', authRequired: true, costPerCall: 0 },

  // ─── ScreenerProvider — QUARANTINED (F3 Phase 0) ────────
  // Screener.in HTML scraper is removed from all runtime capability routing.
  // Previously covered: revenueGrowth, profitGrowth, epsGrowth, fcfGrowth,
  // operatingMargin, currentRatio, dividendYield, marketCap.
  // These fields are now sourced from FinnhubProvider and DerivedMetricsEngine.

  // ─── FinnhubProvider ────────────────────────────────────
  { field: 'peRatio', provider: 'FinnhubProvider', reliability: 0.85, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'pbRatio', provider: 'FinnhubProvider', reliability: 0.85, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'roe', provider: 'FinnhubProvider', reliability: 0.85, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'roic', provider: 'FinnhubProvider', reliability: 0.80, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'evEbitda', provider: 'FinnhubProvider', reliability: 0.80, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'debtToEquity', provider: 'FinnhubProvider', reliability: 0.80, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'marketCap', provider: 'FinnhubProvider', reliability: 0.90, freshness: 'real-time', authRequired: true, costPerCall: 0 },
  { field: 'eps', provider: 'FinnhubProvider', reliability: 0.85, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'dividendYield', provider: 'FinnhubProvider', reliability: 0.80, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'beta', provider: 'FinnhubProvider', reliability: 0.85, freshness: 'daily', authRequired: true, costPerCall: 0 },
  { field: 'fcfYield', provider: 'FinnhubProvider', reliability: 0.75, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'revenueGrowth', provider: 'FinnhubProvider', reliability: 0.80, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'profitGrowth', provider: 'FinnhubProvider', reliability: 0.80, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'epsGrowth', provider: 'FinnhubProvider', reliability: 0.75, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'fcfGrowth', provider: 'FinnhubProvider', reliability: 0.75, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'grossMargin', provider: 'FinnhubProvider', reliability: 0.85, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'operatingMargin', provider: 'FinnhubProvider', reliability: 0.80, freshness: 'quarterly', authRequired: true, costPerCall: 0 },
  { field: 'currentRatio', provider: 'FinnhubProvider', reliability: 0.80, freshness: 'quarterly', authRequired: true, costPerCall: 0 },

  // ─── DerivedMetricsEngine (computed from raw statements) ──
  { field: 'roa', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'roic', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'debtToEquity', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'currentRatio', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'grossMargin', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'operatingMargin', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'revenueGrowth', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'profitGrowth', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'epsGrowth', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'fcfGrowth', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
  { field: 'fcfYield', provider: 'DerivedMetricsEngine', reliability: 0.80, freshness: 'quarterly', authRequired: false, costPerCall: 0 },
];

export class ProviderCapabilityRegistry {
  /** field → capability list */
  private capabilities: Map<string, ProviderCapability[]> = new Map();

  /** provider → metadata */
  private providerMeta: Map<string, {
    displayName: string;
    supportedUniverses: string[];
    rateLimitPerMin: number;
    rateLimitPerDay: number;
  }> = new Map();

  constructor(customCapabilities?: ProviderCapability[]) {
    const caps = customCapabilities ?? DEFAULT_CAPABILITY_MATRIX;
    for (const cap of caps) {
      this.register(cap);
    }
    this.initProviderMetadata();
  }

  /** Register a single capability. */
  register(capability: ProviderCapability): void {
    const existing = this.capabilities.get(capability.field) ?? [];
    // Avoid duplicates
    if (!existing.some(c => c.field === capability.field && c.provider === capability.provider)) {
      existing.push(capability);
    }
    this.capabilities.set(capability.field, existing);
  }

  /** Get all providers that can supply a given field. */
  getProvidersForField(field: string): ProviderCapability[] {
    return this.capabilities.get(field) ?? [];
  }

  /** Get all fields a given provider can supply. */
  getFieldsForProvider(provider: string): string[] {
    const fields: string[] = [];
    for (const [field, caps] of this.capabilities) {
      if (caps.some(c => c.provider === provider)) {
        fields.push(field);
      }
    }
    return fields;
  }

  /** Get the full capability matrix as field → provider names. */
  getCapabilityMatrix(): Map<string, string[]> {
    const matrix = new Map<string, string[]>();
    for (const [field, caps] of this.capabilities) {
      matrix.set(field, caps.map(c => c.provider));
    }
    return matrix;
  }

  /** Get all known provider names. */
  getAllProviderNames(): string[] {
    const names = new Set<string>();
    for (const caps of this.capabilities.values()) {
      for (const c of caps) {
        names.add(c.provider);
      }
    }
    return Array.from(names);
  }

  /** Compute coverage score for each provider. */
  getCoverageScores(): CoverageScore[] {
    const totalFields = ALL_FINANCIAL_FIELDS.length;
    const scores: CoverageScore[] = [];

    for (const provider of this.getAllProviderNames()) {
      const fields = this.getFieldsForProvider(provider);
      const coveredCount = fields.filter(f => ALL_FINANCIAL_FIELDS.includes(f as FinancialField)).length;
      scores.push({
        provider,
        fieldsCovered: coveredCount,
        totalFields,
        score: Math.round((coveredCount / totalFields) * 100),
      });
    }
    return scores.sort((a, b) => b.score - a.score);
  }

  /** Get fields NOT covered by any provider. */
  getUncoveredFields(): string[] {
    return ALL_FINANCIAL_FIELDS.filter(field => {
      const providers = this.capabilities.get(field);
      return !providers || providers.length === 0;
    });
  }

  /** Get provider metadata. */
  getProviderMetadata(provider: string) {
    return this.providerMeta.get(provider) ?? null;
  }

  /** Initialize provider metadata from design docs. */
  private initProviderMetadata(): void {
    this.providerMeta.set('FinnhubProvider', {
      displayName: 'Finnhub',
      supportedUniverses: ['NSE', 'BSE', 'US', 'Global'],
      rateLimitPerMin: 60,
      rateLimitPerDay: 500,
    });
    this.providerMeta.set('UpstoxFundamentalsProvider', {
      displayName: 'Upstox Fundamentals',
      supportedUniverses: ['NSE', 'BSE'],
      rateLimitPerMin: 20,
      rateLimitPerDay: 500,
    });
    // ScreenerProvider metadata removed (QUARANTINED — F3 Phase 0).
    this.providerMeta.set('DerivedMetricsEngine', {
      displayName: 'Derived Metrics Engine',
      supportedUniverses: ['NSE', 'BSE', 'US', 'Global'],
      rateLimitPerMin: Infinity,
      rateLimitPerDay: Infinity,
    });
    this.providerMeta.set('YahooProvider', {
      displayName: 'Yahoo Finance (Prices)',
      supportedUniverses: ['NSE', 'BSE', 'US', 'Global'],
      rateLimitPerMin: 30,
      rateLimitPerDay: 2000,
    });
  }
}

export default ProviderCapabilityRegistry;
