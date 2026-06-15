import React from "react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import { ShieldCheck, BarChart3, TrendingUp, HelpCircle } from "lucide-react";

function setPage(pageKey: string, id?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  if (id) params.set("id", id);
  else params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

export const PublicLandingPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-slate-800">
      <TopNav />
      <MobileNav />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-6 pt-32 pb-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-6">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Professional Equity Research Platform
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.15]">
          Indian equity research, made readable.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          StockStory India helps investors review fundamentals, technical signals, risk, valuation and ranking context in one research workspace.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => setPage("signup")}
            className="h-11 px-6 bg-slate-100 text-slate-950 font-semibold rounded-lg hover:bg-slate-200 transition text-sm cursor-pointer"
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => setPage("about")}
            className="h-11 px-6 border border-slate-700 bg-slate-900/40 text-slate-200 font-medium rounded-lg hover:bg-slate-800 transition text-sm cursor-pointer"
          >
            View methodology
          </button>
        </div>

        <div className="mt-6 text-xs text-slate-500 font-medium max-w-md">
          Research signals only. Not investment advice.
        </div>
      </section>

      {/* Core Methodology Highlights */}
      <section className="border-t border-slate-900 bg-slate-900/20 py-16">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="mb-4 inline-flex p-2 rounded-md bg-slate-950 text-slate-300">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Fundamental Scoring</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Consolidated health, growth, and quality indicators evaluated from historical earnings reports and financials.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="mb-4 inline-flex p-2 rounded-md bg-slate-950 text-slate-300">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Technical Context</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Incorporates momentum indicators, moving averages, and volatility signals alongside fundamental scores.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="mb-4 inline-flex p-2 rounded-md bg-slate-950 text-slate-300">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Confidence Context</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Every score displays the engine's underlying confidence rating, highlighting data gaps and signal validity.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Disclaimer */}
      <footer className="border-t border-slate-900 py-12 text-center text-xs text-slate-600 bg-slate-950">
        <p className="max-w-2xl mx-auto px-6 leading-relaxed">
          Disclaimer: StockStory India is an educational and analytics tool. Analysis and indicators provided herein do not constitute investment advice or recommendations. All investments involve risk.
        </p>
      </footer>
    </main>
  );
};

export default PublicLandingPage;
