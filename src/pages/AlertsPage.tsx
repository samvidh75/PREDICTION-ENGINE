import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing, Plus, Trash2, X, AlertTriangle, TrendingDown, DollarSign, Activity } from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductEmptyState } from "../components/product/ProductUI";
import { runCompanyDataPipeline, PipelineResult } from "../services/data/CompanyDataPipeline";
import { fPrice, fScore } from "../lib/format";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";

const STORAGE_KEY = "ss_alerts";
const MAX_ALERTS = 10;

interface AlertRule {
  id: string;
  symbol: string;
  type: "score_drop" | "classification_change" | "price_below" | "rsi_above";
  threshold: number;
  createdAt: string;
  lastTriggeredAt: string | null;
}

interface AlertEval {
  triggered: boolean;
  currentValue: number | null;
  classification: string | null;
  loading: boolean;
  error: string | null;
}

const ALERT_TYPE_OPTIONS: { value: AlertRule["type"]; label: string; icon: React.ElementType }[] = [
  { value: "score_drop", label: "Score drops below", icon: Activity },
  { value: "classification_change", label: "Classification changes", icon: AlertTriangle },
  { value: "price_below", label: "Price drops below", icon: DollarSign },
  { value: "rsi_above", label: "RSI goes above", icon: TrendingDown },
];

const CLASSIFICATION_LABELS: Record<string, string> = {
  EXCELLENT: "Excellent", HEALTHY: "Healthy", STABLE: "Stable",
  WEAKENING: "Weakening", AT_RISK: "At Risk", INSUFFICIENT_DATA: "Insufficient Data",
};

const LOADING_EVAL: AlertEval = { triggered: false, currentValue: null, classification: null, loading: true, error: null };
const EMPTY_EVAL: AlertEval = { triggered: false, currentValue: null, classification: null, loading: false, error: null };

function loadAlerts(): AlertRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveAlerts(alerts: AlertRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

function evaluateAlert(alert: AlertRule, result: PipelineResult): AlertEval {
  const pred = result.prediction;
  let currentValue: number | null = null;
  let classification: string | null = null;
  let triggered = false;

  switch (alert.type) {
    case "score_drop":
      currentValue = pred?.rankingScore ?? null;
      classification = pred?.classification ?? null;
      triggered = currentValue !== null && currentValue < alert.threshold;
      break;
    case "classification_change":
      currentValue = pred?.rankingScore ?? null;
      classification = pred?.classification ?? null;
      triggered = currentValue !== null && currentValue < alert.threshold;
      break;
    case "price_below":
      currentValue = result.price.current;
      triggered = currentValue !== null && currentValue < alert.threshold;
      break;
    case "rsi_above":
      currentValue = result.technicals.rsi14;
      triggered = currentValue !== null && currentValue > alert.threshold;
      break;
  }
  return { triggered, currentValue, classification, loading: false, error: null };
}

function alertMessage(alert: AlertRule, ev: AlertEval): string {
  const sym = alert.symbol.toUpperCase();
  switch (alert.type) {
    case "score_drop":
      return `Score for ${sym} dropped below ${alert.threshold} — currently ${fScore(ev.currentValue)}`;
    case "classification_change":
      return `Classification for ${sym} changed — currently ${CLASSIFICATION_LABELS[ev.classification ?? ""] ?? ev.classification ?? "—"}`;
    case "price_below":
      return `Price for ${sym} dropped below ${fPrice(alert.threshold)} — currently ${fPrice(ev.currentValue)}`;
    case "rsi_above":
      return `RSI for ${sym} above ${alert.threshold} — currently ${ev.currentValue?.toFixed(1) ?? "—"}`;
  }
}

export const AlertsPage: React.FC = () => {
  useDocumentTitle("Alerts | StockStory India");
  const [alerts, setAlerts] = useState<AlertRule[]>(() => loadAlerts());
  const [evals, setEvals] = useState<Record<string, AlertEval>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [formSymbol, setFormSymbol] = useState("");
  const [formType, setFormType] = useState<AlertRule["type"]>("score_drop");
  const [formThreshold, setFormThreshold] = useState("");
  const symbolRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (alerts.length === 0) return;
    let cancelled = false;
    const init: Record<string, AlertEval> = {};
    alerts.forEach((a) => { init[a.id] = LOADING_EVAL; });
    setEvals((prev) => ({ ...prev, ...init }));

    Promise.allSettled(
      alerts.map((a) =>
        runCompanyDataPipeline(a.symbol)
          .then((r) => ({ id: a.id, alert: a, result: r }))
          .catch((err) => ({ id: a.id, error: String(err) }))
      )
    ).then((settled) => {
      if (cancelled) return;
      const next: Record<string, AlertEval> = {};
      for (const s of settled) {
        if (s.status === "fulfilled") {
          const v = s.value as { id: string; alert: AlertRule; result: PipelineResult };
          next[v.id] = evaluateAlert(v.alert, v.result);
        } else {
          const v = s.reason as { id: string; error: string };
          next[v.id] = { ...EMPTY_EVAL, error: v.error };
        }
      }
      setEvals((prev) => ({ ...prev, ...next }));
    });
    return () => { cancelled = true; };
  }, [alerts]);

  useEffect(() => {
    if (formOpen) symbolRef.current?.focus();
  }, [formOpen]);

  const addAlert = useCallback(() => {
    const sym = formSymbol.trim().toUpperCase();
    const threshold = parseFloat(formThreshold);
    if (!sym || !Number.isFinite(threshold) || threshold < 0) return;

    const newAlert: AlertRule = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      symbol: sym, type: formType, threshold,
      createdAt: new Date().toISOString(), lastTriggeredAt: null,
    };
    const next = [...alerts, newAlert];
    saveAlerts(next);
    setAlerts(next);
    setFormSymbol(""); setFormThreshold(""); setFormOpen(false);
  }, [alerts, formSymbol, formType, formThreshold]);

  const deleteAlert = useCallback((id: string) => {
    const next = alerts.filter((a) => a.id !== id);
    saveAlerts(next);
    setAlerts(next);
    setEvals((prev) => { const c = { ...prev }; delete c[id]; return c; });
  }, [alerts]);

  const dismissTrigger = useCallback((id: string) => {
    const next = alerts.map((a) => a.id === id ? { ...a, lastTriggeredAt: new Date().toISOString() } : a);
    saveAlerts(next);
    setAlerts(next);
    setEvals((prev) => ({ ...prev, [id]: { ...prev[id], triggered: false } }));
  }, [alerts]);

  const research = useCallback((symbol: string) => navigateToStock({ ticker: symbol }), []);

  const triggeredCount = Object.values(evals).filter((e) => e.triggered).length;
  const watchingCount = alerts.length - triggeredCount;
  const inputClass = "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[#2962FF] focus:ring-1 focus:ring-[#2962FF]/30";

  return (
    <ProductShell>
      <ProductPage>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Alerts</h1>
          </div>
          {alerts.length < MAX_ALERTS && (
            <ProductAction onClick={() => setFormOpen(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Create alert
            </ProductAction>
          )}
        </div>

        {alerts.length > 0 && (
          <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
            {triggeredCount > 0 && `${triggeredCount} triggered`}
            {triggeredCount > 0 && watchingCount > 0 && " · "}
            {watchingCount > 0 && `${watchingCount} watching`}
          </p>
        )}

        {alerts.length >= MAX_ALERTS && (
          <ProductPanel className="mb-4 border-amber-500/20 bg-amber-500/5 p-4 text-center">
            <p className="text-xs text-[var(--color-text-secondary)]">Upgrade to premium for unlimited alerts.</p>
          </ProductPanel>
        )}

        {alerts.length === 0 ? (
          <ProductEmptyState
            icon={Bell} title="No alerts set"
            body="Create an alert to be notified when a stock's score or price changes."
            action={
              <ProductAction onClick={() => setFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Create first alert
              </ProductAction>
            }
          />
        ) : (
          <div className="grid gap-3">
            {alerts.map((alert) => {
              const ev = evals[alert.id];
              const triggered = ev?.triggered ?? false;
              const loading = ev?.loading ?? false;
              const Icon = ALERT_TYPE_OPTIONS.find((o) => o.value === alert.type)?.icon ?? Bell;

              return (
                <ProductPanel key={alert.id} className={`p-4 transition-all ${triggered ? "border-red-500/30 bg-red-500/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${triggered ? "bg-red-500/15 text-red-400" : "bg-[rgba(15,23,42,0.05)] text-[var(--color-text-muted)]"}`}>
                      {triggered ? <BellRing className="h-4 w-4" /> : loading ? <div className="h-4 w-4 animate-pulse rounded-full bg-[var(--color-text-muted)]" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{alert.symbol.toUpperCase()}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${triggered ? "bg-red-500/15 text-red-400" : "bg-[rgba(148,163,184,0.1)] text-[var(--color-text-secondary)]"}`}>
                          {loading ? "Checking..." : triggered ? "TRIGGERED" : "Watching"}
                        </span>
                      </div>
                      <p className={`mt-1 text-xs leading-5 ${triggered ? "text-red-300" : "text-[var(--color-text-secondary)]"}`}>
                        {ev?.error ? `Could not fetch data for ${alert.symbol.toUpperCase()}` : loading ? "Fetching latest data..." : alertMessage(alert, ev ?? EMPTY_EVAL)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {triggered && (
                        <>
                          <ProductAction variant="ghost" onClick={() => research(alert.symbol)}>Research {alert.symbol.toUpperCase()} →</ProductAction>
                          <ProductAction variant="ghost" onClick={() => dismissTrigger(alert.id)}><X className="h-3 w-3" /></ProductAction>
                        </>
                      )}
                      <button type="button" onClick={() => deleteAlert(alert.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors" aria-label="Delete alert">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </ProductPanel>
              );
            })}
          </div>
        )}

        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <ProductPanel className="w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Create alert</h2>
                <button type="button" onClick={() => setFormOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[rgba(148,163,184,0.1)] hover:text-[var(--color-text-primary)] transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Stock</label>
                  <input ref={symbolRef} type="text" value={formSymbol} onChange={(e) => setFormSymbol(e.target.value.toUpperCase())} placeholder="Search or type symbol (e.g. TCS)" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Alert type</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value as AlertRule["type"])} className={inputClass}>
                    {ALERT_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Value</label>
                  <input type="number" value={formThreshold} onChange={(e) => setFormThreshold(e.target.value)} step={formType === "price_below" ? "0.01" : "1"} min="0"
                    placeholder={formType === "price_below" ? "e.g. 2500" : formType === "rsi_above" ? "e.g. 70" : "e.g. 65"} className={inputClass} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <ProductAction variant="secondary" onClick={() => setFormOpen(false)}>Cancel</ProductAction>
                  <ProductAction onClick={addAlert} disabled={!formSymbol.trim() || !formThreshold.trim() || !Number.isFinite(parseFloat(formThreshold))}>Save alert</ProductAction>
                </div>
              </div>
            </ProductPanel>
          </div>
        )}
      </ProductPage>
    </ProductShell>
  );
};

export default AlertsPage;
