import { describe, expect, it } from 'vitest';
import { AlertRuleService } from './AlertRuleService';

describe('AlertRuleService', () => {
  it('creates and lists rules by symbol', () => {
    const service = new AlertRuleService();
    service.createRule({ symbol: 'infy', ruleType: 'price_move', threshold: 4 });
    service.createRule({ symbol: 'INFY', ruleType: 'score_change', threshold: 8 });

    const rules = service.listRules('INFY');
    expect(rules).toHaveLength(2);
    expect(rules[0].symbol).toBe('INFY');
  });

  it('matches threshold rules and emits research alerts', () => {
    const service = new AlertRuleService();
    service.createRule({ symbol: 'RELIANCE', ruleType: 'price_move', threshold: 3 });

    const result = service.evaluate({
      symbol: 'RELIANCE',
      previousThesisStatus: 'Review',
      currentThesisStatus: 'Review',
      previousRiskLevel: 'Medium',
      currentRiskLevel: 'Medium',
      scoreChange: 2,
      priceChangePercent: 6,
      peerBecameMoreAttractive: false,
      hasResultEvent: false,
      confidenceState: 'CONFIDENCE_RISING',
      marketStateLabel: 'Constructive breadth',
      narrativeKey: 42,
    });

    expect(result.matchedRules).toHaveLength(1);
    expect(result.generatedAlerts.some((alert) => alert.type === 'price_move')).toBe(true);
    expect(result.notificationPreview).toHaveLength(1);
  });

  it('matches rule-free evaluation using base alert generation', () => {
    const service = new AlertRuleService();

    const result = service.evaluate({
      symbol: 'TCS',
      previousThesisStatus: 'Track',
      currentThesisStatus: 'Review',
      previousRiskLevel: 'Low',
      currentRiskLevel: 'High',
      scoreChange: 12,
      priceChangePercent: 7,
      peerBecameMoreAttractive: true,
      hasResultEvent: true,
      confidenceState: 'ELEVATED_RISK',
      marketStateLabel: 'Distribution pressure',
      narrativeKey: 99,
    });

    expect(result.generatedAlerts.length).toBeGreaterThan(3);
    expect(result.matchedRules).toEqual([]);
  });
});
