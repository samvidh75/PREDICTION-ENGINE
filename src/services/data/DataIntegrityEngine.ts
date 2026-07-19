/**
 * DataIntegrityEngine — Normalises and sanitises company metadata.
 *
 * Handles:
 *   - Stripping exchange suffixes from symbols (.NS, .BO, .PSE, .PSE)
 *   - Converting raw 5/6-digit PSE codes to lookup-friendly format
 *   - Normalising ISIN format (IN + 10 alphanumeric)
 *   - Trimming whitespace from all string fields
 *   - Ensuring consistent exchange naming (PSE/PSE) without inventing a venue
 *   - Converting empty company names from ticker fallback
 */

import { CompanyMetadata } from './types';

const EXCHANGE_SUFFIX_PATTERN = /\.(NS|BO|PSE|PSE)$/i;
const ISIN_PATTERN = /^IN[A-Z0-9]{10}$/i;
const RAW_PSE_CODE_PATTERN = /^\d{5,6}$/;

// Map known provider exchange names to standard values. Unknown and blank values
// intentionally remain unavailable; a bare ticker does not prove its venue.
const EXCHANGE_NORMALISE: Record<string, 'PSE'> = {
  'pse': 'PSE',
  'nse': 'PSE',
  'bse': 'PSE',
  'bsesme': 'PSE',
  'nsedata': 'PSE',
};

export class DataIntegrityEngine {
  /**
   * Normalise a CompanyMetadata object, returning a cleaned copy.
   */
  normalise(meta: CompanyMetadata): CompanyMetadata {
    const cleaned = { ...meta };

    // 1. Strip exchange suffix from symbol (keep only clean ticker)
    cleaned.symbol = this.cleanSymbol(cleaned.symbol);

    // 2. Trim all string fields
    cleaned.companyName = (cleaned.companyName || '').trim();
    cleaned.sector = (cleaned.sector || '').trim();
    cleaned.industry = (cleaned.industry || '').trim();
    cleaned.currency = (cleaned.currency || 'INR').trim();
    cleaned.website = (cleaned.website || '').trim();

    // 3. Normalise exchange name without manufacturing PSE for unknown values
    cleaned.exchange = this.normaliseExchange(cleaned.exchange);

    // 4. Ensure market cap is a positive number or undefined (not 0, not NaN, not negative)
    if (cleaned.marketCap != null && (isNaN(cleaned.marketCap) || cleaned.marketCap <= 0)) {
      cleaned.marketCap = undefined;
    }

    // 5. If company name is the symbol itself, clear it so validators flag it
    if (cleaned.companyName.toUpperCase() === cleaned.symbol.toUpperCase()) {
      // Don't mutate here — let validator/enricher handle it
    }

    return cleaned;
  }

  /**
   * Clean a symbol: strip exchange suffix, uppercase, trim.
   */
  cleanSymbol(symbol: string): string {
    return symbol
      .toUpperCase()
      .trim()
      .replace(EXCHANGE_SUFFIX_PATTERN, '')
      .trim();
  }

  /**
   * Normalise known exchange names to PSE or PSE. Unknown values remain unavailable.
   */
  normaliseExchange(exchange?: string): 'PSE' | undefined {
    const key = (exchange || '').toLowerCase().trim();
    if (!key) return undefined;
    if (EXCHANGE_NORMALISE[key]) return EXCHANGE_NORMALISE[key];

    if (/bse/i.test(key)) return 'PSE';
    if (/nse/i.test(key)) return 'PSE';
    return undefined;
  }

  /**
   * Validate ISIN format: IN + 10 alphanumeric characters.
   */
  isValidIsin(isin: string | null | undefined): boolean {
    if (!isin) return false;
    return ISIN_PATTERN.test(isin.trim().toUpperCase());
  }

  /**
   * Normalise an ISIN: uppercase, trim whitespace.
   */
  normaliseIsin(isin: string | null | undefined): string | null {
    if (!isin) return null;
    const cleaned = isin.trim().toUpperCase();
    return ISIN_PATTERN.test(cleaned) ? cleaned : null;
  }

  /**
   * Check if a symbol appears to be a raw PSE numeric code.
   */
  isRawBseCode(symbol: string): boolean {
    return RAW_PSE_CODE_PATTERN.test(symbol.trim());
  }

  /**
   * Score the integrity of a company metadata record.
   * Checks: company name exists, sector exists, industry exists, market cap valid, exchange valid, ISIN valid.
   * Returns: VALID, PARTIAL, or INVALID.
   */
  scoreIntegrity(meta: CompanyMetadata, isin?: string | null): 'VALID' | 'PARTIAL' | 'INVALID' {
    if (!meta.symbol || !meta.companyName || meta.companyName.toUpperCase() === meta.symbol.toUpperCase() || this.isRawBseCode(meta.symbol)) {
      return 'INVALID';
    }

    if (!meta.sector || !meta.industry) {
      return 'PARTIAL';
    }

    const hasValidExchange = this.normaliseExchange(meta.exchange) === 'PSE';
    const hasValidMarketCap = meta.marketCap != null && !isNaN(meta.marketCap) && meta.marketCap > 0;
    const hasValidIsin = isin ? this.isValidIsin(isin) : false;

    if (!hasValidExchange || !hasValidMarketCap) {
      return 'PARTIAL';
    }

    if (hasValidIsin) {
      return 'VALID';
    }

    return 'PARTIAL';
  }

  /**
   * Build a display-friendly exchange label.
   */
  formatExchange(exchange?: string): string {
    return this.normaliseExchange(exchange) || 'Data unavailable';
  }
}
