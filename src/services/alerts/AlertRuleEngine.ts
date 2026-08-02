import { AlertRule, LegCondition, MarketDataPoint, EvaluationResult } from './types';

/**
 * Evaluates alert rules against a market data snapshot. Pure and
 * side-effect-free: given the same rule, snapshot, previous values, and
 * "now", it always returns the same verdict — the caller (a cron job) owns
 * persistence and notification dispatch.
 */
export class AlertRuleEngine {
  private lastTriggerCount = new Map<string, { windowStart: number; count: number }>();

  /**
   * @param previousSnapshot required for crosses_above/crosses_below operators;
   *        omit for rules that don't use them.
   */
  evaluate(
    rule: AlertRule,
    snapshot: MarketDataPoint,
    now: number,
    previousSnapshot?: MarketDataPoint,
  ): EvaluationResult {
    if (!rule.enabled) {
      return { ruleId: rule.id, triggered: false, reason: 'rule disabled', suppressedReason: 'disabled' };
    }
    if (snapshot.ticker !== rule.ticker) {
      return { ruleId: rule.id, triggered: false, reason: `ticker mismatch: rule=${rule.ticker} snapshot=${snapshot.ticker}` };
    }

    const matched = this.matchesCondition(rule, snapshot, previousSnapshot);
    if (!matched.matches) {
      return { ruleId: rule.id, triggered: false, reason: matched.reason };
    }

    if (this.inDoNotDisturbWindow(rule, now)) {
      return { ruleId: rule.id, triggered: false, reason: matched.reason, suppressedReason: 'do_not_disturb' };
    }

    if (!this.withinRateLimit(rule, now)) {
      return { ruleId: rule.id, triggered: false, reason: matched.reason, suppressedReason: 'rate_limited' };
    }

    this.recordTrigger(rule, now);
    return { ruleId: rule.id, triggered: true, reason: matched.reason };
  }

  private matchesCondition(
    rule: AlertRule,
    snapshot: MarketDataPoint,
    previous?: MarketDataPoint,
  ): { matches: boolean; reason: string } {
    const { condition } = rule;

    if (condition.type === 'multi_leg') {
      if (!condition.legs || condition.legs.length === 0) {
        throw new Error(`AlertRuleEngine: multi_leg rule ${rule.id} has no legs`);
      }
      const results = condition.legs.map(leg => this.evaluateLeg(leg, snapshot, previous));
      const logic = condition.logic ?? 'and';
      const matches = logic === 'and' ? results.every(r => r.matches) : results.some(r => r.matches);
      return { matches, reason: results.map(r => r.reason).join(logic === 'and' ? ' AND ' : ' OR ') };
    }

    if (!condition.leg) {
      throw new Error(`AlertRuleEngine: rule ${rule.id} of type ${condition.type} has no leg condition`);
    }
    return this.evaluateLeg(condition.leg, snapshot, previous);
  }

  private evaluateLeg(
    leg: LegCondition,
    snapshot: MarketDataPoint,
    previous?: MarketDataPoint,
  ): { matches: boolean; reason: string } {
    const current = this.fieldValue(leg.field, snapshot);
    if (current === undefined) {
      return { matches: false, reason: `field ${leg.field} unavailable` };
    }

    if (leg.operator === 'crosses_above' || leg.operator === 'crosses_below') {
      if (!previous) {
        return { matches: false, reason: `${leg.field} crossing check requires previous snapshot` };
      }
      const prevValue = this.fieldValue(leg.field, previous);
      if (prevValue === undefined) return { matches: false, reason: `previous ${leg.field} unavailable` };

      const matches =
        leg.operator === 'crosses_above'
          ? prevValue <= leg.value && current > leg.value
          : prevValue >= leg.value && current < leg.value;
      return {
        matches,
        reason: `${leg.field} ${leg.operator} ${leg.value} (was ${prevValue}, now ${current})`,
      };
    }

    let matches: boolean;
    switch (leg.operator) {
      case 'gt': matches = current > leg.value; break;
      case 'gte': matches = current >= leg.value; break;
      case 'lt': matches = current < leg.value; break;
      case 'lte': matches = current <= leg.value; break;
      case 'eq': matches = current === leg.value; break;
    }
    return { matches, reason: `${leg.field} ${leg.operator} ${leg.value} (actual ${current})` };
  }

  private fieldValue(field: LegCondition['field'], data: MarketDataPoint): number | undefined {
    switch (field) {
      case 'price': return data.price;
      case 'volume': return data.volume;
      case 'rsi_14': return data.rsi14;
      case 'conviction_score': return data.convictionScore;
      case 'pe_ratio': return data.peRatio;
    }
  }

  private inDoNotDisturbWindow(rule: AlertRule, now: number): boolean {
    if (!rule.doNotDisturbStart || !rule.doNotDisturbEnd) return false;
    const date = new Date(now);
    // UTC explicitly: do-not-disturb windows must not silently shift with server timezone.
    const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    const start = this.parseHHMM(rule.doNotDisturbStart);
    const end = this.parseHHMM(rule.doNotDisturbEnd);
    if (start <= end) {
      return minutes >= start && minutes < end;
    }
    // Overnight window, e.g. 22:00 -> 06:00
    return minutes >= start || minutes < end;
  }

  private parseHHMM(value: string): number {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  }

  private withinRateLimit(rule: AlertRule, now: number): boolean {
    const key = rule.id;
    const window = this.lastTriggerCount.get(key);
    if (!window || now - window.windowStart >= 3_600_000) {
      return true; // new hourly window is always allowed (recorded on actual trigger)
    }
    return window.count < rule.maxAlertsPerHour;
  }

  private recordTrigger(rule: AlertRule, now: number): void {
    const window = this.lastTriggerCount.get(rule.id);
    if (!window || now - window.windowStart >= 3_600_000) {
      this.lastTriggerCount.set(rule.id, { windowStart: now, count: 1 });
    } else {
      window.count++;
    }
  }
}
