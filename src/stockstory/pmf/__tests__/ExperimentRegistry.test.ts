import { describe, it, expect } from 'vitest';
import { ExperimentRegistry } from '../ExperimentRegistry';

describe('ExperimentRegistry', () => {
  it('registers experiments', () => {
    const registry = new ExperimentRegistry();
    registry.register({
      id: 'test_exp_1',
      name: 'Test Experiment',
      description: 'A test experiment',
      owner: 'Product',
      variants: [
        { id: 'control', name: 'Control', trafficPercent: 50 },
        { id: 'treatment', name: 'Treatment', trafficPercent: 50 },
      ],
      metrics: ['pmf.activation.signup_completed'],
      startDate: '2024-01-01',
    });
    expect(registry.get('test_exp_1')).toBeDefined();
  });

  it('prevents duplicate experiment registration', () => {
    const registry = new ExperimentRegistry();
    registry.register({
      id: 'dup_exp',
      name: 'First',
      description: 'First',
      owner: 'Product',
      variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
      metrics: ['pmf.activation.signup_completed'],
      startDate: '2024-01-01',
    });
    expect(() =>
      registry.register({
        id: 'dup_exp',
        name: 'Second',
        description: 'Second',
        owner: 'Product',
        variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
        metrics: ['pmf.activation.signup_completed'],
        startDate: '2024-01-01',
      }),
    ).toThrow();
  });

  it('validates variant traffic adds to 100', () => {
    const registry = new ExperimentRegistry();
    expect(() =>
      registry.register({
        id: 'bad_variant',
        name: 'Bad Variant',
        description: 'Should fail',
        owner: 'Product',
        variants: [
          { id: 'control', name: 'Control', trafficPercent: 50 },
          { id: 'treatment', name: 'Treatment', trafficPercent: 30 },
        ],
        metrics: ['pmf.activation.signup_completed'],
        startDate: '2024-01-01',
      }),
    ).toThrow();
  });

  it('lists all experiments', () => {
    const registry = new ExperimentRegistry();
    registry.register({
      id: 'exp_a',
      name: 'Exp A',
      description: 'A',
      owner: 'Product',
      variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
      metrics: ['pmf.activation.signup_completed'],
      startDate: '2024-01-01',
    });
    registry.register({
      id: 'exp_b',
      name: 'Exp B',
      description: 'B',
      owner: 'Product',
      variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
      metrics: ['pmf.activation.first_search'],
      startDate: '2024-01-01',
    });
    const all = registry.list();
    expect(all.length).toBe(2);
  });

  it('validates metrics exist in PmfMetricRegistry', () => {
    const registry = new ExperimentRegistry();
    expect(() =>
      registry.register({
        id: 'bad_metric',
        name: 'Bad Metric',
        description: 'Should fail',
        owner: 'Product',
        variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
        metrics: ['pmf.nonexistent.metric'],
        startDate: '2024-01-01',
      }),
    ).toThrow();
  });
});
