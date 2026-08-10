import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pseTradingCalendar } from '../src/data-plane/calendar/PSETradingCalendar.js';
import { resolveMarketStatus, phtDateString } from '../src/services/market/marketStatusResolver.js';

/**
 * PSE market status — holiday-aware, timezone-correct snapshot.
 *
 * Combines the two real sources of truth already used across the app:
 *   - MarketHours / marketStatusResolver — Asia/Manila session ladder
 *     (auction / open / lunch / closing / post-market)
 *   - PSETradingCalendar                  — Philippine holiday calendar
 *
 * Returns a single `status` value the UI can render directly. Nothing here
 * is guessed or hardcoded per-request: the schedule constants come from
 * PSE_SCHEDULE and the holiday list from the static calendar.
 */

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60');

  const now = new Date();
  const phtDate = phtDateString(now);
  const payload = resolveMarketStatus(
    now,
    pseTradingCalendar.isHoliday(phtDate),
    (d) => pseTradingCalendar.isTradingDay(d),
  );

  res.status(200).json(payload);
}

