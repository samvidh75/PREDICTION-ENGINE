import { describe, expect, it } from 'vitest';
import { buildHealthometerViewModel } from '../healthometerViewModel';

describe('healthometerViewModel', () => {
  it('builds Complete state when all dimensions have scores', () => {
    const vm = buildHealthometerViewModel(80, 60, 70, 65, 30, 55, 72);
    expect(vm.overallStatus).toBe('Complete');
    expect(vm.overallScore).toBe(62);
    expect(vm.dimensions).toHaveLength(7);
  });

  it('shows Partial research context when some dims are missing', () => {
    const vm = buildHealthometerViewModel(80, null, 70, null, null, null, null);
    expect(vm.overallStatus).toBe('Partial research context');
    expect(vm.overallScore).toBe(75);
  });

  it('shows Not enough information when no dims available', () => {
    const vm = buildHealthometerViewModel(null, null, null, null, null, null, null);
    expect(vm.overallStatus).toBe('Not enough information for this view yet');
    expect(vm.overallScore).toBeNull();
  });

  it('never renders N/A or NaN', () => {
    const vm = buildHealthometerViewModel(null, NaN, Infinity, undefined, 30, null, null);
    vm.dimensions.forEach((d) => {
      expect(d.score).not.toBeNaN();
      expect(Number.isFinite(d.score ?? 0)).toBe(true);
      expect(d.status).toMatch(/^(verified|partial|insufficient)$/);
    });
  });

  it('has no fake dimensions', () => {
    const vm = buildHealthometerViewModel(80, 60, 70, 65, 30, 55, 72);
    const labels = vm.dimensions.map((d) => d.label);
    expect(labels).toContain('Business quality');
    expect(labels).toContain('Financial strength');
    expect(labels).toContain('Valuation context');
    expect(labels).toContain('Growth');
    expect(labels).toContain('Stability');
    expect(labels).toContain('Risk context');
    expect(labels).toContain('Momentum');
  });
});
