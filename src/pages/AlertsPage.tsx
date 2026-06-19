import React from "react";
import { Bell } from "lucide-react";
import { AlertsPanel } from "../components/alerts/AlertsPanel";
import { ProductShell, ProductPage } from "../components/product/ProductUI";

export const AlertsPage: React.FC = () => {
  return (
    <ProductShell>
      <ProductPage>
        <div className="flex items-center gap-2 mb-5">
          <Bell className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h1 className="text-base font-semibold text-[#E6EDF3]">What Changed</h1>
        </div>
        <AlertsPanel />
      </ProductPage>
    </ProductShell>
  );
};

export default AlertsPage;
