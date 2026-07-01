import { describe, it, expect } from 'vitest';
import { getEodDate, fmtDate, parseDate, weekDayName } from '../calendar/eodDateUtils';

describe('getEodDate', () => {
  it('returns YYYY-MM-DD for a given date', () => {
    expect(getEodDate(new Date('2026-06-17T00:00:00Z'))).toBe('2026-06-17');
  });

  it('uses UTC to avoid timezone issues', () => {
    // Test with a time near midnight in a different timezone
    const dt = new Date(Date.UTC(2026, 5, 17, 23, 30, 0));
    expect(getEodDate(dt)).toBe('2026-06-17');
  });

  it('formats single-digit month with leading zero', () => {
    expect(getEodDate(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05');
  });

  it('formats single-digit day with leading zero', () => {
    expect(getEodDate(new Date(Date.UTC(2026, 5, 3)))).toBe('2026-06-03');
  });
});

describe('fmtDate', () => {
  it('formats a date string to YYYY-MM-DD', () => {
    expect(fmtDate('2026-06-17')).toBe('2026-06-17');
  });

  it('returns the input for YYYY-MM-DD format', () => {
    expect(fmtDate('2026-01-01')).toBe('2026-01-01');
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
  it('returns "Wed" for Wednesday', () => {
    expect(weekDayName('2026-06-17')).toBe('Wed');
  });

  it('returns "Sat" for Saturday', () => {
    expect(weekDayName('2026-06-20')).toBe('Sat');
  });

  it('returns "Sun" for Sunday', () => {
    expect(weekDayName('2026-06-21')).toBe('Sun');
  });

  it('returns "Mon" for Monday', () => {
    expect(weekDayName('2026-06-22')).toBe('Mon');
  });
});
