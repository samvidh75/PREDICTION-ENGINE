import { describe, it, expect } from 'vitest';
import { OnboardingExperiments } from '../OnboardingExperiments';

describe('OnboardingExperiments', () => {
  it('exports all onboarding experiments', () => {
    expect(Array.isArray(OnboardingExperiments)).toBe(true);
    expect(OnboardingExperiments.length).toBe(4);
  });

  it('each experiment has valid structure', () => {
    for (const exp of OnboardingExperiments) {
      expect(exp.id).toMatch(/^onboarding_/);
      expect(exp.name).toBeTruthy();
      expect(exp.description).toBeTruthy();
      expect(exp.owner).toBe('Product');
      expect(exp.variants.length).toBeGreaterThanOrEqual(2);
      expect(exp.metrics.length).toBeGreaterThan(0);

      // Traffic should sum to 100
      const totalTraffic = exp.variants.reduce((sum: number, v: { trafficPercent: number }) => sum + v.trafficPercent, 0);
      expect(totalTraffic).toBe(100);

      // Each variant has required fields
      for (const v of exp.variants) {
        expect(v.id).toBeTruthy();
        expect(v.name).toBeTruthy();
        expect(v.trafficPercent).toBeGreaterThan(0);
      }
    }
  });

  it('includes simplified vs detailed flow experiment', () => {
    const simplified = OnboardingExperiments.find((e) => e.id === 'onboarding_simplified_vs_detailed');
    expect(simplified).toBeDefined();
    expect(simplified?.variants.find((v) => v.id === 'simplified')).toBeDefined();
    expect(simplified?.variants.find((v) => v.id === 'detailed')).toBeDefined();
  });

  it('includes guided vs self-serve experiment', () => {
    const guided = OnboardingExperiments.find((e) => e.id === 'onboarding_guided_vs_self_serve');
    expect(guided).toBeDefined();
    expect(guided?.variants.find((v) => v.id === 'guided')).toBeDefined();
    expect(guided?.variants.find((v) => v.id === 'self_serve')).toBeDefined();
  });

  it('includes watchlist prompt timing experiment', () => {
    const timing = OnboardingExperiments.find((e) => e.id === 'onboarding_watchlist_prompt_timing');
    expect(timing).toBeDefined();
  });

  it('includes compare discovery experiment', () => {
    const compare = OnboardingExperiments.find((e) => e.id === 'onboarding_compare_discovery');
    expect(compare).toBeDefined();
  });
});
