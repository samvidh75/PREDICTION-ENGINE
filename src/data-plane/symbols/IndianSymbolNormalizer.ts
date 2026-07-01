// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Indian symbol normalizer
//
// Pure functions that convert any ticker-like input to a canonical form.
// No side effects, no I/O.  Can be used on the client or the server.
// ─────────────────────────────────────────────────────────────────────────────

import type { IndianExchange, IndianInstrumentSegment } from './IndianEquitySymbol';

// ---------------------------------------------------------------------------
// Suffix / prefix patterns for known Indian ticker formats
// ---------------------------------------------------------------------------

const SUFFIX_PATTERNS = [
  /\.NS$/i,      // Yahoo Finance suffix for NSE
  /\.NSE$/i,     // Explicit NSE suffix
  /\.BO$/i,      // Yahoo Finance suffix for BSE
  /\.BSE$/i,     // Explicit BSE suffix
  /-EQ$/i,       // NSE trading symbol suffix
  /-BE$/i,       // NSE Book Building suffix
  /-SM$/i,       // NSE SME suffix
] as const;

const PREFIX_PATTERNS = [
  /^NSE:/i,      // Prefix format NSE:RELIANCE
  /^BSE:/i,      // Prefix format BSE:INFY
  /^NSI:/i,      // Bloomberg NSE
  /^BSI:/i,      // Bloomberg BSE
] as const;

// ---------------------------------------------------------------------------
// Market-cap to segment mapping (used for SME detection)
// ---------------------------------------------------------------------------

/**
 * Known SME tickers (hard-coded reference set — expanded from symbol master).
 * These trade on the NSE SME / BSE SME platform.
 */
const KNOWN_SME_TICKERS = new Set([
  'SONACOMS', 'PRAKASH', 'MAPMYINDIA',
]);

/**
 * Known ETF / index fund tickers.
 */
const KNOWN_ETF_TICKERS = new Set([
  'NIFTYBEES', 'JUNIORBEES', 'MON100',
  'GOLDBEES', 'HNGSNGBEES', 'NETFNIF100',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalise an arbitrary ticker to its canonical form.
 *
 * Steps:
 * 1. Strip known exchange prefixes (`NSE:`, `BSE:`, `NSI:`, `BSI:`)
 * 2. Strip known suffixes (`.NS`, `.BO`, `-EQ`, `-BE`, `-SM`)
 * 3. Convert to UPPERCASE
 * 4. Return trimmed result
 *
 * @example
 * normalizeTicker('RELIANCE.NS')       // => 'RELIANCE'
 * normalizeTicker('NSE:INFY')          // => 'INFY'
 * normalizeTicker('500325.BO')         // => '500325'
 * normalizeTicker('TCS-EQ')            // => 'TCS'
 * normalizeTicker('HDFCBANK')          // => 'HDFCBANK'
 */
export function normalizeTicker(raw: string): string {
  let s = raw.trim();

  // Strip known prefixes
  for (const pat of PREFIX_PATTERNS) {
    s = s.replace(pat, '');
  }

  // Strip known suffixes
  for (const pat of SUFFIX_PATTERNS) {
    s = s.replace(pat, '');
  }

  return s.toUpperCase().trim();
}

/**
 * Attempt to infer the exchange from a raw ticker string.
 * Returns `null` when the exchange cannot be determined.
 *
 * @example
 * inferExchange('RELIANCE.NS')     // => 'NSE'
 * inferExchange('500325.BO')       // => 'BSE'
 * inferExchange('NSE:INFY')        // => 'NSE'
 * inferExchange('HDFCBANK')        // => null  (no hint)
 * inferExchange('TCS-EQ')          // => null  (EQ suffix is NSE but not exchange-specific enough)
 */
export function inferExchange(raw: string): IndianExchange | null {
  const s = raw.trim();

  // Explicit prefix
  if (/^NSI?:/i.test(s)) return 'NSE';
  if (/^BSI?:/i.test(s)) return 'BSE';

  // Suffix-based
  if (/\.NS$/i.test(s) || /\.NSE$/i.test(s)) return 'NSE';
  if (/\.BO$/i.test(s) || /\.BSE$/i.test(s)) return 'BSE';

  // EQ-only equities trade on NSE
  if (/-EQ$/i.test(s)) return 'NSE';

  return null;
}

/**
 * Infer instrument segment from a raw ticker, falling back to `null`.
 *
 * @example
 * inferSegment('TCS-EQ')      // => 'EQ'
 * inferSegment('SONACOMS-SM') // => 'SM'
 * inferSegment('NIFTYBEES')   // => 'ET'
 * inferSegment('500325')     // => null (needs master lookup)
 */
export function inferSegment(raw: string): IndianInstrumentSegment | null {
  const s = raw.trim().toUpperCase();

  if (/-EQ$/i.test(s)) return 'EQ';
  if (/-BE$/i.test(s)) return 'BE';
  if (/-SM$/i.test(s)) return 'SM';

  const normal = normalizeTicker(s);
  if (KNOWN_SME_TICKERS.has(normal)) return 'SM';
  if (KNOWN_ETF_TICKERS.has(normal)) return 'ET';

  return null;
}

/**
 * Check whether a string looks like a BSE numeric scrip code.
 * BSE codes are 4–8 digit numeric strings.
 */
export function isBseCode(raw: string): boolean {
  return /^\d{4,8}$/.test(raw.trim());
}
