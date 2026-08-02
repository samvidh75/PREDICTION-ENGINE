import { generateAlerts, type AlertTriggerInput } from '../../research/alerts/alertsEngine.js';
import type { AlertChangeView } from '../../research/contracts/productContracts.js';
import { AdaptiveAlertEngine } from '../notifications/adaptiveAlertEngine.js';
import type { IntelligenceNotification } from '../notifications/notificationTypes.js';

export type UnifiedAlertRuleType =
  | 'price_move'
  | 'score_change'
  | 'risk_change'
  | 'thesis_change'
  | 'event'
  | 'peer_change';

export interface UnifiedAlertRule {
  id: string;
  symbol: string;
  ruleType: UnifiedAlertRuleType;
  threshold: number | null;
  enabled: boolean;
  createdAt: string;
}

export interface UnifiedAlertRuleInput {
  symbol: string;
  ruleType: UnifiedAlertRuleType;
  threshold?: number | null;
  enabled?: boolean;
}

export interface UnifiedAlertEvaluationRequest extends AlertTriggerInput {
  confidenceState?: 'ELEVATED_RISK' | 'MOMENTUM_WEAKENING' | 'CONFIDENCE_RISING' | 'NEUTRAL_ENVIRONMENT' | 'STABLE_CONVICTION';
  marketStateLabel?: string;
  narrativeKey?: number;
}

export interface UnifiedAlertEvaluationResponse {
  availability: 'real';
  generatedAlerts: AlertChangeView[];
  notificationPreview: IntelligenceNotification[];
  matchedRules: UnifiedAlertRule[];
}

const VALID_RULE_TYPES: UnifiedAlertRuleType[] = [
  'price_move',
  'score_change',
  'risk_change',
  'thesis_change',
  'event',
  'peer_change',
];

function buildId(symbol: string, ruleType: UnifiedAlertRuleType): string {
  return `${symbol}:${ruleType}`;
}

export class AlertRuleService {
  private readonly rules = new Map<string, UnifiedAlertRule>();
  private readonly adaptiveEngine = new AdaptiveAlertEngine({ globalMinIntervalMs: 0 });

  listRules(symbol?: string): UnifiedAlertRule[] {
    const all = [...this.rules.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (!symbol) return all;
    const normalized = symbol.trim().toUpperCase();
    return all.filter((rule) => rule.symbol === normalized);
  }

  createRule(input: UnifiedAlertRuleInput): UnifiedAlertRule {
    const symbol = typeof input.symbol === 'string' ? input.symbol.trim().toUpperCase() : '';
    if (!symbol) throw new Error('symbol is required');
    if (!VALID_RULE_TYPES.includes(input.ruleType)) throw new Error('invalid ruleType');

    const rule: UnifiedAlertRule = {
      id: buildId(symbol, input.ruleType),
      symbol,
      ruleType: input.ruleType,
      threshold: typeof input.threshold === 'number' && Number.isFinite(input.threshold) ? input.threshold : null,
      enabled: input.enabled !== false,
      createdAt: new Date().toISOString(),
    };
    this.rules.set(rule.id, rule);
    return rule;
  }

  evaluate(input: UnifiedAlertEvaluationRequest): UnifiedAlertEvaluationResponse {
    const symbol = input.symbol.trim().toUpperCase();
    const candidateAlerts = generateAlerts({ ...input, symbol });
    const symbolRules = this.listRules(symbol).filter((rule) => rule.enabled);

    const matchedRules = symbolRules.filter((rule) => this.matchesRule(rule, input, candidateAlerts));
    const generatedAlerts = matchedRules.length > 0
      ? candidateAlerts.filter((alert) => matchedRules.some((rule) => rule.ruleType === alert.type || this.ruleTypeMatchesAlert(rule.ruleType, alert.type)))
      : candidateAlerts;

    const notificationPreview = this.adaptiveEngine.evaluate({
      confidenceState: input.confidenceState ?? 'NEUTRAL_ENVIRONMENT',
      marketStateLabel: input.marketStateLabel ?? `${symbol} monitored state`,
      narrativeKey: input.narrativeKey ?? Date.now(),
    });

    return {
      availability: 'real',
      generatedAlerts,
      notificationPreview,
      matchedRules,
    };
  }

  private ruleTypeMatchesAlert(ruleType: UnifiedAlertRuleType, alertType: AlertChangeView['type']): boolean {
    return ruleType === alertType || (ruleType === 'score_change' && alertType === 'watchlist_review');
  }

  private matchesRule(rule: UnifiedAlertRule, input: UnifiedAlertEvaluationRequest, alerts: AlertChangeView[]): boolean {
    switch (rule.ruleType) {
      case 'price_move':
        return input.priceChangePercent !== null && input.priceChangePercent !== undefined
          && Math.abs(input.priceChangePercent) >= (rule.threshold ?? 5);
      case 'score_change':
        return input.scoreChange !== null && input.scoreChange !== undefined
          && Math.abs(input.scoreChange) >= (rule.threshold ?? 10);
      case 'risk_change':
        return input.previousRiskLevel !== null && input.previousRiskLevel !== input.currentRiskLevel;
      case 'thesis_change':
        return input.previousThesisStatus !== null && input.previousThesisStatus !== input.currentThesisStatus;
      case 'event':
        return input.hasResultEvent || alerts.some((alert) => alert.type === 'event');
      case 'peer_change':
        return input.peerBecameMoreAttractive;
      default:
        return false;
    }
  }
}

export const alertRuleService = new AlertRuleService();
