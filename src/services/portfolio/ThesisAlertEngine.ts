import { portfolioStore, ThesisSnapshot } from './portfolioStore';

export interface Alert {
  id: string;
  positionId: string;
  symbol: string;
  type: 'CONVICTION_DROP' | 'PRICE_ABOVE_TARGET' | 'STOP_LOSS_BREACH' | 'STOP_LOSS_APPROACHING' | 'EARNINGS_APPROACHING';
  severity: 'low' | 'medium' | 'high';
  message: string;
  createdAt: string;
  dismissed: boolean;
}

export interface PriceSnapshot {
  symbol: string;
  price: number;
  timestamp: string;
}

type AlertListener = (alerts: Alert[]) => void;

const STORAGE_KEY = 'stockstory_alerts_v1';
const listeners = new Set<AlertListener>();

function dispatch(alerts: Alert[]): void {
  for (const fn of listeners) {
    try { fn(alerts); } catch { /* noop */ }
  }
}

function loadAlerts(): Alert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistAlerts(alerts: Alert[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const ThesisAlertEngine = {
  subscribe(fn: AlertListener): () => void {
    listeners.add(fn);
    fn(loadAlerts());
    return () => { listeners.delete(fn); };
  },

  getAlerts(): Alert[] {
    return loadAlerts();
  },

  dismissAlert(alertId: string): void {
    const alerts = loadAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
      persistAlerts(alerts);
      dispatch(alerts);
    }
  },

  dismissAll(): void {
    const alerts = loadAlerts();
    alerts.forEach(a => { a.dismissed = true; });
    persistAlerts(alerts);
    dispatch(alerts);
  },

  clearDismissed(): void {
    const alerts = loadAlerts().filter(a => !a.dismissed);
    persistAlerts(alerts);
    dispatch(alerts);
  },

  async evaluate(prices: Record<string, number>): Promise<Alert[]> {
    const positions = await portfolioStore.getPositions();
    const existingAlerts = loadAlerts();
    const newAlerts: Alert[] = [];

    for (const pos of positions) {
      const currentPrice = prices[pos.symbol];
      if (!currentPrice || currentPrice <= 0) continue;

      const latestThesis = await portfolioStore.getLatestThesis(pos.id);

      if (latestThesis) {
        this._checkPriceTarget(pos.id, pos.symbol, currentPrice, latestThesis, newAlerts);
        this._checkStopLoss(pos.id, pos.symbol, currentPrice, latestThesis, newAlerts);
        this._checkConviction(pos.id, pos.symbol, latestThesis, existingAlerts, newAlerts);
      }
    }

    if (newAlerts.length > 0) {
      const combined = [...newAlerts, ...existingAlerts.filter(a => !a.dismissed)];
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const deduped = this._deduplicate(combined);
      const trimmed = deduped.slice(0, 50);
      persistAlerts(trimmed);
      dispatch(trimmed);
    }

    return newAlerts;
  },

  _checkPriceTarget(
    positionId: string, symbol: string, price: number,
    thesis: ThesisSnapshot, alerts: Alert[],
  ): void {
    if (!thesis.targetPrice) return;
    if (price >= thesis.targetPrice * 0.95 && price <= thesis.targetPrice * 1.05) {
      alerts.push({
        id: generateId(),
        positionId,
        symbol,
        type: 'PRICE_ABOVE_TARGET',
        severity: 'high',
        message: `${symbol} at ₱${price} — near target ₱${thesis.targetPrice}. Review thesis.`,
        createdAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  },

  _checkStopLoss(
    positionId: string, symbol: string, price: number,
    thesis: ThesisSnapshot, alerts: Alert[],
  ): void {
    if (!thesis.stopLoss) return;
    if (price <= thesis.stopLoss) {
      alerts.push({
        id: generateId(),
        positionId,
        symbol,
        type: 'STOP_LOSS_BREACH',
        severity: 'high',
        message: `${symbol} at ₱${price} — breached stop-loss ₱${thesis.stopLoss}. Consider reviewing position.`,
        createdAt: new Date().toISOString(),
        dismissed: false,
      });
    } else if (price <= thesis.stopLoss * 1.05) {
      alerts.push({
        id: generateId(),
        positionId,
        symbol,
        type: 'STOP_LOSS_APPROACHING',
        severity: 'medium',
        message: `${symbol} at ₱${price} — approaching stop-loss ₱${thesis.stopLoss}. Monitor closely.`,
        createdAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  },

  _checkConviction(
    positionId: string, symbol: string,
    _thesis: ThesisSnapshot,
    _existing: Alert[], _newAlerts: Alert[],
  ): void {
  },

  _deduplicate(alerts: Alert[]): Alert[] {
    const seen = new Set<string>();
    return alerts.filter(a => {
      const key = `${a.positionId}_${a.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
};
