/**
 * Stock Universe Adapter
 *
 * Reads the bundled stock-universe.json to serve CompanyMasterAdapter lookups.
 * Provides PSE equity metadata — symbols, names, sectors, market cap categories —
 * from the curated universe bundle shipped with the application.
 *
 * No external API calls are made; the file is read once and cached in memory.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  AdapterResult,
  AdapterWarning,
  CompanyMasterAdapter,
  CompanyMasterRecord,
} from '../dataAdapterTypes';
import { adapterOk, adapterErr } from '../adapterResult';
import { normalizeAdapterSymbol } from '../normalizeDataRecord';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Inline type for the raw JSON structure ──────────────────────────────────

interface StockUniverseEntry {
  symbol: string;
  name: string;
  exchange: 'PSE' | 'PSE';
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  listingDate?: string | null;
  scores?: {
    quality: number;
    valuation: number;
    growth: number;
    momentum: number;
    risk: number;
    health: number;
    riskAdjusted: number;
  };
}

interface StockUniverseFile {
  totalUniverse: number;
  generatedAt: string;
  sources: string[];
  entries: StockUniverseEntry[];
}

// ─── Market cap thresholds (in crores) matching PSEUniverseBuilder ───

type MarketCapCategory = 'large' | 'mid' | 'small' | 'micro' | 'unknown';

function inferMcapCategory(mcap: number | null | undefined): MarketCapCategory {
  if (mcap === null || mcap === undefined) return 'unknown';
  if (mcap >= 20000) return 'large';
  if (mcap >= 5000) return 'mid';
  if (mcap >= 500) return 'small';
  return 'micro';
}

function toDisplayCategory(cat: MarketCapCategory): CompanyMasterRecord['marketCapCategory'] {
  switch (cat) {
    case 'large':  return 'Large Cap';
    case 'mid':    return 'Mid Cap';
    case 'small':  return 'Small Cap';
    case 'micro':  return 'Micro Cap';
    default:       return null;
  }
}

// ─── Candidate paths for the bundled universe (dev + production) ─────────────

const CANDIDATE_PATHS = [
  path.join(process.cwd(), 'data', 'stock-universe.json'),
  path.join(process.cwd(), 'public', 'stock-universe.json'),
  ...(process.env.NODE_ENV === 'production'
    ? [path.join(__dirname, '..', '..', '..', '..', 'dist', 'public', 'stock-universe.json')]
    : []),
];

function resolveUniversePath(): string | null {
  for (const candidate of CANDIDATE_PATHS) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // permission or read errors → skip
    }
  }
  return null;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export class StockUniverseAdapter implements CompanyMasterAdapter {
  /** Singleton accessor — delegates to the module-level getStockUniverseAdapter(). */
  static getInstance(): StockUniverseAdapter {
    return getStockUniverseAdapter();
  }

  private loaded = false;
  private loadError: string | null = null;
  private bySymbol: Map<string, StockUniverseEntry> = new Map();
  private generatedAt: string | null = null;

  constructor() {
    this.load();
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  async getCompanyMaster(symbol: string): Promise<AdapterResult<CompanyMasterRecord>> {
    const normalized = normalizeAdapterSymbol(symbol);
    if (!normalized) {
      return adapterErr('INVALID_SYMBOL');
    }

    if (!this.loaded) {
      if (this.loadError) {
        return adapterErr('ADAPTER_UNAVAILABLE', [
          { code: 'ADAPTER_UNAVAILABLE', message: `Stock universe not loaded: ${this.loadError}` },
        ]);
      }
      this.load();
      if (!this.loaded) {
        return adapterErr('ADAPTER_UNAVAILABLE', [
          { code: 'ADAPTER_UNAVAILABLE', message: this.loadError ?? 'Stock universe failed to load' },
        ]);
      }
    }

    const entry = this.bySymbol.get(normalized);
    if (!entry) {
      return adapterErr('EMPTY_RESPOPSE', [
        { code: 'EMPTY_RESPOPSE', message: `Symbol "${normalized}" not found in stock universe` },
      ]);
    }

    const warnings: AdapterWarning[] = entry.marketCap === null
      ? [{ code: 'STALE_RESPOPSE', message: 'FALLBACK_VALUE — marketCap missing' }]
      : [];

    const record: CompanyMasterRecord = {
      symbol: normalized,
      exchange: entry.exchange ?? 'UNKNOWN',
      companyName: entry.name || normalized,
      sector: entry.sector ?? null,
      industry: entry.industry ?? null,
      listingDate: entry.listingDate ?? null,
      marketCapCategory: toDisplayCategory(inferMcapCategory(entry.marketCap)),
    };

    return adapterOk(record, warnings);
  }

  /** Reload the universe file from disk (e.g. after an update). */
  reload(): void {
    this.loaded = false;
    this.loadError = null;
    this.bySymbol.clear();
    this.generatedAt = null;
    this.load();
  }

  /** Number of loaded entries. */
  get size(): number {
    return this.bySymbol.size;
  }

  /**
   * All loaded universe entries as CompanyMasterRecord-shaped rows, plus the
   * raw factor scores (quality/valuation/growth/momentum/risk/health). Used
   * by bulk consumers (e.g. the data warehouse screener) that need to scan
   * the whole universe rather than look up one symbol at a time.
   */
  getAllEntries(): Array<CompanyMasterRecord & { marketCap: number | null; scores?: StockUniverseEntry['scores'] }> {
    if (!this.loaded) this.load();
    return Array.from(this.bySymbol.entries()).map(([symbol, entry]) => ({
      symbol,
      exchange: entry.exchange ?? 'UNKNOWN',
      companyName: entry.name || symbol,
      sector: entry.sector ?? null,
      industry: entry.industry ?? null,
      listingDate: entry.listingDate ?? null,
      marketCapCategory: toDisplayCategory(inferMcapCategory(entry.marketCap)),
      marketCap: entry.marketCap ?? null,
      scores: entry.scores,
    }));
  }

  /** Timestamp from the loaded universe file. */
  get dataGeneratedAt(): string | null {
    return this.generatedAt;
  }

  /** True when data is ready. */
  get ready(): boolean {
    return this.loaded;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private load(): void {
    try {
      const filePath = resolveUniversePath();
      if (!filePath) {
        this.loadError = 'stock-universe.json not found in expected locations';
        return;
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed: StockUniverseFile = JSON.parse(raw);

      if (!parsed.entries || !Array.isArray(parsed.entries)) {
        this.loadError = 'Invalid stock-universe.json format: missing entries array';
        return;
      }

      this.generatedAt = parsed.generatedAt ?? null;

      for (const entry of parsed.entries) {
        const normalized = normalizeAdapterSymbol(entry.symbol);
        if (!normalized) continue;
        if (!this.bySymbol.has(normalized)) {
          this.bySymbol.set(normalized, entry);
        }
      }

      this.loaded = true;
      this.loadError = null;
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err);
    }
  }
}

// ─── Singleton export (lazy) ─────────────────────────────────────────────────

let _instance: StockUniverseAdapter | null = null;

export function getStockUniverseAdapter(): StockUniverseAdapter {
  if (!_instance) {
    _instance = new StockUniverseAdapter();
  }
  return _instance;
}
