/**
 * News Entity Matcher
 *
 * Matches news content to stock symbols by checking title/content
 * for symbol mentions, company names, and known aliases.
 */

import type { NewsEntityMatch, NewsItem } from './NewsQualityTypes';

interface EntityEntry {
  symbol: string;
  companyName: string;
  aliases: string[];
  isin?: string;
}

export class NewsEntityMatcher {
  private entities: Map<string, EntityEntry> = new Map();
  private nameIndex: Map<string, string> = new Map(); // lowercase name → symbol
  private aliasIndex: Map<string, string> = new Map(); // lowercase alias → symbol

  /** Register an entity that news can be matched to */
  register(symbol: string, companyName: string, aliases: string[] = [], isin?: string): void {
    const upperSym = symbol.toUpperCase();
    this.entities.set(upperSym, { symbol: upperSym, companyName, aliases, isin });

    this.nameIndex.set(companyName.toLowerCase(), upperSym);
    for (const alias of aliases) {
      this.aliasIndex.set(alias.toLowerCase(), upperSym);
    }
  }

  /** Register multiple entities */
  registerMany(entities: Array<{ symbol: string; companyName: string; aliases?: string[]; isin?: string }>): void {
    for (const e of entities) {
      this.register(e.symbol, e.companyName, e.aliases ?? [], e.isin);
    }
  }

  /** Match a news item to a symbol */
  match(news: NewsItem): NewsEntityMatch[] {
    const results: NewsEntityMatch[] = [];
    const textToCheck = `${news.title} ${news.summary ?? ''}`.toLowerCase();

    // Check direct symbol mentions (word boundary sensitive)
    for (const [symbol, entity] of this.entities.entries()) {
      if (textToCheck.includes(symbol.toLowerCase())) {
        results.push({
          matchedSymbol: symbol,
          matchedCompanyName: entity.companyName,
          confidence: 0.9,
          matchedBy: 'symbol',
        });
        continue;
      }
    }

    // Check company name
    for (const [name, symbol] of this.nameIndex.entries()) {
      if (textToCheck.includes(name)) {
        const entity = this.entities.get(symbol)!;
        results.push({
          matchedSymbol: symbol,
          matchedCompanyName: entity.companyName,
          confidence: 0.85,
          matchedBy: 'company_name',
        });
        break;
      }
    }

    // Check aliases
    for (const [alias, symbol] of this.aliasIndex.entries()) {
      if (textToCheck.includes(alias)) {
        const entity = this.entities.get(symbol)!;
        results.push({
          matchedSymbol: symbol,
          matchedCompanyName: entity.companyName,
          confidence: 0.7,
          matchedBy: 'alias',
        });
        break;
      }
    }

    // Deduplicate by symbol
    const seen = new Set<string>();
    return results.filter(r => {
      if (seen.has(r.matchedSymbol!)) return false;
      seen.add(r.matchedSymbol!);
      return true;
    });
  }

  /** Quick match a text string to a symbol */
  quickMatch(text: string): string | null {
    const lower = text.toLowerCase();

    // Try direct symbol
    for (const [symbol] of this.entities.entries()) {
      if (lower.includes(symbol.toLowerCase())) return symbol;
    }

    // Try company name
    for (const [name, symbol] of this.nameIndex.entries()) {
      if (lower.includes(name)) return symbol;
    }

    // Try alias
    for (const [alias, symbol] of this.aliasIndex.entries()) {
      if (lower.includes(alias)) return symbol;
    }

    return null;
  }

  /** Remove an entity */
  unregister(symbol: string): void {
    const upperSym = symbol.toUpperCase();
    const entity = this.entities.get(upperSym);
    if (entity) {
      this.nameIndex.delete(entity.companyName.toLowerCase());
      for (const alias of entity.aliases) {
        this.aliasIndex.delete(alias.toLowerCase());
      }
      this.entities.delete(upperSym);
    }
  }

  /** Get stats */
  getStats(): { totalEntities: number; totalAliases: number } {
    return {
      totalEntities: this.entities.size,
      totalAliases: this.aliasIndex.size,
    };
  }
}

export const newsEntityMatcher = new NewsEntityMatcher();
