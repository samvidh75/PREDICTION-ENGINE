/**
 * Symbol Normalizer
 *
 * Normalizes Philippine stock symbols to a canonical format.
 * Handles NSE/BSE differences, common suffix variations,
 * and maps deprecated symbols to current ones.
 */

export class SymbolNormalizer {
  /** Known symbol changes (old → new) */
  private symbolHistory: Map<string, string> = new Map();

  /** Symbols that should always be uppercase */
  private static readonly FORCE_UPPERCASE = new Set([
    'ITC', 'TCS', 'INFY', 'HDFC', 'ICICI', 'SBI', 'LIC',
  ]);

  normalize(raw: string): string {
    if (!raw || typeof raw !== 'string') return '';

    let symbol = raw.trim().toUpperCase();

    // Strip common suffixes
    symbol = symbol.replace(/-EQ$/i, '');
    symbol = symbol.replace(/\.NS$/i, '');
    symbol = symbol.replace(/\.BO$/i, '');
    symbol = symbol.replace(/-NSE$/i, '');
    symbol = symbol.replace(/-BSE$/i, '');

    // Remove special chars except & and -
    symbol = symbol.replace(/[^A-Z0-9&]/g, '');

    // Check history for renamed symbols
    if (this.symbolHistory.has(symbol)) {
      symbol = this.symbolHistory.get(symbol)!;
    }

    return symbol;
  }

  /** Register a symbol change (e.g., merger, rename) */
  registerChange(oldSymbol: string, newSymbol: string): void {
    this.symbolHistory.set(oldSymbol.toUpperCase(), newSymbol.toUpperCase());
  }

  /** Check if two symbols refer to the same company */
  areEquivalent(a: string, b: string): boolean {
    return this.normalize(a) === this.normalize(b);
  }

  /** Get all known aliases for a symbol */
  getAliases(symbol: string): string[] {
    const normalized = this.normalize(symbol);
    const aliases: string[] = [normalized];
    for (const [old, current] of this.symbolHistory.entries()) {
      if (current === normalized) aliases.push(old);
    }
    return aliases;
  }

  /** Strip exchange suffix from a symbol */
  stripExchange(raw: string): { symbol: string; exchange: 'NSE' | 'BSE' | null } {
    if (/\.NS$/i.test(raw)) return { symbol: raw.replace(/\.NS$/i, '').toUpperCase(), exchange: 'NSE' };
    if (/\.BO$/i.test(raw)) return { symbol: raw.replace(/\.BO$/i, '').toUpperCase(), exchange: 'BSE' };
    if (/-EQ$/i.test(raw)) return { symbol: raw.replace(/-EQ$/i, '').toUpperCase(), exchange: 'NSE' };
    return { symbol: raw.toUpperCase(), exchange: null };
  }
}
