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

    it('returns false for Republic Day (Jan 26)', () => {
      expect(cal.isTradingDay(utcDate('2026-01-26'))).toBe(false);
    });

    it('returns false for Independence Day (Aug 15)', () => {
      expect(cal.isTradingDay(utcDate('2026-08-15'))).toBe(false);
    });

    it('returns false for Gandhi Jayanti (Oct 2)', () => {
      expect(cal.isTradingDay(utcDate('2026-10-02'))).toBe(false);
    });
  });

  describe('isMarketOpen', () => {
    it('returns true during market hours on a trading day', () => {
      // 11:00 AM IST = 5:30 UTC on a trading day
      const dt = new Date(Date.UTC(2026, 5, 17, 5, 30, 0));
      expect(cal.isMarketOpen(dt)).toBe(true);
    });

    it('returns false before market opens', () => {
      // 8:00 AM IST = 2:30 UTC
      const dt = new Date(Date.UTC(2026, 5, 17, 2, 30, 0));
      expect(cal.isMarketOpen(dt)).toBe(false);
    });

    it('returns false after market closes', () => {
      // 4:00 PM IST = 10:30 UTC
      const dt = new Date(Date.UTC(2026, 5, 17, 10, 30, 0));
      expect(cal.isMarketOpen(dt)).toBe(false);
    });

    it('returns false on a non-trading day', () => {
      // 11:00 AM IST on Sunday
      const dt = new Date(Date.UTC(2026, 5, 21, 5, 30, 0));
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
      // Should include June 17, 16, 15, 12, 11 (skipping weekend, from + 4 back)
      expect(days).toContain('2026-06-17');
      expect(days).toContain('2026-06-16');
      expect(days).toContain('2026-06-15');
      expect(days).toContain('2026-06-12'); // Friday (no weekend in between)
      expect(days).toContain('2026-06-11');
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
    it('returns true during core hours (9:15 AM - 3:30 PM IST)', () => {
      // 11:00 AM IST = 5:30 UTC
      const dt = new Date(Date.UTC(2026, 5, 17, 5, 30, 0));
      expect(isMarketHour(dt)).toBe(true);
    });

    it('returns false at 3:31 PM IST', () => {
      const dt = new Date(Date.UTC(2026, 5, 17, 10, 1, 0));
      expect(isMarketHour(dt)).toBe(false);
    });

    it('returns false at 9:14 AM IST', () => {
      const dt = new Date(Date.UTC(2026, 5, 17, 3, 44, 0));
      expect(isMarketHour(dt)).toBe(false);
    });
  });

  describe('static holiday list', () => {
    it('has at least 10 holidays defined for 2026', () => {
      expect(cal.getHolidays().length).toBeGreaterThanOrEqual(10);
    });

    it('includes all major PSE holidays', () => {
      const h = cal.getHolidays();
      expect(h).toContain('2026-01-26'); // Republic Day
      expect(h).toContain('2026-10-02'); // Gandhi Jayanti
      expect(h).toContain('2026-10-09'); // Dussehra
    });
  });
});
