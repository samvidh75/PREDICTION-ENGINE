import React from "react";
import { Bookmark, Eye, TrendingUp, Search, ArrowLeftRight } from "lucide-react";
import { productNavigate, ProductAction, ProductPage, ProductPanel, ProductShell, ProductPageHeader } from "../components/product/ProductUI";

export default function TrackPage(): JSX.Element {
  const sections = [
    {
      id: "saved",
      label: "Saved companies",
      icon: <Bookmark className="h-4 w-4" />,
      description: "Companies you've saved for review. Return to them when you're ready to go deeper.",
      action: { label: "Search companies", page: "search" as const },
    },
    {
      id: "changed",
      label: "What changed",
      icon: <TrendingUp className="h-4 w-4" />,
      description: "Recent developments in companies you track. Stay informed without checking every day.",
      action: { label: "Browse scanner", page: "scanner" as const },
    },
    {
      id: "review",
      label: "Review queue",
      icon: <Eye className="h-4 w-4" />,
      description: "Companies flagged for closer review based on recent signals or risk markers.",
      action: { label: "View risk rising", page: "scanner" as const },
    },
    {
      id: "compare",
      label: "Compare companies",
      icon: <ArrowLeftRight className="h-4 w-4" />,
      description: "Evaluate companies side by side to find which thesis is stronger.",
      action: { label: "Open compare", page: "compare" as const },
    },
  ];

  return (
    <ProductShell>
      <ProductPage>
        <ProductPageHeader
          title="Track your thesis"
          subtitle="Save companies, revisit what changed, and decide what deserves another look."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <ProductPanel key={section.id} className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  {section.icon}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{section.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{section.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <ProductAction
                  variant="secondary"
                  onClick={() => productNavigate(section.action.page)}
                >
                  {section.action.label}
                </ProductAction>
              </div>
            </ProductPanel>
          ))}
        </div>
      </ProductPage>
    </ProductShell>
  );
}
