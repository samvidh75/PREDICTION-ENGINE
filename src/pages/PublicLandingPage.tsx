import React from "react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import { ShieldCheck, BarChart3, Search, Table2 } from "lucide-react";

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

      <section className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-28 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pt-32">
        <div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Indian equity research workspace
        </div>
        
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
          Research Indian stocks with cleaner context.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          StockStory India helps serious investors search companies, compare source-backed signals, read score context, and track watchlists without turning research into advice.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setPage("signup")}
            className="h-11 rounded-lg bg-slate-100 px-6 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => setPage("methodology")}
            className="h-11 rounded-lg border border-slate-700 bg-slate-900/40 px-6 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Read methodology
          </button>
        </div>

        <div className="mt-5 max-w-md text-xs font-medium text-slate-500">
          Research signals only. Not investment advice.
        </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Research workflow</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">From symbol search to source context</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="space-y-3 text-sm">
            {[
              ["Search", "Find Indian listed companies by ticker, name, or sector."],
              ["Read", "Review score, valuation, risk, quality, and momentum context."],
              ["Track", "Save companies to a watchlist and keep research notes."],
            ].map(([label, body]) => (
              <div key={label} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                <p className="font-semibold text-slate-200">{label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-900 bg-slate-900/20 py-14">
        <div className="mx-auto mb-8 max-w-5xl px-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">Built for repeatable stock research</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            The product stays close to available data, labels missing fields clearly, and separates research signals from investment decisions.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-6 md:grid-cols-3">
          <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="mb-4 inline-flex p-2 rounded-md bg-slate-950 text-slate-300">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Fast company lookup</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Search by ticker, company name, or sector and move directly into the company research page.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="mb-4 inline-flex p-2 rounded-md bg-slate-950 text-slate-300">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Source-aware scoring</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Scores are shown only when backend data provides usable values; missing fields remain unavailable.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="mb-4 inline-flex p-2 rounded-md bg-slate-950 text-slate-300">
              <Table2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Watchlist discipline</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Track companies and notes without portfolio claims or recommendations.
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
