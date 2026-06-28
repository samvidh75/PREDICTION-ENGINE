/**
 * Disclosure Ingestion
 *
 * Ingests bulk/block deals, insider trades, and regulatory disclosures.
 * Only ingests legally available data. Does not infer intent.
 */

import type { MarketDisclosure, DisclosureKind, DisclosureClassification } from './DisclosureTypes';

export class DisclosureIngestion {
  private disclosures: Map<string, MarketDisclosure> = new Map();
  private bySymbol: Map<string, string[]> = new Map();

  add(disclosure: MarketDisclosure): void {
    this.disclosures.set(disclosure.id, disclosure);
    const key = disclosure.symbol.toUpperCase();
    const ids = this.bySymbol.get(key) ?? [];
    ids.push(disclosure.id);
    ids.sort((a, b) => {
      const da = this.disclosures.get(a)!;
      const db = this.disclosures.get(b)!;
      return db.filingDate.localeCompare(da.filingDate);
    });
    this.bySymbol.set(key, ids);
  }

  getBySymbol(symbol: string): MarketDisclosure[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];
    return ids.map(id => this.disclosures.get(id)!).filter(Boolean);
  }

  getLatest(symbol: string): MarketDisclosure | undefined {
    return this.getBySymbol(symbol)[0];
  }

  getByDateRange(from: string, to: string): MarketDisclosure[] {
    return Array.from(this.disclosures.values()).filter(d =>
      d.filingDate >= from && d.filingDate <= to
    ).sort((a, b) => b.filingDate.localeCompare(a.filingDate));
  }

  getStats(): { totalDisclosures: number; symbolsCovered: number; byKind: Partial<Record<DisclosureKind, number>> } {
    const byKind: Partial<Record<DisclosureKind, number>> = {};
    for (const d of this.disclosures.values()) {
      byKind[d.disclosureKind] = (byKind[d.disclosureKind] ?? 0) + 1;
    }
    return {
      totalDisclosures: this.disclosures.size,
      symbolsCovered: this.bySymbol.size,
      byKind,
    };
  }
}

export const disclosureIngestion = new DisclosureIngestion();
