// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — EOD date utilities
//
// Date helpers shared by the EOD ingestion pipeline, refresh scheduler, and
// precompute engines.
// ─────────────────────────────────────────────────────────────────────────────

import { indiaTradingCalendar } from './IndiaTradingCalendar';

/**
 * Get the "EOD date" — the most recent completed trading day.
 * Between 09:15 and 15:30 IST the EOD date is the previous trading day
 * (today's session hasn't closed yet).  After 15:30 it is today.
 */
export function getEodDate(now: Date = new Date()): string {
  const cal = indiaTradingCalendar;
  const istMs = (now.getTime() + 5.5 * 60 * 60 * 1000) % (24 * 60 * 60 * 1000);
  const closeMs = 15 * 60 * 60 * 1000 + 30 * 60 * 1000;

  if (cal.isTradingDay(now) && istMs >= closeMs) {
    // Market closed today — EOD date is today
    return now.toISOString().slice(0, 10);
  }

  // Before close or not a trading day — previous trading day
  // We only need date precision here; move back one day, then snap back
  const prev = new Date(now);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return cal.previousTradingDay(prev).toISOString().slice(0, 10);
}

/**
 * Format a Date to 'YYYY-MM-DD' (UTC).
 */
export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Parse 'YYYY-MM-DD' to a Date at 00:00:00 UTC.
 */
export function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/**
 * Get a human-readable week day name.
 */
export function weekDayName(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()];
}
