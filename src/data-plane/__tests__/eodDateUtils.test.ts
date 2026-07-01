import { describe, it, expect } from 'vitest';
import { getEodDate, fmtDate, parseDate, weekDayName } from '../calendar/eodDateUtils';

describe('getEodDate', () => {
  // getEodDate returns the last completed trading day.
  // At 00:00 UTC (05:30 IST) the market hasn't opened yet, so the
  // "EOD date" is the previous trading day.

  it('returns previous trading day for pre-close UTC midnight', () => {
    // June 17 00:00 UTC = 5:30 AM IST — before market open
    // prevTradingDay(June 17) → June 16 (Tuesday)
    expect(getEodDate(new Date('2026-06-17T00:00:00Z'))).toBe('2026-06-16');
  });

  it('returns previous trading day near midnight UTC', () => {
    // June 17 23:30 UTC = 5:00 AM IST June 18 — before market open
    // The function checks the UTC date (June 17), which is a trading day,
    // IST is 5:00 AM (before close), so prevTradingDay → June 16
    const dt = new Date(Date.UTC(2026, 5, 17, 23, 30, 0));
    expect(getEodDate(dt)).toBe('2026-06-16');
  });

  it('formats single-digit month with leading zero', () => {
    // Jan 5 00:00 UTC = 5:30 AM IST — before market open
    // prevTradingDay(Jan 5) → skips weekend → Jan 2 (Friday)
    expect(getEodDate(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-02');
  });

  it('formats single-digit day with leading zero', () => {
    // June 3 00:00 UTC = 5:30 AM IST — before market open
    // prevTradingDay(June 3) → June 2 (Tuesday)
    expect(getEodDate(new Date(Date.UTC(2026, 5, 3)))).toBe('2026-06-02');
  });
});

describe('fmtDate', () => {
  it('formats a date string to YYYY-MM-DD', () => {
    expect(fmtDate(new Date('2026-06-17T00:00:00Z'))).toBe('2026-06-17');
  });

  it('returns the input for YYYY-MM-DD format', () => {
    expect(fmtDate(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01');
  });
});

describe('parseDate', () => {
  it('parses YYYY-MM-DD to Date', () => {
    const d = parseDate('2026-06-17');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(5); // 0-based
    expect(d.getUTCDate()).toBe(17);
  });

  it('handles date string with time component', () => {
    const d = parseDate('2026-06-17T12:00:00Z');
    expect(d.getUTCFullYear()).toBe(2026);
  });
});

describe('weekDayName', () => {
  it('returns "Wednesday" for Wednesday', () => {
    expect(weekDayName('2026-06-17')).toBe('Wednesday');
  });

  it('returns "Saturday" for Saturday', () => {
    expect(weekDayName('2026-06-20')).toBe('Saturday');
  });

  it('returns "Sunday" for Sunday', () => {
    expect(weekDayName('2026-06-21')).toBe('Sunday');
  });

  it('returns "Monday" for Monday', () => {
    expect(weekDayName('2026-06-22')).toBe('Monday');
  });
});
