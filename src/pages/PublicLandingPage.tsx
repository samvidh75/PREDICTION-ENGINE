import React, { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Database, Eye, FileSearch, Layers3, Search, ShieldCheck, Sparkles } from "lucide-react";
import MobileNav from "../components/navigation/MobileNav";
import TopNav from "../components/navigation/TopNav";
import Button from "../components/ui/Button";
import { api } from "../services/api/client";
import { IntegrityStrip, MetricCard, PremiumPage, SectionHeader, StatusChip, Surface, navigatePage } from "../components/premium/PremiumUI";

const modules = [
  ["Rankings", "Compare the covered universe by verified score, confidence, freshness, and sector context."],
  ["Company research", "Open a company workspace with factor status, source labels, and data gaps clearly visible."],
  ["Signals", "Inspect research changes after verified update cycles. Signals are not buy or sell calls."],
  ["Coverage", "See provider domain health, freshness, and unavailable data before trusting a result."],
  ["Watchlist", "Save companies for research follow-up without fabricating holdings or broker values."],
];

const workflow = [
  { icon: Search, title: "Discover", body: "Search Indian equities by symbol, company, or sector." },
  { icon: FileSearch, title: "Inspect", body: "Review score inputs, provider freshness, and unavailable evidence." },
  { icon: Eye, title: "Track", body: "Save companies and revisit research changes over time." },
  { icon: ShieldCheck, title: "Verify", body: "Check data coverage and source state in the Trust Centre." },
];

export const PublicLandingPage: React.FC = () => {
  const [coverage, setCoverage] = useState<{ symbols: number | null; scored: number | null; updated: string | null }>({
    symbols: null,
    scored: null,
    updated: null,
  });

  useEffect(() => {
    const ctrl = new AbortController();
    api.getDataCoverage()
      .then((cov) => {
        if (ctrl.signal.aborted) return;
        setCoverage({
          symbols: cov.coverage?.symbols?.count ?? null,
          scored: cov.coverage?.predictionRegistry?.symbolCount ?? null,
          updated: cov.coverage?.predictionRegistry?.latestPredictionDate ?? cov.generatedAt ?? null,
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  return (
    <PremiumPage nav={<><TopNav /><MobileNav /></>}>
      <section className="ss-grid-texture relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 md:pt-32 lg:pb-24">
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/75 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AI-native research terminal for Indian equities
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Indian equity research with a premium command surface.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              StockStory India turns verified market, fundamentals, and scoring data into inspectable research workflows. No recommendations, no fabricated values, no hidden missing data.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button id="hero-cta-start" type="button" onClick={() => navigatePage("signup")} className="h-12 px-6 text-sm">
                Start research <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button id="hero-cta-rankings" type="button" onClick={() => navigatePage("rankings")} variant="secondary" glass className="h-12 px-6 text-sm">
                View live rankings
              </Button>
              <Button id="hero-cta-methodology" type="button" onClick={() => navigatePage("methodology")} variant="secondary" glass className="h-12 px-6 text-sm">
                Trust Centre
              </Button>
            </div>
            <div className="mt-7">
              <IntegrityStrip />
            </div>
          </div>

          <div className="perspective-[1200px]">
            <Surface dark className="ss-lift relative overflow-hidden p-4 sm:p-5 lg:rotate-[-1.5deg]">
              <div className="relative z-10 rounded-[22px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Research command</div>
                    <div className="mt-1 text-xl font-semibold text-white">Market intelligence</div>
                  </div>
                  <StatusChip label="Research only" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Coverage</div>
                    <div className="ss-metric mt-2 text-2xl font-semibold text-white">{coverage.symbols !== null ? coverage.symbols.toLocaleString("en-IN") : "Unavailable"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Scored</div>
                    <div className="ss-metric mt-2 text-2xl font-semibold text-white">{coverage.scored !== null ? coverage.scored.toLocaleString("en-IN") : "Pending"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Freshness</div>
                    <div className="mt-2 text-sm font-semibold text-white">{coverage.updated ? "Verified cycle" : "Unavailable"}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {["Source freshness panel", "Company factor breakdown", "Unavailable data policy"].map((label, index) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3">
                      <span className="text-sm font-medium text-white/86">{label}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${index === 2 ? "bg-amber-300" : "bg-emerald-300"}`} />
                    </div>
                  ))}
                </div>
              </div>
            </Surface>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <SectionHeader eyebrow="Live research preview" title="Coverage is shown honestly, including gaps." body="Counts come from the current data coverage endpoint when available; otherwise the interface marks the value unavailable." />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="Companies covered" value={coverage.symbols !== null ? coverage.symbols.toLocaleString("en-IN") : "Unavailable"} detail="From verified coverage metadata." />
          <MetricCard label="Scored symbols" value={coverage.scored !== null ? coverage.scored.toLocaleString("en-IN") : "Pending"} detail="Latest prediction registry state." />
          <MetricCard label="Provider freshness" value={coverage.updated ? "Available" : "Unavailable"} detail="Detailed source state lives in Trust Centre." tone={coverage.updated ? "ok" : "warn"} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <SectionHeader eyebrow="Workflow" title="From market noise to inspectable research." body="A serious Indian equity workflow needs discovery, inspection, tracking, and source verification in one place." />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {workflow.map(({ icon: Icon, title, body }) => (
            <Surface key={title} className="ss-lift p-6">
              <Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </Surface>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <SectionHeader eyebrow="Modules" title="Built like a research terminal, not a blog template." />
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {modules.map(([title, body]) => (
            <Surface key={title} className="ss-lift p-5">
              <Layers3 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </Surface>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6">
        <Surface dark className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-9">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
              <Database className="h-4 w-4" aria-hidden="true" /> Data integrity
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">Research without pretending missing evidence exists.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
              The product labels unavailable data, separates confidence from scoring, and avoids buy/sell/hold language. Public NSE and provider-domain status are exposed in plain language.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Button id="onboarding-cta-signup" type="button" onClick={() => navigatePage("signup")} className="h-12 px-6 text-sm">Create free account</Button>
            <Button id="onboarding-cta-about" type="button" onClick={() => navigatePage("about")} variant="secondary" className="h-12 px-6 text-sm">Read mission</Button>
          </div>
        </Surface>
      </section>
    </PremiumPage>
  );
};

export default PublicLandingPage;
