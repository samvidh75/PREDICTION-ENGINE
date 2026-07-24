/**
 * PSX Universe Builder
 *
 * Builds and maintains the canonical stock universe for Pakistani equities.
 * Normalizes symbols, deduplicates, and tracks listing status.
 * Uses existing data sources only — no invented companies.
 */

import type { PSESymbol, ListingStatus, UniverseStats } from './UniverseTypes';
import { SymbolNormalizer } from './SymbolNormalizer';
import { dataSourceRegistry } from '../sources/DataSourceRegistry';

export interface UniverseProvider {
  name: string;
  fetchSymbols(): Promise<Partial<PSESymbol>[]>;
  available(): boolean;
}

export class PSEUniverseBuilder {
  private normalizer = new SymbolNormalizer();
  private providers: UniverseProvider[] = [];

  constructor(providers: UniverseProvider[] = []) {
    this.providers = providers;
  }

  async build(): Promise<{ symbols: PSESymbol[]; stats: UniverseStats; errors: string[] }> {
    const errors: string[] = [];
    const rawEntries: Partial<PSESymbol>[] = [];

    for (const provider of this.providers) {
      if (!provider.available()) continue;
      try {
        const symbols = await provider.fetchSymbols();
        rawEntries.push(...symbols);
      } catch (err) {
        errors.push(`Provider ${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const symbols = this.mergeAndDeduplicate(rawEntries);
    const stats = this.computeStats(symbols);

    return { symbols, stats, errors };
  }

  private mergeAndDeduplicate(entries: Partial<PSESymbol>[]): PSESymbol[] {
    const byISIN = new Map<string, PSESymbol>();
    const bySymbol = new Map<string, PSESymbol>();
    const byPsx = new Map<string, PSESymbol>();

    for (const entry of entries) {
      const normalizedSymbol = this.normalizer.normalize(entry.symbol ?? '');
      if (!normalizedSymbol) continue;

      // Merge by ISIN (strongest key)
      const isin = entry.isin ?? null;
      if (isin && byISIN.has(isin)) {
        this.mergeInto(byISIN.get(isin)!, entry);
        continue;
      }

      // Merge by PSX symbol
      const psxSymbol = entry.pseSymbol ?? normalizedSymbol;
      if (psxSymbol && byPsx.has(psxSymbol)) {
        this.mergeInto(byPsx.get(psxSymbol)!, entry);
        continue;
      }

      // Check existing by symbol
      if (bySymbol.has(normalizedSymbol)) {
        this.mergeInto(bySymbol.get(normalizedSymbol)!, entry);
        continue;
      }

      const symbol: PSESymbol = {
        symbol: normalizedSymbol,
        isin,
        pseSymbol: entry.pseSymbol ?? normalizedSymbol,
        pseCode: entry.pseCode ?? null,
        companyName: entry.companyName ?? normalizedSymbol,
        sector: entry.sector ?? null,
        industry: entry.industry ?? null,
        exchange: this.inferExchange(entry),
        listingStatus: this.inferStatus(entry),
        listingDate: entry.listingDate ?? null,
        delistingDate: entry.delistingDate ?? null,
        faceValue: entry.faceValue ?? null,
        marketCap: entry.marketCap ?? null,
        marketCapCategory: this.inferMcapCategory(entry.marketCap),
        lastVerified: entry.lastVerified ?? null,
        sourceIds: entry.sourceIds ?? [],
      };

      if (isin) byISIN.set(isin, symbol);
      bySymbol.set(normalizedSymbol, symbol);
      if (symbol.pseSymbol) byPsx.set(symbol.pseSymbol, symbol);
    }

    // Prefer PSE-listed and active symbols
    const result = Array.from(bySymbol.values());
    result.sort((a, b) => {
      const statusOrder: Record<ListingStatus, number> = { active: 0, suspended: 1, merged: 2, delisted: 3, unknown: 4 };
      return (statusOrder[a.listingStatus] ?? 4) - (statusOrder[b.listingStatus] ?? 4);
    });

    return result;
  }

  private mergeInto(target: PSESymbol, source: Partial<PSESymbol>): void {
    if (source.companyName && (!target.companyName || target.companyName === target.symbol)) {
      target.companyName = source.companyName;
    }
    if (source.sector && !target.sector) target.sector = source.sector;
    if (source.industry && !target.industry) target.industry = source.industry;
    if (source.isin && !target.isin) target.isin = source.isin;
    if (source.pseCode && !target.pseCode) target.pseCode = source.pseCode;
    if (source.pseSymbol && !target.pseSymbol) target.pseSymbol = source.pseSymbol;
    if (source.marketCap && !target.marketCap) target.marketCap = source.marketCap;
    if (source.exchange && target.exchange === 'PSX' && source.exchange === 'PSX') {
      target.exchange = 'both';
    }
    if (source.sourceIds) {
      for (const id of source.sourceIds) {
        if (!target.sourceIds.includes(id)) target.sourceIds.push(id);
      }
    }
  }

  private inferExchange(entry: Partial<PSESymbol>): 'PSX' | 'both' {
    if (entry.exchange) return entry.exchange;
    const hasNse = !!(entry.pseSymbol);
    const hasBse = !!(entry.pseCode);
    if (hasNse && hasBse) return 'both';
    if (hasNse) return 'PSX';
    if (hasBse) return 'PSX';
    return 'PSX'; // default
  }

  private inferStatus(entry: Partial<PSESymbol>): ListingStatus {
    return entry.listingStatus ?? 'active';
  }

  private inferMcapCategory(mcap: number | null | undefined): PSESymbol['marketCapCategory'] {
    if (mcap === null || mcap === undefined) return 'unknown';
    // Pakistan market cap categories (approximate, in crores)
    if (mcap >= 20000) return 'large';
    if (mcap >= 5000) return 'mid';
    if (mcap >= 500) return 'small';
    return 'micro';
  }

  private computeStats(symbols: PSESymbol[]): UniverseStats {
    const byExchange = { PSX: 0, both: 0 };
    const byMarketCap: UniverseStats['byMarketCap'] = { large: 0, mid: 0, small: 0, micro: 0, unknown: 0 };
    const bySector: Record<string, number> = {};
    let activeSymbols = 0;
    let delistedSymbols = 0;
    let suspendedSymbols = 0;
    let withISIN = 0;
    let withCompanyName = 0;

    for (const s of symbols) {
      if (s.listingStatus === 'active') activeSymbols++;
      else if (s.listingStatus === 'delisted') delistedSymbols++;
      else if (s.listingStatus === 'suspended') suspendedSymbols++;

      byExchange[s.exchange]++;
      byMarketCap[s.marketCapCategory]++;
      if (s.isin) withISIN++;
      if (s.companyName && s.companyName !== s.symbol) withCompanyName++;

      const sec = s.sector ?? 'Unknown';
      bySector[sec] = (bySector[sec] ?? 0) + 1;
    }

    return {
      totalSymbols: symbols.length,
      activeSymbols,
      delistedSymbols,
      suspendedSymbols,
      byExchange,
      byMarketCap,
      bySector,
      withISIN,
      withCompanyName,
      lastRefreshed: new Date().toISOString(),
    };
  }
}
