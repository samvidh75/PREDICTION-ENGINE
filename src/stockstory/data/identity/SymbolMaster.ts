/**
 * Symbol Master
 *
 * Maintains the authoritative mapping between stock symbols and company identities.
 * All symbol lookups in the system should route through this master.
 */

import type { StockToCompanyMapping } from './IdentityTypes';
import type { CompanyIdentity } from './IdentityTypes';

export class SymbolMaster {
  /** symbol → company mapping, keyed by uppercase symbol */
  private symbolIndex: Map<string, StockToCompanyMapping[]> = new Map();

  /** companyId → identity */
  private companies: Map<string, CompanyIdentity> = new Map();

  /** companyId → all current symbols */
  private companySymbols: Map<string, Set<string>> = new Map();

  loadMappings(mappings: StockToCompanyMapping[]): void {
    for (const m of mappings) {
      const key = m.symbol.toUpperCase();
      const existing = this.symbolIndex.get(key) ?? [];
      // Avoid duplicates
      if (!existing.some(e => e.companyId === m.companyId && e.exchange === m.exchange)) {
        existing.push(m);
      }
      this.symbolIndex.set(key, existing);

      const symbols = this.companySymbols.get(m.companyId) ?? new Set();
      symbols.add(key);
      this.companySymbols.set(m.companyId, symbols);
    }
  }

  lookupBySymbol(symbol: string): StockToCompanyMapping[] {
    return this.symbolIndex.get(symbol.toUpperCase()) ?? [];
  }

  lookupByCompany(companyId: string): string[] {
    return Array.from(this.companySymbols.get(companyId) ?? []);
  }

  getCompany(companyId: string): CompanyIdentity | undefined {
    return this.companies.get(companyId);
  }

  setCompany(identity: CompanyIdentity): void {
    this.companies.set(identity.companyId, identity);
    for (const listing of identity.listings) {
      const key = listing.symbol.toUpperCase();
      const mappings = this.symbolIndex.get(key) ?? [];
      if (!mappings.some(m => m.companyId === identity.companyId && m.exchange === listing.exchange)) {
        mappings.push({
          symbol: listing.symbol,
          companyId: identity.companyId,
          isPrimary: listing.exchange === 'NSE',
          exchange: listing.exchange,
          validFrom: listing.listingDate,
          validTo: null,
        });
      }
      this.symbolIndex.set(key, mappings);
    }
  }

  getAllCompanies(): CompanyIdentity[] {
    return Array.from(this.companies.values());
  }

  getStats(): { totalCompanies: number; totalSymbols: number; totalMappings: number } {
    let totalMappings = 0;
    for (const mappings of this.symbolIndex.values()) {
      totalMappings += mappings.length;
    }
    return {
      totalCompanies: this.companies.size,
      totalSymbols: this.symbolIndex.size,
      totalMappings,
    };
  }
}

export const symbolMaster = new SymbolMaster();
