import React, { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, TrendingUp, TrendingDown, BarChart3, Eye, CheckCircle2 } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate, ProductEmptyState } from "../components/product/ProductUI";
import { loadAuthSession } from "../services/auth/sessionStore";

interface AlertPreference {
  key: string;
  label: string;
  desc: string;
  icon: React.ElementType;
}

const CATEGORIES: AlertPreference[] = [
  { key: "thesis_changed", icon: AlertTriangle, label: "Thesis changed", desc: "New information may affect your thesis." },
  { key: "score_changed", icon: TrendingUp, label: "Score changed", desc: "Research score has moved." },
  { key: "risk_changed", icon: TrendingDown, label: "Risk changed", desc: "Risk factors have shifted." },
  { key: "valuation_changed", icon: BarChart3, label: "Valuation changed", desc: "Valuation context has changed." },
  { key: "watchlist_review", icon: Eye, label: "Watchlist review", desc: "Time to review a tracked company." },
];

const STORAGE_KEY = "ss_alert_preferences";

function loadPreferences(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function savePreferences(prefs: Record<string, boolean>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

async function syncToBackend(prefs: Record<string, boolean>): Promise<void> {
  try {
    const session = loadAuthSession();
    if (!session.uid) return;
    const token = await (window as any).__ss_getToken?.();
    if (!token) return;
    await fetch("/api/investor-state", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ alerts: Object.entries(prefs).filter(([, v]) => v).map(([k]) => k) }),
    });
  } catch { }
}

export const AlertsPage: React.FC = () => {
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() => loadPreferences());
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const session = loadAuthSession();
    setAuthenticated(!!session.uid);
  }, []);

  const togglePreference = useCallback((key: string) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      savePreferences(next);
      syncToBackend(next);
      return next;
    });
  }, []);

  const activeCount = Object.values(preferences).filter(Boolean).length;

  return (
    <ProductShell>
      <ProductPage>
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">What changed that matters?</h1>
        </div>

        {activeCount === 0 ? (
          <ProductEmptyState
            icon={Activity}
            title="Choose the changes you care about"
            body="When one of these shifts for a tracked company, you will know to review your thesis."
            action={
              <div className="flex flex-wrap gap-2">
                <ProductAction onClick={() => productNavigate("scanner")}>Open scanner</ProductAction>
                <ProductAction variant="secondary" onClick={() => productNavigate("search")}>Search company</ProductAction>
              </div>
            }
          />
        ) : (
          <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
            {activeCount} alert{activeCount !== 1 ? "s" : ""} active
            {!authenticated && " — saved on this device"}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const enabled = !!preferences[cat.key];
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => togglePreference(cat.key)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  enabled
                    ? "border-[#2962FF]/30 bg-[rgba(41,98,255,0.06)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-accent)]"
                }`}
                aria-pressed={enabled}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                    enabled ? "bg-[#2962FF] text-white" : "bg-[rgba(15,23,42,0.05)] text-[var(--color-text-muted)]"
                  }`}>
                    {enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">{cat.label}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{cat.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default AlertsPage;
