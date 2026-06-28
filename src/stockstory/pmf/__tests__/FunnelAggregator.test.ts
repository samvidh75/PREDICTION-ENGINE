import { describe, it, expect } from 'vitest';
import { FunnelAggregator } from '../FunnelAggregator';
import { ProductEventNormalizer } from '../ProductEventNormalizer';

describe('FunnelAggregator', () => {
  const normalizer = new ProductEventNormalizer();
  const aggregator = new FunnelAggregator();

  function makeEvent(userId: string, action: string, eventType = 'discovery') {
    const raw = {
      eventType,
      action,
      userId,
      timestamp: new Date().toISOString(),
      metadata: { label: `Funnel: ${action}` },
    };
    return normalizer.normalize(raw);
  }

  it('initializes with zeroed funnel', () => {
    const funnel = aggregator.getCurrentConversion();
    expect(funnel).toBeDefined();
    expect(funnel.signup).toBe(0);
    expect(funnel.search).toBe(0);
    expect(funnel.stockView).toBe(0);
    expect(funnel.thesisRead).toBe(0);
    expect(funnel.actionTaken).toBe(0);
  });

  it('tracks activation funnel correctly', () => {
    const events = [
      ...makeEvent('user_1', 'page_view'),
      ...makeEvent('user_1', 'search'),
      ...makeEvent('user_1', 'stock_view'),
      ...makeEvent('user_1', 'thesis_read'),
      ...makeEvent('user_1', 'rating', 'feedback'),
    ];
    events.forEach((e) => aggregator.aggregate(e));

    const funnel = aggregator.getCurrentConversion();
    expect(funnel.signup).toBe(1);
    expect(funnel.search).toBe(1);
    expect(funnel.stockView).toBe(1);
    expect(funnel.thesisRead).toBe(1);
    expect(funnel.actionTaken).toBe(0);
  });

  it('calculates conversion rates between steps', () => {
    const events = [
      ...makeEvent('user_1', 'page_view'),
      ...makeEvent('user_1', 'search'),
      ...makeEvent('user_1', 'stock_view'),
    ];
    events.forEach((e) => aggregator.aggregate(e));

    const rates = aggregator.getConversionRates();
    expect(rates.signupToSearch).toBeDefined();
    expect(rates.searchToStockView).toBeDefined();
    expect(typeof rates.signupToSearch).toBe('number');
    expect(typeof rates.searchToStockView).toBe('number');
  });

  it('handles multiple users', () => {
    const allEvents = [
      ...makeEvent('user_1', 'page_view'),
      ...makeEvent('user_1', 'search'),
      ...makeEvent('user_1', 'stock_view'),
      ...makeEvent('user_2', 'page_view'),
      ...makeEvent('user_3', 'page_view'),
      ...makeEvent('user_3', 'search'),
    ];
    allEvents.forEach((e) => aggregator.aggregate(e));

    const funnel = aggregator.getCurrentConversion();
    expect(funnel.signup).toBe(3);
    expect(funnel.search).toBe(2);
    expect(funnel.stockView).toBe(1);
  });

  it('resets correctly', () => {
    aggregator.reset();
    const funnel = aggregator.getCurrentConversion();
    expect(funnel.signup).toBe(0);
  });
});
