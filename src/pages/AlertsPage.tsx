import React from "react";
import { Activity } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate } from "../components/product/ProductUI";

const ALLOWED_CATEGORIES = [
  "thesis changed",
  "score changed",
  "risk changed",
  "valuation changed",
  "financial strength changed",
  "Healthometer changed",
  "watchlist review",
  "price moved",
  "peer became more attractive",
];

export const AlertsPage: React.FC = () => {
  return (
    <ProductShell>
      <ProductPage>
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h1 className="text-base font-semibold text-[#E6EDF3]">What Changed</h1>
        </div>
        <ProductPanel className="p-6">
          <div className="flex flex-col items-center text-center">
            <Activity className="h-6 w-6 text-[#64748B]" />
            <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">What Changed</h3>
            <p className="mt-2 max-w-md text-xs leading-5 text-[#9AA7B5]">
              Track a company to review important changes.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {ALLOWED_CATEGORIES.map((cat) => (
                <span key={cat} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-2 py-0.5 text-[10px] text-[#9AA7B5]">
                  {cat}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ProductAction onClick={() => productNavigate("scanner")}>Open scanner</ProductAction>
              <ProductAction variant="secondary" onClick={() => productNavigate("search")}>Search company</ProductAction>
            </div>
          </div>
        </ProductPanel>
      </ProductPage>
    </ProductShell>
  );
};

export default AlertsPage;