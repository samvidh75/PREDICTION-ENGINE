// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — India trading calendar
//
// Pure server-side logic for determining trading days, holidays, and
// market-open status for Indian equity markets (NSE + BSE).
//
// NSE and BSE share the same holiday calendar (secular holidays).
// Trading hours: Mon–Fri 09:15–15:30 IST (UTC+05:30).
// ─────────────────────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Static holiday list
// ---------------------------------------------------------------------------
// NSE declares annual holiday calendars.  This static list is a baseline;
// production deployments should update it at the start of each calendar year.
// Format: 'YYYY-MM-DD'

const STATIC_HOLIDAYS: readonly string[] = [
  // 2026
  '2026-01-26', // Republic Day
  '2026-03-17', // Holi
  '2026-03-25', // Ramzan-Id-Ul-Fitar (Eid-ul-Fitr)
  '2026-04-03', // Good Friday
  '2026-04-14', // Dr. Baba Saheb Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-07-01', // Ramzan-Id-Ul-Zuha (Bakri Eid)
  '2026-07-30', // Muharram
  '2026-08-19', // Parsi New Year
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-10-09', // Dussehra
  '2026-10-28', // Diwali-Laxmi Pujan
  '2026-11-05', // Gurunanak Jayanti
  '2026-11-24', // Id-E-Milad
  '2026-12-25', // Christmas

  // 2027 (major — extend before year-end)
  '2027-01-26', // Republic Day
  '2027-03-05', // Holi
  '2027-03-26', // Good Friday
  '2027-04-14', // Dr. Baba Saheb Ambedkar Jayanti
  '2027-11-23', // Gurunanak Jayanti
];

// ---------------------------------------------------------------------------
// Date helpers (UTC-based — avoids timezone pitfalls for date-only logic)
// ---------------------------------------------------------------------------

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function isWeekend(date: Date): boolean {
  const d = date.getUTCDay();
  return d === 0 || d === 6; // Sunday = 0, Saturday = 6
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class IndiaTradingCalendar {
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

  /** Is `date` a trading day for Indian markets? */
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
// Time-of-day check for Indian market hours
// ---------------------------------------------------------------------------

/**
 * Check whether the current time falls within Indian equity market hours
 * (09:15–15:30 IST).  Uses UTC math (IST = UTC+05:30).
 */
export function isMarketHour(now: Date = new Date()): boolean {
  const utc = now.getTime();
  // Convert to IST milliseconds-since-midnight
  const istMs = (utc + 5.5 * 60 * 60 * 1000) % (24 * 60 * 60 * 1000);
  const openMs = 9 * 60 * 60 * 1000 + 15 * 60 * 1000;   // 09:15 IST
  const closeMs = 15 * 60 * 60 * 1000 + 30 * 60 * 1000;  // 15:30 IST
  return istMs >= openMs && istMs < closeMs;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const indiaTradingCalendar = new IndiaTradingCalendar();
