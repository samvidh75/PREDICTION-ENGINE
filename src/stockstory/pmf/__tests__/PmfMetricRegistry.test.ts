import { describe, it, expect } from 'vitest';
import { PmfMetricRegistry } from '../PmfMetricRegistry';

describe('PmfMetricRegistry', () => {
  it('registers all expected metric keys', () => {
    const all = PmfMetricRegistry.getAll();
    expect(all.length).toBeGreaterThan(20);
  });

  it('returns metric by valid key', () => {
    const metric = PmfMetricRegistry.get('pmf.activation.signup_completed');
    expect(metric).toBeDefined();
    expect(metric?.category).toBe('activation');
  });

  it('returns undefined for unknown key', () => {
    const metric = PmfMetricRegistry.get('pmf.nonexistent.key');
    expect(metric).toBeUndefined();
  });

  it('groups metrics by category', () => {
    const activation = PmfMetricRegistry.getByCategory('activation');
    expect(activation.length).toBeGreaterThan(0);
    activation.forEach((m) => expect(m.category).toBe('activation'));
  });

  it('validates metric keys correctly', () => {
    expect(PmfMetricRegistry.validateKey('pmf.activation.signup_completed')).toBe(true);
    expect(PmfMetricRegistry.validateKey('invalid.key')).toBe(false);
    expect(PmfMetricRegistry.validateKey('')).toBe(false);
  });

  it('has proper typing for all metrics', () => {
    const all = PmfMetricRegistry.getAll();
    for (const m of all) {
      expect(m.key).toMatch(/^pmf\./);
      expect(m.name).toBeTruthy();
      expect(m.category).toMatch(/^(activation|retention|engagement|research|search|scanner|alert|scenario|premium|experiment)$/);
      expect(['ratio', 'count', 'histogram', 'duration', 'boolean']).toContain(m.type);
    }
  });

  it('includes all 10 metric categories', () => {
    const categories = new Set(PmfMetricRegistry.getAll().map((m) => m.category));
    expect(categories.size).toBe(10);
    expect(categories.has('activation')).toBe(true);
    expect(categories.has('retention')).toBe(true);
    expect(categories.has('engagement')).toBe(true);
    expect(categories.has('research')).toBe(true);
    expect(categories.has('search')).toBe(true);
    expect(categories.has('scanner')).toBe(true);
    expect(categories.has('alert')).toBe(true);
    expect(categories.has('scenario')).toBe(true);
    expect(categories.has('premium')).toBe(true);
    expect(categories.has('experiment')).toBe(true);
  });
});
