import { describe, it, expect, beforeEach } from 'vitest';
import { AlertEngine, PriceSnapshot } from '../AlertEngine';

const engine = new AlertEngine();

function makeSnapshot(overrides: Partial<PriceSnapshot> = {}): PriceSnapshot {
  return {
    symbol: 'RELIANCE',
    price: 2500,
    change: 25,
    changePercent: 1.01,
    volume: 5000000,
    rsi: 55,
    macd: 10,
    macdSignal: 8,
    bollingerUpper: 2600,
    bollingerLower: 2400,
    sma50: 2480,
    sma200: 2450,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('AlertEngine', () => {
  beforeEach(() => {
    engine.clearAll();
  });

  it('should add and retrieve alerts', () => {
    const alert = engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'price_above',
      value: 3000,
      repeat: 'once',
      label: 'RELIANCE above 3000',
      enabled: true,
    });
    expect(alert.id).toBeTruthy();
    expect(alert.triggeredCount).toBe(0);
    expect(engine.count).toBe(1);
  });

  it('should trigger price_above condition', () => {
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'price_above',
      value: 2400,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    const events = engine.evaluate(makeSnapshot({ price: 2500 }));
    expect(events.length).toBe(1);
    expect(events[0].condition).toBe('price_above');
    expect(events[0].severity).toBe('warning');
  });

  it('should not trigger condition when not met', () => {
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'price_above',
      value: 3000,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    const events = engine.evaluate(makeSnapshot({ price: 2500 }));
    expect(events.length).toBe(0);
  });

  it('should trigger price_below condition', () => {
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'price_below',
      value: 2600,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    const events = engine.evaluate(makeSnapshot({ price: 2500 }));
    expect(events.length).toBe(1);
    expect(events[0].condition).toBe('price_below');
  });

  it('should trigger change_percent condition', () => {
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'change_percent',
      value: 1,
      repeat: 'always',
      label: 'Test',
      enabled: true,
    });
    const events = engine.evaluate(makeSnapshot({ changePercent: 2.5 }));
    expect(events.length).toBe(1);
    expect(events[0].condition).toBe('change_percent');
  });

  it('should trigger rsi_oversold condition', () => {
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'rsi_oversold',
      value: 30,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    const events = engine.evaluate(makeSnapshot({ rsi: 25 }));
    expect(events.length).toBe(1);
    expect(events[0].condition).toBe('rsi_oversold');
  });

  it('should trigger rsi_overbought condition', () => {
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'rsi_overbought',
      value: 70,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    const events = engine.evaluate(makeSnapshot({ rsi: 75 }));
    expect(events.length).toBe(1);
    expect(events[0].condition).toBe('rsi_overbought');
  });

  it('should trigger bollinger_breakout condition', () => {
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'bollinger_breakout',
      value: 0,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    const events = engine.evaluate(makeSnapshot({ price: 2700, bollingerUpper: 2600 }));
    expect(events.length).toBe(1);
    expect(events[0].severity).toBe('critical');
  });

  it('should trigger volume_spike condition', () => {
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'volume_spike',
      value: 1000,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    const events = engine.evaluate(makeSnapshot({ volume: 5000000 }));
    expect(events.length).toBe(1);
  });

  it('should disable alert after single trigger with repeat=once', () => {
    const alert = engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'price_above',
      value: 2400,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    engine.evaluate(makeSnapshot({ price: 2500 }));
    const stored = engine.getAlerts('RELIANCE').find(a => a.id === alert.id);
    expect(stored?.enabled).toBe(false);
    expect(stored?.triggeredCount).toBe(1);
  });

  it('should remove alert', () => {
    const alert = engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'price_above',
      value: 3000,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    expect(engine.removeAlert(alert.id)).toBe(true);
    expect(engine.count).toBe(0);
  });

  it('should call listeners on trigger', () => {
    const events: string[] = [];
    engine.onAlert((e) => events.push(e.condition));
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'price_above',
      value: 2400,
      repeat: 'always',
      label: 'Test',
      enabled: true,
    });
    engine.evaluate(makeSnapshot({ price: 2500 }));
    expect(events).toContain('price_above');
  });

  it('should evaluate batch snapshots', () => {
    engine.addAlert({
      symbol: 'RELIANCE',
      condition: 'price_above',
      value: 2400,
      repeat: 'once',
      label: 'Test',
      enabled: true,
    });
    engine.addAlert({
      symbol: 'TCS',
      condition: 'price_below',
      value: 3000,
      repeat: 'once',
      label: 'Test2',
      enabled: true,
    });
    const events = engine.evaluateBatch([
      makeSnapshot({ symbol: 'RELIANCE', price: 2500 }),
      makeSnapshot({ symbol: 'TCS', price: 2800 }),
    ]);
    expect(events.length).toBe(2);
  });
});
