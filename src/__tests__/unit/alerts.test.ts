import { AlertRuleEngine } from '../../services/alerts/AlertRuleEngine';
import { AlertRule, MarketDataPoint } from '../../services/alerts/types';

const baseRule: AlertRule = {
  id: 'rule-1',
  userId: 'user-1',
  ticker: 'TCS',
  condition: { type: 'price', leg: { field: 'price', operator: 'gt', value: 4000 } },
  enabled: true,
  notifyChannels: ['push'],
  maxAlertsPerHour: 10,
};

const NOON_UTC = Date.UTC(2024, 5, 15, 12, 0, 0); // arbitrary weekday noon

describe('AlertRuleEngine', () => {
  const engine = () => new AlertRuleEngine();

  it('triggers a simple price > threshold rule', () => {
    const result = engine().evaluate(baseRule, { ticker: 'TCS', price: 4001, volume: 1000 }, NOON_UTC);
    expect(result.triggered).toBe(true);
  });

  it('does not trigger when condition is not met', () => {
    const result = engine().evaluate(baseRule, { ticker: 'TCS', price: 3999, volume: 1000 }, NOON_UTC);
    expect(result.triggered).toBe(false);
  });

  it('does not trigger for a disabled rule', () => {
    const result = engine().evaluate({ ...baseRule, enabled: false }, { ticker: 'TCS', price: 5000, volume: 1000 }, NOON_UTC);
    expect(result.triggered).toBe(false);
    expect(result.suppressedReason).toBe('disabled');
  });

  it('rejects a snapshot for the wrong ticker', () => {
    const result = engine().evaluate(baseRule, { ticker: 'INFY', price: 5000, volume: 1000 }, NOON_UTC);
    expect(result.triggered).toBe(false);
    expect(result.reason).toMatch(/ticker mismatch/);
  });

  it('evaluates crosses_above only with a matching prior snapshot', () => {
    const rule: AlertRule = {
      ...baseRule,
      condition: { type: 'indicator', leg: { field: 'rsi_14', operator: 'crosses_above', value: 0.7 } },
    };
    const prev: MarketDataPoint = { ticker: 'TCS', price: 4000, volume: 1000, rsi14: 0.65 };
    const curr: MarketDataPoint = { ticker: 'TCS', price: 4000, volume: 1000, rsi14: 0.75 };
    expect(engine().evaluate(rule, curr, NOON_UTC, prev).triggered).toBe(true);
    expect(engine().evaluate(rule, curr, NOON_UTC).triggered).toBe(false); // no previous -> can't confirm cross
  });

  it('does not trigger crosses_above if already above in the prior snapshot too', () => {
    const rule: AlertRule = {
      ...baseRule,
      condition: { type: 'indicator', leg: { field: 'rsi_14', operator: 'crosses_above', value: 0.7 } },
    };
    const prev: MarketDataPoint = { ticker: 'TCS', price: 4000, volume: 1000, rsi14: 0.72 };
    const curr: MarketDataPoint = { ticker: 'TCS', price: 4000, volume: 1000, rsi14: 0.75 };
    expect(engine().evaluate(rule, curr, NOON_UTC, prev).triggered).toBe(false);
  });

  it('evaluates multi-leg AND rules requiring all legs true', () => {
    const rule: AlertRule = {
      ...baseRule,
      condition: {
        type: 'multi_leg',
        logic: 'and',
        legs: [
          { field: 'price', operator: 'gt', value: 4000 },
          { field: 'rsi_14', operator: 'lt', value: 0.3 },
        ],
      },
    };
    const bothTrue: MarketDataPoint = { ticker: 'TCS', price: 4100, volume: 1000, rsi14: 0.2 };
    const oneTrue: MarketDataPoint = { ticker: 'TCS', price: 4100, volume: 1000, rsi14: 0.5 };
    expect(engine().evaluate(rule, bothTrue, NOON_UTC).triggered).toBe(true);
    expect(engine().evaluate(rule, oneTrue, NOON_UTC).triggered).toBe(false);
  });

  it('evaluates multi-leg OR rules requiring any leg true', () => {
    const rule: AlertRule = {
      ...baseRule,
      condition: {
        type: 'multi_leg',
        logic: 'or',
        legs: [
          { field: 'price', operator: 'gt', value: 9999 },
          { field: 'rsi_14', operator: 'lt', value: 0.3 },
        ],
      },
    };
    const oneTrue: MarketDataPoint = { ticker: 'TCS', price: 4100, volume: 1000, rsi14: 0.2 };
    expect(engine().evaluate(rule, oneTrue, NOON_UTC).triggered).toBe(true);
  });

  it('rejects a multi_leg rule with no legs', () => {
    const rule: AlertRule = { ...baseRule, condition: { type: 'multi_leg', legs: [] } };
    expect(() => engine().evaluate(rule, { ticker: 'TCS', price: 4100, volume: 1000 }, NOON_UTC)).toThrow();
  });

  it('suppresses alerts inside the do-not-disturb window (same-day)', () => {
    const rule: AlertRule = { ...baseRule, doNotDisturbStart: '09:00', doNotDisturbEnd: '17:00' };
    const result = engine().evaluate(rule, { ticker: 'TCS', price: 4500, volume: 1000 }, NOON_UTC);
    expect(result.triggered).toBe(false);
    expect(result.suppressedReason).toBe('do_not_disturb');
  });

  it('suppresses alerts inside an overnight do-not-disturb window', () => {
    const rule: AlertRule = { ...baseRule, doNotDisturbStart: '22:00', doNotDisturbEnd: '06:00' };
    const midnight = Date.UTC(2024, 5, 15, 23, 30, 0);
    const result = engine().evaluate(rule, { ticker: 'TCS', price: 4500, volume: 1000 }, midnight);
    expect(result.triggered).toBe(false);
    expect(result.suppressedReason).toBe('do_not_disturb');
  });

  it('allows alerts outside the do-not-disturb window', () => {
    const rule: AlertRule = { ...baseRule, doNotDisturbStart: '22:00', doNotDisturbEnd: '06:00' };
    const result = engine().evaluate(rule, { ticker: 'TCS', price: 4500, volume: 1000 }, NOON_UTC);
    expect(result.triggered).toBe(true);
  });

  it('rate-limits triggers within the same hour', () => {
    const e = engine();
    const rule: AlertRule = { ...baseRule, maxAlertsPerHour: 2 };
    const snap: MarketDataPoint = { ticker: 'TCS', price: 4500, volume: 1000 };
    expect(e.evaluate(rule, snap, NOON_UTC).triggered).toBe(true);
    expect(e.evaluate(rule, snap, NOON_UTC + 1000).triggered).toBe(true);
    const third = e.evaluate(rule, snap, NOON_UTC + 2000);
    expect(third.triggered).toBe(false);
    expect(third.suppressedReason).toBe('rate_limited');
  });

  it('resets the rate limit after the hourly window elapses', () => {
    const e = engine();
    const rule: AlertRule = { ...baseRule, maxAlertsPerHour: 1 };
    const snap: MarketDataPoint = { ticker: 'TCS', price: 4500, volume: 1000 };
    expect(e.evaluate(rule, snap, NOON_UTC).triggered).toBe(true);
    expect(e.evaluate(rule, snap, NOON_UTC + 1000).triggered).toBe(false);
    expect(e.evaluate(rule, snap, NOON_UTC + 3_600_001).triggered).toBe(true);
  });

  it('does not trigger when the compared field is missing from the snapshot', () => {
    const rule: AlertRule = {
      ...baseRule,
      condition: { type: 'indicator', leg: { field: 'rsi_14', operator: 'gt', value: 0.7 } },
    };
    const result = engine().evaluate(rule, { ticker: 'TCS', price: 4500, volume: 1000 }, NOON_UTC);
    expect(result.triggered).toBe(false);
    expect(result.reason).toMatch(/unavailable/);
  });
});
