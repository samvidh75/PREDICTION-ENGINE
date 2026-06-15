import React from "react";
import { Search, Eye, HelpCircle, ArrowRight } from "lucide-react";

interface ResearchJourneyPanelProps {
  onStartSearch: () => void;
  onViewMethodology: () => void;
}

export const ResearchJourneyPanel: React.FC<ResearchJourneyPanelProps> = ({
  onStartSearch,
  onViewMethodology,
}) => {
  const steps = [
    {
      number: "01",
      icon: <Search className="h-4 w-4 text-emerald-600" />,
      title: "Query Ticker or Sector",
      description: "Use the primary search to find any Indian listed company (e.g. RELIANCE, TCS, INFY).",
    },
    {
      number: "02",
      icon: <HelpCircle className="h-4 w-4 text-emerald-600" />,
      title: "Analyze & Understand",
      description: "Review source-backed metrics and learn how factor scoring works via the Methodology section.",
    },
    {
      number: "03",
      icon: <Eye className="h-4 w-4 text-emerald-600" />,
      title: "Save & Monitor",
      description: "Keep track of interesting companies on your Watchlist and add your own research notes.",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Your Research Workspace</h2>
          <p className="text-xs text-slate-500">
            StockStory is designed around a structured, evidence-based exploration journey.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewMethodology}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-700 transition"
        >
          How scoring works <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="relative flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-400">Step {step.number}</span>
              <div className="rounded-md bg-white p-1.5 shadow-sm border border-slate-100">{step.icon}</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.description}</p>
            </div>
            {idx === 0 && (
              <button
                type="button"
                onClick={onStartSearch}
                className="mt-2 w-full rounded bg-slate-950 py-1.5 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Search a stock
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResearchJourneyPanel;
