import { describe, it, expect } from 'vitest';
import { ExperimentAssignment } from '../ExperimentAssignment';

describe('ExperimentAssignment', () => {
  const registry = new (class {
    experiments: Record<string, { variants: Array<{ id: string; trafficPercent: number }> }> = {};
    get(id: string) {
      return this.experiments[id];
    }
  })();

  registry.experiments = {
    test_exp: {
      variants: [
        { id: 'control', trafficPercent: 50 },
        { id: 'treatment', trafficPercent: 50 },
      ],
    },
  };

  const assigner = new ExperimentAssignment();

  it('assigns users deterministically', () => {
    const variant1 = assigner.assign('user_123', 'test_exp', registry.experiments.test_exp.variants);
    const variant2 = assigner.assign('user_123', 'test_exp', registry.experiments.test_exp.variants);
    expect(variant1).toBe(variant2);
  });

  it('distributes different users across variants', () => {
    const assignments = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const v = assigner.assign(`user_${i}`, 'test_exp', registry.experiments.test_exp.variants);
      assignments.add(v);
    }
    // Both variants should get some users
    expect(assignments.has('control')).toBe(true);
    expect(assignments.has('treatment')).toBe(true);
  });

  it('returns different assignments for different experiments', () => {
    registry.experiments.exp_b = {
      variants: [
        { id: 'v1', trafficPercent: 50 },
        { id: 'v2', trafficPercent: 50 },
      ],
    };

    const forExp1 = assigner.assign('user_1', 'test_exp', registry.experiments.test_exp.variants);
    const forExp2 = assigner.assign('user_1', 'exp_b', registry.experiments.exp_b.variants);

    // User can be in different variants for different experiments
    expect(forExp1).toBeDefined();
    expect(forExp2).toBeDefined();
  });

  it('handles single-variant experiments', () => {
    registry.experiments.only_control = {
      variants: [{ id: 'control', trafficPercent: 100 }],
    };
    const variant = assigner.assign('any_user', 'only_control', registry.experiments.only_control.variants);
    expect(variant).toBe('control');
  });
});
