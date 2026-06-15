import React from "react";
import { BarChart3, Eye, Search, ShieldCheck } from "lucide-react";
import MobileNav from "../components/navigation/MobileNav";
import TopNav from "../components/navigation/TopNav";
import { ResearchDisclaimer } from "../components/ui/PageHeader";

function setPage(pageKey: string, id?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  if (id) params.set("id", id);
  else params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

const workflow = [
  { icon: <Search className="h-5 w-5" />, title: "Search", body: "Find Indian listed companies by ticker, name, or sector and open the company research page." },
  { icon: <BarChart3 className="h-5 w-5" />, title: "Review", body: "Read source-backed scores only when production data supports them. Missing fields stay unavailable." },
  { icon: <Eye className="h-5 w-5" />, title: "Track", body: "Save companies to watchlists and keep research notes separate from investment decisions." },
];

export const PublicLandingPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
      <TopNav />
      <MobileNav />

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-12 pt-28 md:grid-cols-[1.1fr_0.9fr] md:items-end md:pt-32">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Indian equity research platform
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl">
            Research Indian stocks with cleaner context.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            StockStory India helps investors search companies, review source-backed scoring signals, track watchlists, and organise research notes. It is analytical software, not an investment recommendation engine.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setPage("signup")}
              className="h-11 rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Start research
            </button>
            <button
              type="button"
              onClick={() => setPage("methodology")}
              className="h-11 rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-850 transition hover:bg-slate-50"
            >
              View methodology
            </button>
            <button
              type="button"
              onClick={() => setPage("rankings")}
              className="h-11 rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-850 transition hover:bg-slate-50"
            >
              View rankings
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Research discipline</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">Evidence first</span>
          </div>
          <div className="mt-4 grid gap-3">
            {["No fabricated rankings", "No paid placements", "Unavailable data is labelled clearly"].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-950">How the research workflow works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflow.map(({ icon, title, body }) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-md bg-slate-100 p-2 text-emerald-800">{icon}</div>
                <h3 className="text-base font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <ResearchDisclaimer />
      </section>
    </main>
  );
};

export default PublicLandingPage;
