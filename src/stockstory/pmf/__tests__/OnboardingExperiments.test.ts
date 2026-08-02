import { describe, it, expect, beforeAll } from 'vitest';
import { registerOnboardingExperiments } from '../OnboardingExperiments';
import { getAllExperiments } from '../ExperimentRegistry';

function safeRegister(): void {
  try {
    registerOnboardingExperiments();
  } catch {
    // Already registered — safe to ignore
  }
}

describe('OnboardingExperiments', () => {
  beforeAll(() => {
    safeRegister();
  });

  it('registers 4 onboarding experiments', () => {
    const experiments = getAllExperiments();
    expect(experiments.length).toBe(4);
  });

  it('each experiment has valid structure', () => {
    const experiments = getAllExperiments();
    for (const exp of experiments) {
      expect(exp.key).toMatch(/^onboarding\.v2\./);
      expect(exp.name).toBeTruthy();
      expect(exp.description).toBeTruthy();
      expect(exp.owner).toBe('product');
      expect(exp.variants.length).toBeGreaterThanOrEqual(2);
      expect(exp.successMetrics.length).toBeGreaterThan(0);

      // Traffic fractions should sum to 1
      const totalTraffic = exp.variants.reduce((sum: number, v: { trafficFraction: number }) => sum + v.trafficFraction, 0);
      expect(totalTraffic).toBe(1);

      // Each variant has required fields
      for (const v of exp.variants) {
        expect(v.id).toBeTruthy();
        expect(v.name).toBeTruthy();
        expect(v.trafficFraction).toBeGreaterThan(0);
      }
    }
  });

  it('includes simplified vs detailed flow experiment', () => {
    const experiments = getAllExperiments();
    const simplified = experiments.find((e) => e.key === 'onboarding.v2.simplified-vs-detailed');
    expect(simplified).toBeDefined();
    expect(simplified?.variants.find((v) => v.id === 'treatment_a')).toBeDefined();
    expect(simplified?.variants.find((v) => v.id === 'control')).toBeDefined();
  });

  it('includes guided vs self-serve experiment', () => {
    const experiments = getAllExperiments();
    const guided = experiments.find((e) => e.key === 'onboarding.v2.guided-vs-self-serve');
    expect(guided).toBeDefined();
    expect(guided?.variants.find((v) => v.id === 'guided' || v.id === 'treatment_a')).toBeDefined();
    expect(guided?.variants.find((v) => v.id === 'control')).toBeDefined();
  });

  it('includes watchlist prompt timing experiment', () => {
    const experiments = getAllExperiments();
    const timing = experiments.find((e) => e.key === 'onboarding.v2.watchlist-prompt-timing');
    expect(timing).toBeDefined();
  });

  it('includes compare discovery experiment', () => {
    const experiments = getAllExperiments();
    const compare = experiments.find((e) => e.key === 'onboarding.v2.compare-discovery');
    expect(compare).toBeDefined();
  });
});
