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
        name: 'NSE India',
        kind: 'exchange',
        status: 'active',
        domains: ['universe', 'identity', 'price', 'corporate_actions', 'index_membership'],
        description: 'National Stock Exchange of India — official website data',
        homepage: 'https://www.nseindia.com',
        requiresAuth: false,
        coverageScope: 'india',
        lastVerified: null,
      },
      {
        id: 'bse-official',
        name: 'BSE India',
        kind: 'exchange',
        status: 'active',
        domains: ['universe', 'identity', 'price', 'corporate_actions', 'index_membership'],
        description: 'Bombay Stock Exchange — official website data',
        homepage: 'https://www.bseindia.com',
        requiresAuth: false,
        coverageScope: 'india',
        lastVerified: null,
      },
      {
        id: 'indianapi-premium',
        name: 'IndianAPI Premium',
        kind: 'provider_python',
        status: 'active',
        domains: ['financials', 'results', 'shareholding', 'corporate_actions', 'price'],
        description: 'Premium Indian market data API — financials, shareholding, corp actions',
        requiresAuth: true,
        rateLimit: 'Per-plan limits',
        coverageScope: 'india',
        lastVerified: null,
      },
      {
        id: 'screener-in',
        name: 'Screener.in',
        kind: 'provider_web',
        status: 'active',
        domains: ['financials', 'results', 'identity'],
        description: 'Public financial data for Indian companies',
        homepage: 'https://www.screener.in',
        requiresAuth: false,
        coverageScope: 'india',
        lastVerified: null,
      },
      {
        id: 'stockedge',
        name: 'StockEdge',
        kind: 'provider_web',
        status: 'probe',
        domains: ['financials', 'results', 'news'],
        description: 'Indian stock research and analytics platform',
        homepage: 'https://www.stockedge.com',
        requiresAuth: true,
        coverageScope: 'india',
        lastVerified: null,
      },
      {
        id: 'trendlyne',
        name: 'Trendlyne',
        kind: 'provider_web',
        status: 'probe',
        domains: ['financials', 'shareholding', 'news', 'technical'],
        description: 'Indian stock analytics, shareholding, and technical data',
        homepage: 'https://trendlyne.com',
        requiresAuth: true,
        coverageScope: 'india',
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
        coverageScope: 'india',
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
        coverageScope: 'india',
        lastVerified: null,
      },
      {
        id: 'sebi-edgar',
        name: 'SEBI/EDGAR Filings',
        kind: 'regulator',
        status: 'probe',
        domains: ['filings', 'documents', 'disclosures'],
        description: 'Regulatory filings from SEBI (India) — annual reports, disclosures',
        requiresAuth: false,
        coverageScope: 'india',
        lastVerified: null,
      },
      {
        id: 'bse-corp-announcements',
        name: 'BSE Corporate Announcements',
        kind: 'exchange',
        status: 'active',
        domains: ['filings', 'corporate_actions'],
        description: 'BSE corporate announcements and filings feed',
        homepage: 'https://www.bseindia.com/corporates/ann.html',
        requiresAuth: false,
        coverageScope: 'india',
        lastVerified: null,
      },
      {
        id: 'nse-corp-announcements',
        name: 'NSE Corporate Announcements',
        kind: 'exchange',
        status: 'active',
        domains: ['filings', 'corporate_actions'],
        description: 'NSE corporate announcements feed',
        homepage: 'https://www.nseindia.com/companies-listing/corporate-filings-announcements',
        requiresAuth: false,
        coverageScope: 'india',
        lastVerified: null,
      },
      {
        id: 'nsepy',
        name: 'nsepy/nselib',
        kind: 'provider_python',
        status: 'probe',
        domains: ['price', 'corporate_actions', 'index_membership'],
        description: 'Python libraries for NSE data extraction',
        requiresAuth: false,
        coverageScope: 'india',
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
        coverageScope: 'india',
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
        coverageScope: 'india',
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
        coverageScope: 'india',
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
        coverageScope: 'india',
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
