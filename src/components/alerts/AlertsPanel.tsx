import React, { useState } from "react";
import { Bell } from "lucide-react";
import { ProductPanel, ProductAction, ProductStatusPill, productNavigate } from "../product/ProductUI";

const ALERT_TABS = ["All", "Thesis changed", "Score changed", "Risk changed", "Valuation changed", "Watchlist review"] as const;
type AlertTab = typeof ALERT_TABS[number];

export const AlertsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AlertTab>("All");
  const alertsEnabled = false;

  if (!alertsEnabled) {
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
      <div className="flex flex-col items-center py-8 text-center">
        <Bell className="h-5 w-5 text-[#64748B]" />
        <p className="mt-2 text-xs text-[#64748B]">No alerts yet.</p>
      </div>
    </ProductPanel>
  );
};

export default AlertsPanel;
