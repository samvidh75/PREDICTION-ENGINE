import React from "react";
import { Bookmark, TrendingUp, Search, BarChart3 } from "lucide-react";
import { productNavigate, ProductPage, ProductShell } from "../components/product/ProductUI";
import { SectionHeader } from "../components/ui/SectionHeader";

export default function TrackPage(): JSX.Element {
  const actions = [
    {
      label: "Open AI Scanner",
      icon: <BarChart3 className="h-4 w-4" />,
      page: "scanner",
    },
    {
      label: "Search company",
      icon: <Search className="h-4 w-4" />,
      page: "search",
    },
  ];

  return (
    <ProductShell>
      <ProductPage className="max-w-[1180px]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Track your thesis</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Save companies, revisit what changed, and decide what deserves another look.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: "saved",
              label: "Saved companies",
              icon: <Bookmark className="h-5 w-5" />,
              description: "Companies you return to for deeper research.",
              action: "Search companies",
              page: "search",
            },
            {
              id: "changed",
              label: "What changed",
              icon: <TrendingUp className="h-5 w-5" />,
              description: "Recent developments in companies you track.",
              action: "Browse scanner",
              page: "scanner",
            },
          ].map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => productNavigate(section.page)}
              className="flex flex-col items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                {section.icon}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{section.label}</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{section.description}</p>
              </div>
              <span className="mt-1 text-xs font-medium text-blue-600">{section.action} →</span>
            </button>
          ))}

          {actions.map((a) => (
            <button
              key={a.page}
              type="button"
              onClick={() => productNavigate(a.page)}
              className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-transparent p-5 text-left text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-blue-200 hover:text-[var(--color-text-primary)]"
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      </ProductPage>
    </ProductShell>
  );
}
