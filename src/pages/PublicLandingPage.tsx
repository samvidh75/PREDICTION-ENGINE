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
    body: "Find companies by ticker, name, or sector with coverage indicators.",
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-emerald-700" aria-hidden="true" />,
    title: "Analyse",
    body: "Review scoring signals, fundamentals, and source labels in one place.",
  },
  {
    icon: <Eye className="h-5 w-5 text-emerald-700" aria-hidden="true" />,
    title: "Monitor",
    body: "Track companies and research notes without fabricated scores.",
  },
];

export const PublicLandingPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-background font-sans text-slate-900 antialiased">
      <TopNav />
      <MobileNav />

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-24 md:pt-32">
        <div className="grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-start">
          <div>
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Evidence-driven research
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.06] tracking-tight text-slate-900 sm:text-5xl">
              Indian equity research, with evidence you can inspect.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-500 md:text-lg">
              Track signals, fundamentals, and ranking changes without noisy dashboards. Built for research workflows, not tips.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                id="hero-cta-start"
                type="button"
                onClick={() => setPage("signup")}
                className="h-11 px-5 text-sm"
              >
                Start Research <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                id="hero-cta-methodology"
                type="button"
                onClick={() => setPage("methodology")}
                variant="secondary"
                className="h-11 px-5 text-sm"
              >
                View Methodology
              </Button>
              <Button
                id="hero-cta-rankings"
                type="button"
                onClick={() => setPage("rankings")}
                variant="secondary"
                className="h-11 px-5 text-sm"
              >
                View Rankings
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-medium text-slate-500">
                Research principles
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">
                Evidence first
              </span>
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                No fabricated rankings or scores
              </div>
              <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                Unavailable data clearly labelled
              </div>
              <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                Source-backed signals only
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/60 bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-xl font-semibold tracking-tight text-slate-900">
            How it works
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {workflow.map(({ icon, title, body }) => (
              <div key={title} className="rounded-xl border border-slate-200/60 bg-white p-6">
                <div className="mb-4 inline-flex rounded-lg bg-emerald-50 p-2.5">
                  {icon}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <ResearchDisclaimer />
      </section>

          <section className="bg-accent-primary py-10" aria-label="Call to action">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-lg font-semibold text-white">Start researching</h2>
          <p className="mt-2 text-sm text-white/70 max-w-md mx-auto">
            Search companies, review signals, and track your research.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              id="onboarding-cta-signup"
              type="button"
              onClick={() => setPage("signup")}
              variant="secondary"
              className="h-11 border-white/20 bg-white px-6 text-sm text-accent-primary hover:bg-slate-100"
            >
              Create free account <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              id="onboarding-cta-about"
              type="button"
              onClick={() => setPage("about")}
              variant="outline"
              className="h-11 border-white/20 px-6 text-sm text-white/80 hover:bg-white/10 hover:text-white"
            >
              Learn more
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PublicLandingPage;
