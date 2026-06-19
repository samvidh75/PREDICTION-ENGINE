import React, { useState, useEffect } from "react";
import { BarChart3, Search, ArrowLeftRight, X, ShieldCheck } from "lucide-react";

const GUIDE_KEY = "ss_first_run_guide_dismissed";

function isGuideDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(GUIDE_KEY) === "true";
}

function dismissGuide() {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUIDE_KEY, "true");
}

export function FirstRunGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isGuideDismissed()) setVisible(true);
  }, []);

  const handleDismiss = () => {
    dismissGuide();
    setVisible(false);
  };

  const navigate = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
    handleDismiss();
  };

  if (!visible) return null;

  return (
    <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#0D1117] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xs font-semibold text-[#E6EDF3]">Get started with StockStory India</h2>
          <p className="mt-1 text-[11px] text-[#8B949E]">
            Research workspace for Indian equities. No buy/sell advice — inspect scores, compare companies, and trace data sources.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1.5 text-[#484F58] hover:text-[#E6EDF3]"
          aria-label="Dismiss guide"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate("search")}
          className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left hover:bg-white/[0.05] transition-colors"
        >
          <Search className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h3 className="mt-2 text-[11px] font-semibold text-[#E6EDF3]">Search a company</h3>
          <p className="mt-0.5 text-[10px] text-[#8B949E]">Find Indian equities by symbol, name, or sector.</p>
        </button>
        <button
          type="button"
          onClick={() => navigate("compare")}
          className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left hover:bg-white/[0.05] transition-colors"
        >
          <ArrowLeftRight className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h3 className="mt-2 text-[11px] font-semibold text-[#E6EDF3]">Compare companies</h3>
          <p className="mt-0.5 text-[10px] text-[#8B949E]">Compare scores, factors, and research depth side by side.</p>
        </button>
        <button
          type="button"
          onClick={() => navigate("trust")}
          className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left hover:bg-white/[0.05] transition-colors"
        >
          <ShieldCheck className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h3 className="mt-2 text-[11px] font-semibold text-[#E6EDF3]">Check source trust</h3>
          <p className="mt-0.5 text-[10px] text-[#8B949E]">Review methodology, scores, and research depth.</p>
        </button>
      </div>
    </div>
  );
}
