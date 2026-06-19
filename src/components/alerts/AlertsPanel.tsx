import React, { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { ProductPanel, ProductAction, ProductStatusPill, productNavigate } from "../product/ProductUI";
import { api, type AlertItem } from "../../services/api/client";

const ALERT_TABS = ["All", "Thesis changed", "Score changed", "Risk changed", "Valuation changed", "Watchlist review"] as const;
type AlertTab = typeof ALERT_TABS[number];

export const AlertsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AlertTab>("All");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  const trackedSymbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"];

  const fetchAlerts = useCallback(async (symbol: string) => {
    setLoading(true);
    try {
      const res = await api.getAlerts(symbol);
      if (res.data && Array.isArray(res.data)) {
        setAlerts((prev) => [...prev, ...res.data]);
      }
    } catch {
      // quiet - no alerts for this symbol
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setAlerts([]);
    trackedSymbols.forEach((sym) => fetchAlerts(sym));
  }, [fetchAlerts]);

  const filtered = alerts.filter((a) => {
    if (activeTab === "All") return true;
    return a.type === activeTab;
  });

  if (alerts.length === 0 && !loading) {
    return (
      <ProductPanel className="p-6">
        <div className="flex flex-col items-center text-center">
          <Bell className="h-6 w-6 text-[#64748B]" />
          <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">What Changed</h3>
          <p className="mt-2 max-w-md text-xs leading-5 text-[#9AA7B5]">
            Track a company to review important changes — thesis shifts, score movements, risk changes, and valuation updates.
          </p>
          <p className="mt-3 text-xs text-[#64748B]">
            Alerts are displayed here. No email or push notifications yet.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ProductAction onClick={() => productNavigate("scanner")}>Open scanner</ProductAction>
            <ProductAction variant="secondary" onClick={() => productNavigate("search")}>Search company</ProductAction>
          </div>
        </div>
      </ProductPanel>
    );
  }

  return (
    <ProductPanel className="p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        {ALERT_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
              activeTab === tab
                ? "border-[#2962FF] bg-[#2962FF]/10 text-[#2962FF]"
                : "border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] text-[#9AA7B5] hover:text-[#E6EDF3]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {loading && alerts.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-xs text-[#9AA7B5]">
          Loading alerts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Bell className="h-5 w-5 text-[#64748B]" />
          <p className="mt-2 text-xs text-[#64748B]">No alerts yet for this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-3 ${
                alert.acknowledged
                  ? "border-[rgba(148,163,184,0.08)] bg-[rgba(255,255,255,0.02)]"
                  : "border-[rgba(41,98,255,0.15)] bg-[rgba(41,98,255,0.04)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#E6EDF3]">{alert.title}</span>
                    <ProductStatusPill tone={alert.type === "risk_change" ? "danger" : alert.type === "thesis_change" ? "warning" : "blue"}>
                      {alert.type}
                    </ProductStatusPill>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">{alert.body}</p>
                  <span className="mt-1 block text-[10px] text-[#64748B]">{new Date(alert.timestamp).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => productNavigate("stock", alert.symbol)}
                    className="rounded border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[10px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
                  >
                    Research
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProductPanel>
  );
};

export default AlertsPanel;
