import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerExperiment,
  getExperiment,
  getAllExperiments,
  clearExperiments,
} from '../ExperimentRegistry';

describe('ExperimentRegistry', () => {
  beforeEach(() => {
    clearExperiments();
  });

  it('registers experiments', () => {
    registerExperiment({
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
    const exp = getExperiment('test_exp_1');
    expect(exp).toBeDefined();
    expect(exp!.name).toBe('Test Experiment');
  });

  it('prevents duplicate experiment registration', () => {
    registerExperiment({
      id: 'dup_exp',
      name: 'First',
      description: 'First',
      owner: 'Product',
      variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
      metrics: ['pmf.activation.signup_completed'],
      startDate: '2024-01-01',
    });
    expect(() =>
      registerExperiment({
        id: 'dup_exp',
        name: 'Second',
        description: 'Second',
        owner: 'Product',
        variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
        metrics: ['pmf.activation.signup_completed'],
        startDate: '2024-01-01',
      }),
    ).toThrow('already registered');
  });

  it('validates variant traffic adds to 100', () => {
    expect(() =>
      registerExperiment({
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
    registerExperiment({
      id: 'exp_a',
      name: 'Exp A',
      description: 'A',
      owner: 'Product',
      variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
      metrics: ['pmf.activation.signup_completed'],
      startDate: '2024-01-01',
    });
    registerExperiment({
      id: 'exp_b',
      name: 'Exp B',
      description: 'B',
      owner: 'Product',
      variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
      metrics: ['pmf.activation.first_search'],
      startDate: '2024-01-01',
    });
    const all = getAllExperiments();
    expect(all.length).toBe(2);
  });

  it('validates metrics exist in PmfMetricRegistry', () => {
    expect(() =>
      registerExperiment({
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
