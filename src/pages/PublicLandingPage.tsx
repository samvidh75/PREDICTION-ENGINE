import React from "react";
import { ArrowRight, BarChart3, Eye, Search, ShieldCheck } from "lucide-react";
import MobileNav from "../components/navigation/MobileNav";
import TopNav from "../components/navigation/TopNav";
import { ResearchDisclaimer } from "../components/ui/PageHeader";
import Button from "../components/ui/Button";

function setPage(pageKey: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

const workflow = [
  {
    icon: <Search className="h-5 w-5 text-emerald-700" aria-hidden="true" />,
    title: "Search",
    body: "Find Indian listed companies by ticker, name, or sector. Each result opens a structured company research page.",
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-emerald-700" aria-hidden="true" />,
    title: "Review",
    body: "Read source-backed scoring signals. Fields without production data are clearly labelled as unavailable — no fabricated metrics.",
  },
  {
    icon: <Eye className="h-5 w-5 text-emerald-700" aria-hidden="true" />,
    title: "Track",
    body: "Save companies to watchlists and attach research notes, kept separate from any investment decisions.",
  },
];

const trust = [
  "No fabricated rankings",
  "No paid placements",
  "Unavailable data is labelled clearly",
];

export const PublicLandingPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <TopNav />
      <MobileNav />

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-14 pt-28 md:grid-cols-[1.15fr_0.85fr] md:items-start md:pt-32">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Indian equity research
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.06] tracking-tight text-slate-950 sm:text-5xl">
            Research Indian stocks with cleaner context.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            StockStory India helps investors search companies, review source-backed scoring signals, and organise research notes. Analytical software — not an investment recommendation engine.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              id="hero-cta-start"
              type="button"
              onClick={() => setPage("signup")}
              className="h-11 px-6 text-sm"
            >
              Start Research <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              id="hero-cta-methodology"
              type="button"
              onClick={() => setPage("methodology")}
              variant="secondary"
              className="h-11 px-6 text-sm"
            >
              View Methodology
            </Button>
            <Button
              id="hero-cta-rankings"
              type="button"
              onClick={() => setPage("rankings")}
              variant="secondary"
              className="h-11 px-6 text-sm"
            >
              View Rankings
            </Button>
          </div>
        </div>

        {/* Trust card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Research principles
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
              Evidence first
            </span>
          </div>
          <div className="grid gap-2">
            {trust.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow section */}
      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-950">
            How the research workflow works
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflow.map(({ icon, title, body }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-lg bg-emerald-50 p-2.5">
                  {icon}
                </div>
                <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <ResearchDisclaimer />
      </section>
    </main>
  );
};

export default PublicLandingPage;
