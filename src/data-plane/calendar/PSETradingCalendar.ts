// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — PSE trading calendar
//
// Pure server-side logic for determining trading days, holidays, and
// market-open status for the Philippine Stock Exchange.
//
// Trading hours: Mon–Fri 09:30–15:30 PHT (UTC+8).
// ─────────────────────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Static holiday list
// ---------------------------------------------------------------------------
// The PSE follows the Philippine regular/special non-working holiday
// calendar (Proclamation-driven, published annually by Malacañang). This
// static list is a baseline; production deployments should update it at the
// start of each calendar year once the year's proclamation is out.
// Format: 'YYYY-MM-DD'

const STATIC_HOLIDAYS: readonly string[] = [
  // 2026
  '2026-01-01', // New Year's Day
  '2026-02-17', // Chinese New Year (special non-working)
  '2026-02-25', // EDSA People Power Anniversary (special non-working)
  '2026-04-02', // Maundy Thursday
  '2026-04-03', // Good Friday
  '2026-04-04', // Black Saturday (special non-working)
  '2026-04-09', // Araw ng Kagitingan
  '2026-05-01', // Labor Day
  '2026-06-12', // Independence Day
  '2026-08-21', // Ninoy Aquino Day (special non-working)
  '2026-08-31', // National Heroes Day
  '2026-11-01', // All Saints' Day (special non-working)
  '2026-11-30', // Bonifacio Day
  '2026-12-24', // Christmas Eve (special non-working)
  '2026-12-25', // Christmas Day
  '2026-12-30', // Rizal Day
  '2026-12-31', // Last Day of the Year (special non-working)

  // 2027 (baseline — extend/correct once the year's proclamation is out)
  '2027-01-01', // New Year's Day
  '2027-04-01', // Maundy Thursday
  '2027-04-02', // Good Friday
  '2027-04-09', // Araw ng Kagitingan
  '2027-05-01', // Labor Day
  '2027-06-12', // Independence Day
  '2027-08-30', // National Heroes Day
  '2027-11-30', // Bonifacio Day
  '2027-12-25', // Christmas Day
  '2027-12-30', // Rizal Day
];

// ---------------------------------------------------------------------------
// Date helpers (UTC-based — avoids timezone pitfalls for date-only logic)
// ---------------------------------------------------------------------------

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** @internal Visible for testing */
export function toDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function isWeekend(date: Date): boolean {
  const d = date.getUTCDay();
  return d === 0 || d === 6; // Sunday = 0, Saturday = 6
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class PSETradingCalendar {
  private readonly holidaysSet: Set<string>;

  constructor(additionalHolidays?: readonly string[]) {
    this.holidaysSet = new Set<string>(STATIC_HOLIDAYS);
    if (additionalHolidays) {
      for (const h of additionalHolidays) {
        this.holidaysSet.add(h);
      }
    }
  }

  // ---- Configuration ---------------------------------------------------

  /** Add extra holiday(s) at runtime (e.g., from an API or config). */
  addHoliday(...dates: string[]): void {
    for (const d of dates) this.holidaysSet.add(d);
  }

  /** Replace the entire holiday set. */
  setHolidays(dates: string[]): void {
    this.holidaysSet.clear();
    for (const d of dates) this.holidaysSet.add(d);
  }

  /** Current holiday list (sorted). */
  getHolidays(): string[] {
    return [...this.holidaysSet].sort();
  }

  // ---- Queries ---------------------------------------------------------

  /** Is `date` a trading day for the Philippine market? */
  isTradingDay(date: Date = new Date()): boolean {
    const ds = toDateStr(date);
    return !isWeekend(date) && !this.holidaysSet.has(ds);
  }

  /** Is the market currently open?  Checks date + time. */
  isMarketOpen(now: Date = new Date()): boolean {
    return isMarketHour(now) && this.isTradingDay(now);
  }

  /** Get the previous trading day. */
  previousTradingDay(from: Date = new Date()): Date {
    const d = new Date(from);
    do {
      d.setUTCDate(d.getUTCDate() - 1);
    } while (!this.isTradingDay(d));
    return d;
  }

  /** Get the next trading day. */
  nextTradingDay(from: Date = new Date()): Date {
    const d = new Date(from);
    do {
      d.setUTCDate(d.getUTCDate() + 1);
    } while (!this.isTradingDay(d));
    return d;
  }

  /**
   * Get the last N trading days up to and including `from`.
   * Returns an array of date strings (earliest first).
   */
  lastTradingDays(n: number, from: Date = new Date()): string[] {
    const result: string[] = [];
    const cursor = new Date(from);

    while (result.length <= n) {
      if (this.isTradingDay(cursor)) {
        result.push(toDateStr(cursor));
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return result;
  }

  /**
   * Number of trading days between `start` and `end` (inclusive).
   */
  countTradingDays(start: Date, end: Date): number {
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      if (this.isTradingDay(cursor)) count++;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return count;
  }

  /** Is a given date string a holiday? */
  isHoliday(dateStr: string): boolean {
    return this.holidaysSet.has(dateStr);
  }
}

// ---------------------------------------------------------------------------
// Time-of-day check for Philippine market hours
// ---------------------------------------------------------------------------

/**
 * Check whether the current time falls within PSE equity market hours
 * (09:30–15:30 PHT).  Uses UTC math (PHT = UTC+8).
 */
export function isMarketHour(now: Date = new Date()): boolean {
  const utc = now.getTime();
  // Convert to PHT milliseconds-since-midnight
  const phtMs = (utc + 8 * 60 * 60 * 1000) % (24 * 60 * 60 * 1000);
  const openMs = 9 * 60 * 60 * 1000 + 30 * 60 * 1000;   // 09:30 PHT
  const closeMs = 15 * 60 * 60 * 1000 + 30 * 60 * 1000;  // 15:30 PHT
  return phtMs >= openMs && phtMs < closeMs;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const pseTradingCalendar = new PSETradingCalendar();
