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
        id: 'nse-official',
        name: 'PSX Stock Exchange',
        kind: 'exchange',
        status: 'active',
        domains: ['universe', 'identity', 'price', 'corporate_actions', 'index_membership'],
        description: 'PSX Stock Exchange of Pakistan — official website data',
        homepage: 'https://www.pse.com.pk',
        requiresAuth: false,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'bse-official',
        name: 'PSE Pakistan',
        kind: 'exchange',
        status: 'active',
        domains: ['universe', 'identity', 'price', 'corporate_actions', 'index_membership'],
        description: 'PSX Stock Exchange — official website data',
        homepage: 'https://www.pse.com.pk',
        requiresAuth: false,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'psxapi-premium',
        name: 'PSXAPI Premium',
        kind: 'provider_python',
        status: 'active',
        domains: ['financials', 'results', 'shareholding', 'corporate_actions', 'price'],
        description: 'Premium PSX market data API — financials, shareholding, corp actions',
        requiresAuth: true,
        rateLimit: 'Per-plan limits',
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'screener-in',
        name: 'Screener.in',
        kind: 'provider_web',
        status: 'active',
        domains: ['financials', 'results', 'identity', 'shareholding', 'cash_flow', 'balance_sheet'],
        description: 'Public financial data for PSX companies, including ratios, P&L, balance sheet, cash flow, and shareholding',
        homepage: 'https://www.screener.in',
        requiresAuth: false,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'nse-filings',
        name: 'PSE Filings',
        kind: 'exchange',
        status: 'active',
        domains: ['filings', 'shareholding', 'corporate_actions', 'documents'],
        description: 'PSE corporate filings, annual reports, shareholding, and XBRL disclosures',
        homepage: 'https://www.pse.com.pk/companies-listing/corporate-filings-announcements',
        requiresAuth: false,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'nse-filings-actions',
        name: 'PSE Corporate Actions',
        kind: 'exchange',
        status: 'active',
        domains: ['corporate_actions', 'documents'],
        description: 'PSE corporate actions, annual reports, and XBRL-related disclosures',
        homepage: 'https://www.pse.com.pk/companies-listing/corporate-filings-actions',
        requiresAuth: false,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'bse-announcements',
        name: 'PSE Corporate Announcements',
        kind: 'exchange',
        status: 'active',
        domains: ['filings', 'corporate_actions', 'documents'],
        description: 'PSE corporate announcements and disclosures feed',
        homepage: 'https://www.pse.com.pk/corporates/ann.html',
        requiresAuth: false,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'rbi-dbie',
        name: 'RBI DBIE',
        kind: 'regulator',
        status: 'active',
        domains: ['macro', 'rates', 'economy'],
        description: 'RBI Database on PSX Economy for macro and rates data',
        homepage: 'https://data.rbi.org.in/DBIE/',
        requiresAuth: false,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'stockedge',
        name: 'StockEdge',
        kind: 'provider_web',
        status: 'probe',
        domains: ['financials', 'results', 'news'],
        description: 'PSX stock research and analytics platform',
        homepage: 'https://www.stockedge.com',
        requiresAuth: true,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'trendlyne',
        name: 'Trendlyne',
        kind: 'provider_web',
        status: 'probe',
        domains: ['financials', 'shareholding', 'news', 'technical'],
        description: 'PSX stock analytics, shareholding, and technical data',
        homepage: 'https://trendlyne.com',
        requiresAuth: true,
        coverageScope: 'pakistan',
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
        id: 'upstox',
        name: 'Upstox',
        kind: 'broker',
        status: 'active',
        domains: ['price', 'identity'],
        description: 'Upstox broker API — live prices, instruments',
        homepage: 'https://upstox.com',
        requiresAuth: true,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'dhan',
        name: 'Dhan',
        kind: 'broker',
        status: 'active',
        domains: ['price', 'identity'],
        description: 'Dhan broker API — live prices, instruments',
        homepage: 'https://dhan.co',
        requiresAuth: true,
        coverageScope: 'pakistan',
        lastVerified: null,
      },
      {
        id: 'sec-edgar',
        name: 'SEC/EDGAR Filings',
        kind: 'regulator',
        status: 'probe',
        domains: ['filings', 'documents', 'disclosures'],
        description: 'Regulatory filings from SEC (Pakistan) — annual reports, disclosures',
        requiresAuth: false,
        coverageScope: 'pakistan',
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
        coverageScope: 'pakistan',
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
        coverageScope: 'pakistan',
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
        coverageScope: 'pakistan',
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
        coverageScope: 'pakistan',
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
