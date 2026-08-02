// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Philippine symbol normalizer
//
// Pure functions that convert any ticker-like input to a canonical form.
// No side effects, no I/O.  Can be used on the client or the server.
// ─────────────────────────────────────────────────────────────────────────────

import type { PSEInstrumentSegment } from './PSESymbol';

/** Generic "recognisably Philippine-exchange-formatted" marker — this function only
 * detects whether a ticker has PSE-style formatting, not which specific
 * venue is primary (see PSESymbol.ts's PSEExchange for that distinction). */
type DetectedExchangeMarker = 'PSE';

// ---------------------------------------------------------------------------
// Suffix / prefix patterns for known Philippine ticker formats
// ---------------------------------------------------------------------------

const SUFFIX_PATTERNS = [
  /\.PS$/i,      // Yahoo Finance suffix for PSE
  /\.PSE$/i,     // Explicit PSE suffix
  /-EQ$/i,       // PSE trading symbol suffix
  /-BE$/i,       // PSE Book Building suffix
  /-SM$/i,       // PSE SME suffix
] as const;

const PREFIX_PATTERNS = [
  /^PSE:/i,      // Prefix format PSE:BDO
  /^PSE:/i,      // Prefix format PSE:TEL
  /^NSI:/i,      // Bloomberg PSE
  /^BSI:/i,      // Bloomberg PSE
] as const;

// ---------------------------------------------------------------------------
// Market-cap to segment mapping (used for SME detection)
// ---------------------------------------------------------------------------

/**
 * Known SME tickers (hard-coded reference set — expanded from symbol master).
 * These trade on the PSE's Small, Medium and Emerging Board.
 *
 * Empty for now — left unpopulated rather than filled with guessed
 * tickers. `inferSegment` correctly returns `null` (unknown) for any
 * ticker not in this set; that's an honest "needs master lookup," not a
 * wrong classification.
 */
const KNOWN_SME_TICKERS = new Set<string>([]);

/**
 * Known ETF / index fund tickers listed on the PSE.
 */
const KNOWN_ETF_TICKERS = new Set([
  'FMETF', // First Metro Philippine Equity Exchange Traded Fund
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalise an arbitrary ticker to its canonical form.
 *
 * Steps:
 * 1. Strip known exchange prefixes (`PSE:`, `PSE:`, `NSI:`, `BSI:`)
 * 2. Strip known suffixes (`.NS`, `.BO`, `-EQ`, `-BE`, `-SM`)
 * 3. Convert to UPPERCASE
 * 4. Return trimmed result
 *
 * @example
 * normalizeTicker('BDO.PS')       // => 'BDO'
 * normalizeTicker('PSE:TEL')          // => 'TEL'
 * normalizeTicker('500325.PS')         // => '500325'
 * normalizeTicker('BDO')          // => 'BDO'
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
 * inferExchange('BDO.PS')     // => 'PSE'
 * inferExchange('500325.BO')       // => 'PSE'
 * inferExchange('PSE:TEL')        // => 'PSE'
 * inferExchange('BDO')        // => null  (no hint)
 * inferExchange('BDO-EQ')          // => null  (EQ suffix is PSE but not exchange-specific enough)
 */
export function inferExchange(raw: string): DetectedExchangeMarker | null {
  const s = raw.trim();

  // Explicit prefix — support PSE:, NSI: (Bloomberg), PSE:, BSI: (Bloomberg)
  if (/^PSE:/i.test(s) || /^NSI:/i.test(s)) return 'PSE';
  if (/^PSE:/i.test(s) || /^BSI:/i.test(s)) return 'PSE';

  // Suffix-based
  if (/\.NS$/i.test(s) || /\.PSE$/i.test(s)) return 'PSE';
  if (/\.BO$/i.test(s) || /\.PSE$/i.test(s)) return 'PSE';

  // EQ-only equities trade on PSE
  if (/-EQ$/i.test(s)) return 'PSE';

  return null;
}

/**
 * Infer instrument segment from a raw ticker, falling back to `null`.
 *
 * @example
 * inferSegment('BDO-EQ')  // => 'EQ'
 * inferSegment('FMETF')   // => 'ET'
 * inferSegment('500325')  // => null (needs master lookup)
 */
export function inferSegment(raw: string): PSEInstrumentSegment | null {
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
 * Check whether a string looks like a PSE numeric scrip code.
 * PSE codes are 4–8 digit numeric strings.
 */
export function isPseCode(raw: string): boolean {
  return /^\d{4,8}$/.test(raw.trim());
}
