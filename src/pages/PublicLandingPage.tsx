import React from "react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import { ResearchDisclaimer } from "../components/ui/PageHeader";
import { Search, BarChart3, Eye, ShieldCheck } from "lucide-react";

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
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <TopNav />
      <MobileNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Indian equity research platform
          </div>
          
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Research Indian stocks with cleaner context.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            StockStory India helps investors search companies, review source-backed scoring signals, track watchlists, and organise research notes. The platform is designed for analytical use only — it does not provide investment recommendations.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => setPage("signup")}
              className="h-11 rounded-lg bg-slate-100 px-6 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Create free account
            </button>
            <button
              type="button"
              onClick={() => setPage("methodology")}
              className="h-11 rounded-lg border border-slate-700 bg-slate-900/40 px-6 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Read methodology
            </button>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-500">
            Research signals only. Not investment advice.
          </p>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-t border-slate-900 bg-slate-900/20 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-white">How the research workflow works</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-slate-500">
            Three steps from symbol lookup to organised research context — no portfolio claims or recommendations.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: <Search className="h-5 w-5" />, title: "Search", body: "Find Indian listed companies by ticker, name, or sector. Move directly into the company research page." },
              { icon: <BarChart3 className="h-5 w-5" />, title: "Review scores", body: "Check score context across growth, quality, valuation, risk, and momentum. Scores appear only when backend data provides usable values." },
              { icon: <Eye className="h-5 w-5" />, title: "Track & note", body: "Save companies to a watchlist. Add research notes alongside each entry. No portfolio claims, no recommendations." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-center">
                <div className="mb-4 inline-flex rounded-md bg-slate-950 p-2 text-slate-300">{icon}</div>
                <h3 className="text-base font-semibold text-slate-200">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product principles */}
      <section className="border-t border-slate-800 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-white">Built on source-backed discipline</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            StockStory stays close to available data, labels missing fields clearly, and separates analytical signals from investment decisions. No fabricated metrics, no invented scores.
          </p>
        </div>
      </section>

      {/* Research Disclaimer */}
      <section className="border-t border-slate-800 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <ResearchDisclaimer />
        </div>
      </section>
    </main>
  );
};

export default PublicLandingPage;
