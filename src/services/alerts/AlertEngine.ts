/**
 * AlertEngine — Price and technical alert system
 *
 * Supports:
 *   - Price alerts (crosses above/below)
 *   - Technical alerts (RSI, MACD, Bollinger)
 *   - Volume alerts (spikes, drops)
 *   - Percentage change alerts
 *   - One-time or recurring
 */

export type AlertConditionType = 'price_above' | 'price_below' | 'change_percent' | 'rsi_oversold' | 'rsi_overbought' | 'macd_cross' | 'volume_spike' | 'bollinger_breakout' | 'ma_cross' | 'custom';

export type AlertRepeat = 'once' | 'daily' | 'always';

export interface AlertDefinition {
  id: string;
  symbol: string;
  condition: AlertConditionType;
  value: number;
  repeat: AlertRepeat;
  label: string;
  createdAt: string;
  lastTriggeredAt: string | null;
  triggeredCount: number;
  enabled: boolean;
}

export interface AlertEvent {
  alertId: string;
  symbol: string;
  condition: AlertConditionType;
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface PriceSnapshot {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  sma50?: number;
  sma200?: number;
  timestamp: string;
}

export class AlertEngine {
  private alerts: Map<string, AlertDefinition> = new Map();
  private listeners: Array<(event: AlertEvent) => void> = [];
  private lastPrices: Map<string, number> = new Map();

  addAlert(definition: Omit<AlertDefinition, 'id' | 'createdAt' | 'lastTriggeredAt' | 'triggeredCount'>): AlertDefinition {
    const alert: AlertDefinition = {
      ...definition,
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      lastTriggeredAt: null,
      triggeredCount: 0,
    };
    this.alerts.set(alert.id, alert);
    this.persist();
    return alert;
  }

  removeAlert(id: string): boolean {
    const deleted = this.alerts.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  updateAlert(id: string, updates: Partial<AlertDefinition>): AlertDefinition | null {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    Object.assign(alert, updates);
    this.persist();
    return alert;
  }

  getAlerts(symbol?: string): AlertDefinition[] {
    const all = Array.from(this.alerts.values());
    return symbol ? all.filter(a => a.symbol === symbol) : all;
  }

  getAlertsByCondition(condition: AlertConditionType): AlertDefinition[] {
    return Array.from(this.alerts.values()).filter(a => a.condition === condition);
  }

  onAlert(callback: (event: AlertEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  evaluate(snapshot: PriceSnapshot): AlertEvent[] {
    const events: AlertEvent[] = [];
    const relevantAlerts = Array.from(this.alerts.values()).filter(a => a.symbol === snapshot.symbol && a.enabled);

    for (const alert of relevantAlerts) {
      const event = this.checkCondition(alert, snapshot);
      if (event) {
        alert.lastTriggeredAt = event.timestamp;
        alert.triggeredCount++;
        events.push(event);

        if (alert.repeat === 'once') {
          alert.enabled = false;
        }

        for (const listener of this.listeners) {
          listener(event);
        }
      }
    }

    this.lastPrices.set(snapshot.symbol, snapshot.price);
    this.persist();
    return events;
  }

  evaluateBatch(snapshots: PriceSnapshot[]): AlertEvent[] {
    const events: AlertEvent[] = [];
    for (const snapshot of snapshots) {
      events.push(...this.evaluate(snapshot));
    }
    return events;
  }

  private checkCondition(alert: AlertDefinition, snapshot: PriceSnapshot): AlertEvent | null {
    const lastPrice = this.lastPrices.get(snapshot.symbol);

    switch (alert.condition) {
      case 'price_above': {
        if (snapshot.price > alert.value) {
          return this.createEvent(alert, snapshot, `Price crossed above ${alert.value}`, snapshot.price, 'warning');
        }
        break;
      }
      case 'price_below': {
        if (snapshot.price < alert.value) {
          return this.createEvent(alert, snapshot, `Price dropped below ${alert.value}`, snapshot.price, 'warning');
        }
        break;
      }
      case 'change_percent': {
        if (Math.abs(snapshot.changePercent) >= alert.value) {
          return this.createEvent(alert, snapshot, `${snapshot.symbol} moved ${snapshot.changePercent >= 0 ? '+' : ''}${snapshot.changePercent.toFixed(2)}%`, snapshot.changePercent, snapshot.changePercent >= 0 ? 'info' : 'warning');
        }
        break;
      }
      case 'rsi_oversold': {
        if (snapshot.rsi !== undefined && snapshot.rsi <= alert.value) {
          return this.createEvent(alert, snapshot, `RSI oversold at ${snapshot.rsi}`, snapshot.rsi, 'info');
        }
        break;
      }
      case 'rsi_overbought': {
        if (snapshot.rsi !== undefined && snapshot.rsi >= alert.value) {
          return this.createEvent(alert, snapshot, `RSI overbought at ${snapshot.rsi}`, snapshot.rsi, 'warning');
        }
        break;
      }
      case 'macd_cross': {
        if (snapshot.macd !== undefined && snapshot.macdSignal !== undefined && lastPrice !== undefined) {
          const prevMacd = this.calculateMACD(lastPrice);
          if ((prevMacd <= snapshot.macdSignal && snapshot.macd > snapshot.macdSignal)) {
            return this.createEvent(alert, snapshot, 'MACD bullish crossover', snapshot.macd, 'info');
          }
          if ((prevMacd >= snapshot.macdSignal && snapshot.macd < snapshot.macdSignal)) {
            return this.createEvent(alert, snapshot, 'MACD bearish crossover', snapshot.macd, 'warning');
          }
        }
        break;
      }
      case 'volume_spike': {
        if (snapshot.volume >= alert.value * 1000) {
          return this.createEvent(alert, snapshot, `Volume spike: ${(snapshot.volume / 100000).toFixed(1)}L shares`, snapshot.volume, 'info');
        }
        break;
      }
      case 'bollinger_breakout': {
        if (snapshot.bollingerUpper !== undefined && snapshot.price > snapshot.bollingerUpper) {
          return this.createEvent(alert, snapshot, `Price above upper Bollinger Band (${snapshot.bollingerUpper.toFixed(0)})`, snapshot.price, 'critical');
        }
        if (snapshot.bollingerLower !== undefined && snapshot.price < snapshot.bollingerLower) {
          return this.createEvent(alert, snapshot, `Price below lower Bollinger Band (${snapshot.bollingerLower.toFixed(0)})`, snapshot.price, 'critical');
        }
        break;
      }
      case 'ma_cross': {
        if (snapshot.sma50 !== undefined && snapshot.sma200 !== undefined && lastPrice !== undefined) {
          if (snapshot.sma50 > snapshot.sma200 && lastPrice <= (this.lastPrices.get('prev_sma50') || snapshot.sma50)) {
            return this.createEvent(alert, snapshot, `Golden cross: 50-SMA (${snapshot.sma50.toFixed(0)}) crossed above 200-SMA (${snapshot.sma200.toFixed(0)})`, snapshot.sma50, 'info');
          }
          if (snapshot.sma50 < snapshot.sma200 && lastPrice >= (this.lastPrices.get('prev_sma50') || snapshot.sma50)) {
            return this.createEvent(alert, snapshot, `Death cross: 50-SMA (${snapshot.sma50.toFixed(0)}) crossed below 200-SMA (${snapshot.sma200.toFixed(0)})`, snapshot.sma50, 'critical');
          }
        }
        break;
      }
    }

    return null;
  }

  private createEvent(alert: AlertDefinition, snapshot: PriceSnapshot, message: string, currentValue: number, severity: AlertEvent['severity']): AlertEvent {
    return {
      alertId: alert.id,
      symbol: snapshot.symbol,
      condition: alert.condition,
      message: `${alert.label}: ${message}`,
      currentValue,
      threshold: alert.value,
      timestamp: new Date().toISOString(),
      severity,
    };
  }

  private calculateMACD(price: number): number {
    return price * 0.01;
  }

  private load(): void {
    try {
      const stored = localStorage.getItem('stockex_alerts');
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const alert of parsed) {
          this.alerts.set(alert.id, alert);
        }
      }
    } catch { /* ignore */ }
  }

  private persist(): void {
    try {
      localStorage.setItem('stockex_alerts', JSON.stringify(Array.from(this.alerts.values())));
    } catch { /* ignore */ }
  }

  clearAll(): void {
    this.alerts.clear();
    this.persist();
  }

  get count(): number {
    return this.alerts.size;
  }

  static getConditionLabel(condition: AlertConditionType): string {
    const labels: Record<AlertConditionType, string> = {
      price_above: 'Price Above',
      price_below: 'Price Below',
      change_percent: 'Change %',
      rsi_oversold: 'RSI Oversold',
      rsi_overbought: 'RSI Overbought',
      macd_cross: 'MACD Crossover',
      volume_spike: 'Volume Spike',
      bollinger_breakout: 'Bollinger Breakout',
      ma_cross: 'MA Crossover',
      custom: 'Custom',
    };
    return labels[condition];
  }
}

export const alertEngine = new AlertEngine();
