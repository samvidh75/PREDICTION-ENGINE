// Alert rule engine types — mirrors supabase/migrations/008_alerts.sql

export type RuleType = 'price' | 'volume' | 'indicator' | 'multi_leg';
export type ComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'crosses_above' | 'crosses_below';
export type NotifyChannel = 'push' | 'sms' | 'email' | 'telegram' | 'slack';

export interface LegCondition {
  field: 'price' | 'volume' | 'rsi_14' | 'conviction_score' | 'pe_ratio';
  operator: ComparisonOperator;
  value: number;
}

export interface AlertCondition {
  type: RuleType;
  /** Single-leg rules (price/volume/indicator) use one condition. */
  leg?: LegCondition;
  /** Multi-leg rules combine several conditions with AND/OR. */
  legs?: LegCondition[];
  logic?: 'and' | 'or';
}

export interface MarketDataPoint {
  ticker: string;
  price: number;
  volume: number;
  rsi14?: number;
  convictionScore?: number;
  peRatio?: number;
}

export interface AlertRule {
  id: string;
  userId: string;
  ticker: string;
  name?: string;
  condition: AlertCondition;
  enabled: boolean;
  notifyChannels: NotifyChannel[];
  doNotDisturbStart?: string; // "HH:MM"
  doNotDisturbEnd?: string;
  maxAlertsPerHour: number;
  lastTriggered?: number; // epoch ms
}

export interface EvaluationResult {
  ruleId: string;
  triggered: boolean;
  reason: string;
  suppressedReason?: 'do_not_disturb' | 'rate_limited' | 'disabled';
}
