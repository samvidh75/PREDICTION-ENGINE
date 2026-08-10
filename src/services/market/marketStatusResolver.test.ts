import { describe, it, expect } from 'vitest';
import { resolveMarketStatus, phtDateString, minutesUntilNextOpen } from './marketStatusResolver';

/** PHT is UTC+8 — construct a Date from a PHT wall-clock string. */
function pht(isoUtc: string): Date {
  return new Date(isoUtc);
}

// A weekday where every date is a trading day.
const alwaysTrading = () => true;

describe('resolveMarketStatus', () => {
  it('reports holiday before anything else', () => {
    const tue = pht('2026-07-28T01:30:00Z'); // 09:30 PHT Tuesday
    const res = resolveMarketStatus(tue, true, alwaysTrading);
    expect(res.status).toBe('holiday');
    expect(res.isOpen).toBe(false);
    expect(res.minutesToClose).toBeNull();
  });

  it('detects the open session and computes minutes to close', () => {
    const tue = pht('2026-07-28T01:30:00Z'); // 09:30 PHT
    const res = resolveMarketStatus(tue, false, alwaysTrading);
    expect(res.status).toBe('open');
    expect(res.isOpen).toBe(true);
    expect(res.minutesToClose).toBe(360); // 15:30 − 09:30
  });

  it('detects the lunch break', () => {
    const tue = pht('2026-07-28T04:00:00Z'); // 12:00 PHT
    const res = resolveMarketStatus(tue, false, alwaysTrading);
    expect(res.status).toBe('lunch');
    expect(res.isOpen).toBe(false);
  });

  it('detects the pre-open auction window', () => {
    const tue = pht('2026-07-28T01:00:00Z'); // 09:00 PHT
    const res = resolveMarketStatus(tue, false, alwaysTrading);
    expect(res.status).toBe('auction');
    expect(res.isOpen).toBe(false);
  });

  it('detects weekend', () => {
    const sat = pht('2026-07-25T04:00:00Z'); // 12:00 PHT Saturday
    const res = resolveMarketStatus(sat, false, alwaysTrading);
    expect(res.status).toBe('weekend');
    expect(res.isOpen).toBe(false);
  });

  it('computes next-open minutes respecting holidays', () => {
    // Friday 18:00 PHT (market closed); Sat+Sun closed; next open Monday 09:30 PHT.
    const fri = pht('2026-07-24T10:00:00Z'); // 18:00 PHT Friday
    const weekdayOnly = (d: Date) => {
      const day = d.getUTCDay();
      return day !== 0 && day !== 6;
    };
    const res = resolveMarketStatus(fri, false, weekdayOnly);
    // 18:00 Fri → 09:30 Mon = 63.5h = 3810 minutes
    expect(res.minutesToNextOpen).toBe(3810);
  });

  it('exposes the full session schedule', () => {
    const tue = pht('2026-07-28T05:00:00Z'); // 13:00 PHT
    const res = resolveMarketStatus(tue, false, alwaysTrading);
    expect(res.schedule).toEqual({
      preOpen: '09:00',
      open: '09:30',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      close: '15:30',
    });
    expect(res.timezone).toBe('Asia/Manila');
  });
});

describe('phtDateString', () => {
  it('computes the Manila calendar date, not the UTC date', () => {
    // 2026-07-28T16:30:00Z is 2026-07-29 00:30 PHT (next day).
    const lateUtc = new Date('2026-07-28T16:30:00Z');
    expect(phtDateString(lateUtc)).toBe('2026-07-29');
    expect(new Date(lateUtc).toISOString().slice(0, 10)).toBe('2026-07-28');
  });
});

describe('minutesUntilNextOpen', () => {
  it('returns null when no trading day found in the window', () => {
    const neverTrading = () => false;
    const fri = new Date('2026-07-24T02:00:00Z');
    expect(minutesUntilNextOpen(fri, neverTrading)).toBeNull();
  });

  it('skips the same-day open once it has passed', () => {
    // Monday 14:00 PHT — next open is Tuesday 09:30 PHT (1170 min later).
    const mon = new Date('2026-07-27T06:00:00Z');
    expect(minutesUntilNextOpen(mon, alwaysTrading)).toBe(1170);
  });
});
