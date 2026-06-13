import { describe, expect, it } from 'vitest';
import type { CompanyTelemetry } from '../../types/stock';
import { TelemetrySnapshotFactory } from './TelemetrySnapshotFactory';

function telemetry(overrides: Partial<CompanyTelemetry> = {}): CompanyTelemetry {
  return {
    symbol: 'RELIANCE',
    marketCap: { numeric: null, formatted: 'Data unavailable', availability: 'unavailable' },
    peRatio: 20,
    fiftyTwoWeekRange: { low: 1000, high: 1600, current: 1400 },
    healthStatus: null,
    lastUpdated: '2026-06-13T09:30:00.000Z',
    ...overrides,
  };
}

describe('TelemetrySnapshotFactory', () => {
  it('returns unavailable when PE ratio is missing', () => {
    expect(TelemetrySnapshotFactory.create(telemetry({ peRatio: null }))).toBeNull();
  });

  it('returns unavailable when the 52-week range is missing or invalid', () => {
    expect(TelemetrySnapshotFactory.create(telemetry({ fiftyTwoWeekRange: { low: null, high: 1600, current: 1400 } }))).toBeNull();
    expect(TelemetrySnapshotFactory.create(telemetry({ fiftyTwoWeekRange: { low: 1600, high: 1000, current: 1400 } }))).toBeNull();
  });

  it('builds a snapshot only from complete source-backed telemetry', () => {
    const snapshot = TelemetrySnapshotFactory.create(telemetry());
    expect(snapshot).not.toBeNull();
    expect(snapshot?.lastUpdated).toBe('2026-06-13T09:30:00.000Z');
  });

  it('does not substitute generation time when source timestamp is missing', () => {
    const snapshot = TelemetrySnapshotFactory.create(telemetry({ lastUpdated: null }));
    expect(snapshot?.lastUpdated).toBe('Data unavailable');
  });
});
