/**
 * Data Source Registry
 *
 * Central registry of all data sources used by Lensory.
 * Every ingested data point must trace back to a source declared here.
 * No source is added without explicit review.
 */

import type { DataSource, DataDomain } from './DataSourceTypes';

export class DataSourceRegistry {
  private sources: Map<string, DataSource> = new Map();

  constructor() {
    this.registerBuiltInSources();
  }

  private registerBuiltInSources(): void {
    const builtIn: DataSource[] = [
      {
        id: 'pse-official',
        name: 'PSE Trading Portal',
        kind: 'exchange',
        status: 'active',
        domains: ['universe', 'identity', 'price', 'corporate_actions', 'index_membership'],
        description: 'Philippine Stock Exchange — official trading data feed',
        homepage: 'https://www.pse.com.ph',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'phisix-api',
        name: 'Phisix API',
        kind: 'provider_api',
        status: 'active',
        domains: ['price'],
        description: 'Community mirror of PSE live ticker data',
        homepage: 'https://phisix-api3.appspot.com',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'edge-pse',
        name: 'PSE EDGE',
        kind: 'provider_web',
        status: 'active',
        domains: ['financials', 'results', 'corporate_actions', 'disclosures'],
        description: 'PSE EDGE — official disclosure and financial reports portal',
        requiresAuth: true,
        rateLimit: 'Per-plan limits',
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'col-financial',
        name: 'COL Financial',
        kind: 'provider_api',
        status: 'active',
        domains: ['research', 'fundamentals'],
        description: 'COL Financial research and market data',
        homepage: 'https://www.colfinancial.com',
        requiresAuth: true,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'first-metro-sec',
        name: 'First Metro Securities',
        kind: 'provider_web',
        status: 'active',
        domains: ['research', 'market_reports'],
        description: 'First Metro Securities — research reports and market analysis',
        homepage: 'https://www.firstmetrosec.com.ph',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'bdo-sec',
        name: 'BDO Securities',
        kind: 'provider_web',
        status: 'active',
        domains: ['research', 'market_reports'],
        description: 'BDO Securities — investment research',
        homepage: 'https://www.bdosecurities.com.ph',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'pse-news',
        name: 'PSE News & Disclosures',
        kind: 'news',
        status: 'active',
        domains: ['news', 'announcements'],
        description: 'Official PSE news and corporate disclosure feed',
        homepage: 'https://www.pse.com.ph',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'sec-ph-regulator',
        name: 'SEC Philippines',
        kind: 'regulator',
        status: 'active',
        domains: ['filings', 'regulatory'],
        description: 'Securities and Exchange Commission (Philippines) — corporate filings and regulatory disclosures',
        homepage: 'https://www.sec.gov.ph',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'yahoo-finance',
        name: 'Yahoo Finance',
        kind: 'provider_api',
        status: 'probe',
        domains: ['price', 'financials', 'identity'],
        description: 'Global financial data via yfinance or public API',
        homepage: 'https://finance.yahoo.com',
        requiresAuth: false,
        coverageScope: 'global',
        lastVerified: null,
      },
      {
        id: 'db-stocks-table',
        name: 'Internal DB — Stocks Table',
        kind: 'public_db',
        status: 'active',
        domains: ['universe', 'identity'],
        description: 'Existing stocks table in application DB',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'healthometer',
        name: 'Healthometer',
        kind: 'provider_web',
        status: 'probe',
        domains: ['financials'],
        description: 'Financial health scoring service',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'stock-universe-bundle',
        name: 'Stock Universe Bundle',
        kind: 'manual_upload',
        status: 'active',
        domains: ['universe', 'identity', 'sector'],
        description: 'Curated stock universe snapshot (stock-universe.json) — symbols, sectors, market caps',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
      {
        id: 'daily-prices',
        name: 'Daily Prices (SQLite)',
        kind: 'provider_db',
        status: 'active',
        domains: ['price'],
        description: 'Daily OHLCV price data from the local stockstory.db daily_prices table — populated during ingestion',
        requiresAuth: false,
        coverageScope: 'philippines',
        lastVerified: null,
      },
    ];

    for (const source of builtIn) {
      this.sources.set(source.id, source);
    }
  }

  get(id: string): DataSource | undefined {
    return this.sources.get(id);
  }

  getAll(): DataSource[] {
    return Array.from(this.sources.values());
  }

  getActive(): DataSource[] {
    return this.getAll().filter((s) => s.status === 'active');
  }

  getByDomain(domain: DataDomain): DataSource[] {
    return this.getAll().filter((s) => s.domains.includes(domain));
  }

  getStatusSummary(): { total: number; active: number; probe: number; disabled: number; deprecated: number } {
    const all = this.getAll();
    return {
      total: all.length,
      active: all.filter((s) => s.status === 'active').length,
      probe: all.filter((s) => s.status === 'probe').length,
      disabled: all.filter((s) => s.status === 'disabled').length,
      deprecated: all.filter((s) => s.status === 'deprecated').length,
    };
  }

  /** Add or update a source. Returns true if new. */
  register(source: DataSource): boolean {
    const isNew = !this.sources.has(source.id);
    this.sources.set(source.id, source);
    return isNew;
  }

  disable(id: string, reason?: string): void {
    const source = this.sources.get(id);
    if (source) {
      source.status = 'disabled';
      source.notes = reason ? `${source.notes ?? ''} [Disabled: ${reason}]`.trim() : source.notes;
    }
  }
}

export const dataSourceRegistry = new DataSourceRegistry();
