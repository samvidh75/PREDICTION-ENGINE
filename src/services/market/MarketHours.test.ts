import { describe, it, expect } from 'vitest';
import { MarketHours } from './MarketHours';

function phtDateTime(iso: string): Date {
  return new Date(iso);
}

describe('MarketHours', () => {
  const tueMorning = phtDateTime('2026-07-28T01:00:00Z'); // 09:00 PHT Tuesday
  const tueOpen = phtDateTime('2026-07-28T01:30:00Z'); // 09:30 PHT
  const tueLunch = phtDateTime('2026-07-28T04:00:00Z'); // 12:00 PHT
  const tueAfternoon = phtDateTime('2026-07-28T05:00:00Z'); // 13:00 PHT
  const tueClose = phtDateTime('2026-07-28T07:30:00Z'); // 15:30 PHT
  const tueFreeze = phtDateTime('2026-07-28T08:00:00Z'); // 16:00 PHT
  const saturday = phtDateTime('2026-07-25T04:00:00Z'); // 12:00 PHT Saturday

  it('detects a market day', () => {
    expect(MarketHours.isMarketDay(tueMorning)).toBe(true);
    expect(MarketHours.isMarketDay(saturday)).toBe(false);
  });

  it('treats the morning session as open', () => {
    expect(MarketHours.isMarketOpen(tueOpen)).toBe(true);
    expect(MarketHours.isMarketOpen(tueAfternoon)).toBe(true);
  });

  it('treats the lunch break as closed', () => {
    expect(MarketHours.isLunchBreak(tueLunch)).toBe(true);
    expect(MarketHours.isMarketOpen(tueLunch)).toBe(false);
  });

  it('treats pre-open auction window as pre-market, not open', () => {
    expect(MarketHours.isPreMarket(tueMorning)).toBe(true);
    expect(MarketHours.isMarketOpen(tueMorning)).toBe(false);
  });

  it('treats after close as closed and post-market after freeze', () => {
    expect(MarketHours.isMarketOpen(tueClose)).toBe(false);
    expect(MarketHours.isPostMarket(tueFreeze)).toBe(true);
    expect(MarketHours.isPostMarket(tueClose)).toBe(false);
  });

  it('only uses live providers during trading sessions', () => {
    expect(MarketHours.shouldUseLiveProviders(tueOpen)).toBe(true);
    expect(MarketHours.shouldUseLiveProviders(tueLunch)).toBe(false);
    expect(MarketHours.shouldUseLiveProviders(saturday)).toBe(false);
  });

  it('freezes quotes on weekends and after market close', () => {
    expect(MarketHours.shouldFreezeQuotes(saturday)).toBe(true);
    expect(MarketHours.shouldFreezeQuotes(tueFreeze)).toBe(true);
    expect(MarketHours.shouldFreezeQuotes(tueOpen)).toBe(false);
  });

  it('reports the full status ladder', () => {
    expect(MarketHours.getStatus(tueMorning)).toBe('auction');
    expect(MarketHours.getStatus(tueOpen)).toBe('open');
    expect(MarketHours.getStatus(tueLunch)).toBe('lunch');
    expect(MarketHours.getStatus(tueAfternoon)).toBe('open');
    expect(MarketHours.getStatus(tueClose)).toBe('closing');
    expect(MarketHours.getStatus(tueFreeze)).toBe('post-market');
    expect(MarketHours.getStatus(saturday)).toBe('weekend');
  });
});
