import React from "react";
import { Bell, Activity } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate } from "../components/product/ProductUI";

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
              Track a company to review important changes — thesis shifts, score movements, risk changes, and valuation updates.
            </p>
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