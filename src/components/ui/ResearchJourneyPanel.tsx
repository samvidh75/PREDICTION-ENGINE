import React from "react";
import { ArrowRight, Eye, HelpCircle, Search } from "lucide-react";

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
      icon: <Search className="h-4 w-4 text-emerald-700" aria-hidden="true" />,
      title: "Search a stock",
      description:
        "Find any Indian listed company by ticker symbol, name, or sector — e.g. RELIANCE, TCS, INFY.",
      cta: (
        <button
          type="button"
          onClick={onStartSearch}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-950 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
        >
          Open Search <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      ),
    },
    {
      number: "02",
      icon: <HelpCircle className="h-4 w-4 text-emerald-700" aria-hidden="true" />,
      title: "Review the evidence",
      description:
        "Read source-backed scores and factor breakdowns. Fields without production data stay clearly marked as unavailable.",
    },
    {
      number: "03",
      icon: <Eye className="h-4 w-4 text-emerald-700" aria-hidden="true" />,
      title: "Save and monitor",
      description:
        "Add companies to your Watchlist and attach research notes — separate from any investment decisions.",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Research workflow</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            A three-step, evidence-first process for exploring Indian equities.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewMethodology}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-800 transition hover:text-emerald-700"
        >
          How scoring works <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Step {step.number}
              </span>
              <div className="rounded-lg bg-white p-1.5 shadow-sm border border-slate-100">
                {step.icon}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.description}</p>
            </div>
            {step.cta}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResearchJourneyPanel;
