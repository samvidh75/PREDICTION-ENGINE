/**
 * PSE (Philippine Peso) currency & number formatting utilities.
 *
 * Philippine convention uses the ₱ symbol, thousands/millions/billions
 * grouping (not lakhs/crores), and en-PH locale for digit grouping.
 *
 * @module currencyFormatter
 */

/**
 * Format a number as Philippine Peso currency.
 *
 * @example
 * formatPHP(1234567.89)     // "₱1,234,567.89"
 * formatPHP(0)              // "₱0.00"
 * formatPHP(1234567.89, 0)  // "₱1,234,568"
 */
export function formatPHP(amount: number, decimals = 2): string {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/**
 * Format a number in compact Philippine notation (K, M, B).
 * Uses the short-scale numbering system (thousands, millions, billions).
 *
 * @example
 * formatCompactPHP(1500)       // "₱1.5K"
 * formatCompactPHP(2500000)    // "₱2.5M"
 * formatCompactPHP(3200000000) // "₱3.2B"
 * formatCompactPHP(500)        // "₱500"
 */
export function formatCompactPHP(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `₱${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `₱${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `₱${(amount / 1_000).toFixed(1)}K`;
  }
  return `₱${amount.toLocaleString("en-PH")}`;
}

/**
 * Format a raw number with compact notation (no currency symbol).
 *
 * @example
 * formatCompact(1500)       // "1.5K"
 * formatCompact(2500000)    // "2.5M"
 * formatCompact(3200000000) // "3.2B"
 */
export function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-PH");
}

/**
 * Format a percentage value.
 *
 * @example
 * formatPercent(0.1523)  // "15.23%"
 * formatPercent(-0.05)   // "-5.00%"
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a volume number in Philippine notation.
 * Volume is typically shown in thousands or millions.
 *
 * @example
 * formatVolume(1250000)  // "1.25M"
 * formatVolume(87500)    // "87.5K"
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toLocaleString("en-PH");
}

/**
 * Format market cap in the standard Philippine convention.
 * Always shown as a full ₱ amount or in B/M notation for large caps.
 */
export function formatMarketCap(marketCap: number | null): string {
  if (marketCap === null || marketCap === undefined) return "—";
  if (marketCap >= 1_000_000_000) {
    return `₱${(marketCap / 1_000_000_000).toFixed(2)}B`;
  }
  if (marketCap >= 1_000_000) {
    return `₱${(marketCap / 1_000_000).toFixed(2)}M`;
  }
  return formatPHP(marketCap);
}