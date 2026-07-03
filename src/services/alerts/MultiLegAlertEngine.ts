export interface AlertCondition {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'crosses_above' | 'crosses_below';
  value: number;
}

export interface MultiLegAlertRule {
  id: string;
  name: string;
  symbol: string;
  conditions: AlertCondition[];
  logic: 'AND' | 'OR';
  cooldownMinutes: number;
  webhookUrl?: string;
  enabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface AlertEvaluationContext {
  symbol: string;
  currentValues: Record<string, number>;
  previousValues: Record<string, number>;
  timestamp: string;
}

export interface AlertTriggerResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  matchedConditions: AlertCondition[];
  failedConditions: AlertCondition[];
  evaluatedAt: string;
}

export class MultiLegAlertEngine {
  private rules: Map<string, MultiLegAlertRule> = new Map();

  createRule(input: Omit<MultiLegAlertRule, 'id' | 'lastTriggeredAt' | 'createdAt'>): MultiLegAlertRule {
    const rule: MultiLegAlertRule = {
      ...input,
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      lastTriggeredAt: null,
      createdAt: new Date().toISOString(),
    };
    this.rules.set(rule.id, rule);
    return rule;
  }

  updateRule(id: string, updates: Partial<MultiLegAlertRule>): MultiLegAlertRule | null {
    const existing = this.rules.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id: existing.id, createdAt: existing.createdAt };
    this.rules.set(id, updated);
    return updated;
  }

  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  getRule(id: string): MultiLegAlertRule | null {
    return this.rules.get(id) ?? null;
  }

  listRules(symbol?: string): MultiLegAlertRule[] {
    const all = [...this.rules.values()].filter(r => r.enabled);
    if (!symbol) return all;
    return all.filter(r => r.symbol === symbol.toUpperCase());
  }

  evaluate(context: AlertEvaluationContext): AlertTriggerResult[] {
    const applicable = this.listRules(context.symbol);
    const results: AlertTriggerResult[] = [];

    for (const rule of applicable) {
      const result = this.evaluateRule(rule, context);

      if (result.triggered) {
        const cooldownElapsed = this.isCooldownElapsed(rule);
        if (!cooldownElapsed) {
          results.push({
            ...result,
            triggered: false,
            failedConditions: [...result.matchedConditions],
            matchedConditions: [],
          });
          continue;
        }
        rule.lastTriggeredAt = context.timestamp;
        this.rules.set(rule.id, rule);
      }

      results.push(result);
    }

    return results;
  }

  private evaluateRule(rule: MultiLegAlertRule, context: AlertEvaluationContext): AlertTriggerResult {
    const matchedConditions: AlertCondition[] = [];
    const failedConditions: AlertCondition[] = [];

    for (const condition of rule.conditions) {
      const matched = this.evaluateCondition(condition, context);
      if (matched) {
        matchedConditions.push(condition);
      } else {
        failedConditions.push(condition);
      }
    }

    const triggered = rule.logic === 'AND'
      ? matchedConditions.length === rule.conditions.length
      : matchedConditions.length > 0;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered,
      matchedConditions,
      failedConditions,
      evaluatedAt: context.timestamp,
    };
  }

  private evaluateCondition(condition: AlertCondition, context: AlertEvaluationContext): boolean {
    const current = context.currentValues[condition.field];
    const previous = context.previousValues[condition.field];

    if (current === undefined) return false;

    switch (condition.operator) {
      case 'gt': return current > condition.value;
      case 'lt': return current < condition.value;
      case 'gte': return current >= condition.value;
      case 'lte': return current <= condition.value;
      case 'eq': return current === condition.value;
      case 'crosses_above':
        return previous !== undefined && previous <= condition.value && current > condition.value;
      case 'crosses_below':
        return previous !== undefined && previous >= condition.value && current < condition.value;
      default:
        return false;
    }
  }

  private isCooldownElapsed(rule: MultiLegAlertRule): boolean {
    if (!rule.lastTriggeredAt) return true;
    const elapsed = Date.now() - new Date(rule.lastTriggeredAt).getTime();
    return elapsed >= rule.cooldownMinutes * 60 * 1000;
  }
}

export const multiLegAlertEngine = new MultiLegAlertEngine();
