import React from "react";
import { Activity, AlertTriangle, TrendingUp, TrendingDown, BarChart3, Eye } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate, ProductEmptyState } from "../components/product/ProductUI";

const CATEGORIES = [
  { icon: AlertTriangle, label: "Thesis changed", desc: "New information may affect your thesis." },
  { icon: TrendingUp, label: "Score changed", desc: "Research score has moved." },
  { icon: TrendingDown, label: "Risk changed", desc: "Risk factors have shifted." },
  { icon: BarChart3, label: "Valuation changed", desc: "Valuation context has changed." },
  { icon: Eye, label: "Watchlist review", desc: "Time to review a tracked company." },
];

export const AlertsPage: React.FC = () => {
  return (
    <ProductShell>
      <ProductPage>
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">What changed that matters?</h1>
        </div>
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <ProductPanel key={cat.label} className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2962FF]" aria-hidden="true" />
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">{cat.label}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{cat.desc}</p>
                  </div>
                </div>
              </ProductPanel>
            );
          })}
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default AlertsPage;