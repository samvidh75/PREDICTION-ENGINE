import { describe, it, expect } from 'vitest';
import { PSETradingCalendar, isMarketHour } from '../calendar/PSETradingCalendar';

const cal = new PSETradingCalendar();

/** Create a UTC-midnight Date for a YYYY-MM-DD string. */
function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

describe('PSETradingCalendar', () => {
  describe('isTradingDay', () => {
    it('returns true for a weekday in middle of week', () => {
      expect(cal.isTradingDay(utcDate('2026-06-17'))).toBe(true); // Wednesday
    });

    it('returns false for Saturday', () => {
      expect(cal.isTradingDay(utcDate('2026-06-20'))).toBe(false);
    });

    it('returns false for Sunday', () => {
      expect(cal.isTradingDay(utcDate('2026-06-21'))).toBe(false);
    });

    it("returns false for New Year's Day (Jan 1)", () => {
      expect(cal.isTradingDay(utcDate('2026-01-01'))).toBe(false);
    });

    it('returns false for Independence Day (Jun 12)', () => {
      expect(cal.isTradingDay(utcDate('2026-06-12'))).toBe(false);
    });

    it('returns false for Bonifacio Day (Nov 30)', () => {
      expect(cal.isTradingDay(utcDate('2026-11-30'))).toBe(false);
    });
  });

  describe('isMarketOpen', () => {
    it('returns true during market hours on a trading day', () => {
      // 11:00 AM PHT = 3:00 UTC on a trading day
      const dt = new Date(Date.UTC(2026, 5, 17, 3, 0, 0));
      expect(cal.isMarketOpen(dt)).toBe(true);
    });

    it('returns false before market opens', () => {
      // 8:00 AM PHT = 0:00 UTC
      const dt = new Date(Date.UTC(2026, 5, 17, 0, 0, 0));
      expect(cal.isMarketOpen(dt)).toBe(false);
    });

    it('returns false after market closes', () => {
      // 4:00 PM PHT = 8:00 UTC
      const dt = new Date(Date.UTC(2026, 5, 17, 8, 0, 0));
      expect(cal.isMarketOpen(dt)).toBe(false);
    });

    it('returns false on a non-trading day', () => {
      // 11:00 AM PHT on Sunday
      const dt = new Date(Date.UTC(2026, 5, 21, 3, 0, 0));
      expect(cal.isMarketOpen(dt)).toBe(false);
    });
  });

  describe('previousTradingDay', () => {
    it('returns the previous trading day for Monday', () => {
      // Monday June 22 -> previous is Friday June 19 (not Saturday/Sunday)
      const prev = cal.previousTradingDay(utcDate('2026-06-22'));
      expect(prev.toISOString().slice(0, 10)).toBe('2026-06-19');
    });

    it('returns the previous trading day even if the given day is a trading day', () => {
      const prev = cal.previousTradingDay(utcDate('2026-06-17'));
      expect(prev.toISOString().slice(0, 10)).toBe('2026-06-16');
    });
  });

  describe('nextTradingDay', () => {
    it('returns next trading day for Friday', () => {
      // Friday June 19 -> next is Monday June 22
      const next = cal.nextTradingDay(utcDate('2026-06-19'));
      expect(next.toISOString().slice(0, 10)).toBe('2026-06-22');
    });

    it('returns Monday for Saturday', () => {
      const next = cal.nextTradingDay(utcDate('2026-06-20'));
      expect(next.toISOString().slice(0, 10)).toBe('2026-06-22');
    });

    it('returns Monday for Sunday', () => {
      const next = cal.nextTradingDay(utcDate('2026-06-21'));
      expect(next.toISOString().slice(0, 10)).toBe('2026-06-22');
    });
  });

  describe('lastTradingDays', () => {
    it('returns 5 trading days for mid-week day', () => {
      const days = cal.lastTradingDays(4, utcDate('2026-06-17'));
      expect(days).toHaveLength(5);
      // June 12 is Independence Day (holiday), so it's skipped along with
      // the weekend — the window extends back to June 10.
      expect(days).toContain('2026-06-17');
      expect(days).toContain('2026-06-16');
      expect(days).toContain('2026-06-15');
      expect(days).toContain('2026-06-11');
      expect(days).toContain('2026-06-10');
    });

    it('returns n calendar days (skipping weekends)', () => {
      // Monday June 22 -> 1 trading day back = Friday June 19
      const days = cal.lastTradingDays(1, utcDate('2026-06-22'));
      expect(days).toEqual(['2026-06-22', '2026-06-19']);
    });
  });

  describe('countTradingDays', () => {
    it('counts trading days between two dates', () => {
      // June 17 (Weds) to June 22 (Mon) -> 4 trading days (17, 18, 19, 22)
      const count = cal.countTradingDays(utcDate('2026-06-17'), utcDate('2026-06-22'));
      expect(count).toBe(4);
    });

    it('returns 1 for same day', () => {
      expect(cal.countTradingDays(utcDate('2026-06-17'), utcDate('2026-06-17'))).toBe(1);
    });
  });

  describe('isMarketHour', () => {
    it('returns true during core hours (9:30 AM - 3:30 PM PHT)', () => {
      // 11:00 AM PHT = 3:00 UTC
      const dt = new Date(Date.UTC(2026, 5, 17, 3, 0, 0));
      expect(isMarketHour(dt)).toBe(true);
    });

    it('returns false at 3:31 PM PHT', () => {
      const dt = new Date(Date.UTC(2026, 5, 17, 7, 31, 0));
      expect(isMarketHour(dt)).toBe(false);
    });

    it('returns false at 9:29 AM PHT', () => {
      const dt = new Date(Date.UTC(2026, 5, 17, 1, 29, 0));
      expect(isMarketHour(dt)).toBe(false);
    });
  });

  describe('static holiday list', () => {
    it('has at least 10 holidays defined for 2026', () => {
      expect(cal.getHolidays().length).toBeGreaterThanOrEqual(10);
    });

    it('includes all major PSE holidays', () => {
      const h = cal.getHolidays();
      expect(h).toContain("2026-01-01"); // New Year's Day
      expect(h).toContain('2026-06-12'); // Independence Day
      expect(h).toContain('2026-12-25'); // Christmas Day
    });
  });
});
