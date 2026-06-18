import React, { useEffect, useState } from "react";
import { ArrowRight, FileSearch, Eye, ShieldCheck, Search, Database, Activity } from "lucide-react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import { api } from "../services/api/client";
import { PremiumPage, navigatePage } from "../components/premium/PremiumUI";
import { ModelRunBadge } from "../components/intelligence/ModelRunBadge";
import { PredictionConfidenceBar } from "../components/intelligence/PredictionConfidenceBar";
import { SourceTracePill } from "../components/intelligence/SourceTracePill";
import { DataFreshnessLine } from "../components/intelligence/DataFreshnessLine";

const workflow = [
  { icon: Search, title: "Search", body: "Search Indian equities by symbol, company, or sector." },
  { icon: FileSearch, title: "Inspect", body: "Review model scores, factor context, provider freshness, and gaps." },
  { icon: Eye, title: "Track", body: "Save companies to watchlists and revisit research changes over time." },
  { icon: ShieldCheck, title: "Audit", body: "Check provider domain health, data lineage, and scoring methodology." },
];

export const PublicLandingPage: React.FC = () => {
  const [coverage, setCoverage] = useState<{ symbols: number | null; scored: number | null; updated: string | null; registryRows: number | null }>({
    symbols: null, scored: null, updated: null, registryRows: null,
  });

  useEffect(() => {
    const ctrl = new AbortController();
    api.getDataCoverage().then((cov) => {
      if (ctrl.signal.aborted) return;
      setCoverage({
        symbols: cov.coverage?.symbols?.count ?? null,
        scored: cov.coverage?.predictionRegistry?.symbolCount ?? null,
        updated: cov.coverage?.predictionRegistry?.latestPredictionDate ?? cov.generatedAt ?? null,
        registryRows: cov.coverage?.predictionRegistry?.rowCount ?? null,
      });
    }).catch(() => {});
    return () => ctrl.abort();
  }, []);

  return (
    <PremiumPage nav={<><TopNav /><MobileNav /></>}>
      {/* Full-width Hero — no narrow column */}
      <section className="relative w-full px-6 pb-14 pt-20 md:px-10 md:pt-28 lg:px-16 xl:px-24">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-[#8B949E]">
              <Activity className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />
              Research Intelligence OS
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-tight text-[#E6EDF3] sm:text-5xl lg:text-6xl">
              AI-native research intelligence for Indian equities.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#8B949E] sm:text-base">
              Evidence-first, transparent, no advice. Every score shows its inputs, confidence, freshness, and gaps.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button id="hero-cta-rankings" type="button" onClick={() => navigatePage("rankings")} className="h-10 px-5 text-xs">
                Explore rankings <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button id="hero-cta-methodology" type="button" onClick={() => navigatePage("trust")} variant="secondary" glass className="h-10 px-5 text-xs">
                View Trust Centre
              </Button>
            </div>
          </div>

          {/* Compact product preview */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0D1117] p-5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />
                  <span className="text-[11px] font-semibold text-[#E6EDF3]">Model intelligence</span>
                </div>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-[#8B949E]">Research only</span>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Coverage</div>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[#E6EDF3]">{coverage.symbols !== null ? coverage.symbols.toLocaleString("en-IN") : "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Scored</div>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[#E6EDF3]">{coverage.scored !== null ? coverage.scored.toLocaleString("en-IN") : "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Records</div>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[#E6EDF3]">{coverage.registryRows !== null ? coverage.registryRows.toLocaleString("en-IN") : "—"}</div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <PredictionConfidenceBar score={
                  coverage.registryRows !== null && coverage.scored !== null
                    ? Math.min(100, Math.round((coverage.scored / (coverage.symbols || 1)) * 100))
                    : null
                } label="Coverage completeness" />
                {coverage.updated && <ModelRunBadge runDate={coverage.updated} />}
              </div>
            </div>

            {(coverage.symbols || coverage.scored) && (
              <DataFreshnessLine items={[
                { label: "Prices", status: coverage.symbols ? "fresh" as const : "unavailable" as const },
                { label: "Factors", status: coverage.scored ? "fresh" as const : "unavailable" as const },
                { label: "Predictions", status: coverage.updated ? "fresh" as const : "unavailable" as const },
              ]} />
            )}

            <div className="flex flex-wrap gap-1.5">
              <SourceTracePill provider="Indian API" status="healthy" domain="quote" />
              <SourceTracePill provider="Yahoo" status="unavailable" domain="blocked" />
              <SourceTracePill provider="Jugaad" status="degraded" domain="fallback" />
              <SourceTracePill provider="NSELib" status="archived" domain="evaluated" />
            </div>
          </div>
        </div>
      </section>

      {/* Full-width Workflow — 2-col on desktop, 4-col only on xl+ */}
      <section className="w-full border-t border-white/[0.04] px-6 py-10 md:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="mb-5 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Research workflow</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {workflow.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-[#0D1117] p-3.5">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />
                  <h3 className="text-xs font-semibold text-[#E6EDF3]">{title}</h3>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#8B949E]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full-width Integrity — left/right composition, not a single block */}
      <section className="w-full border-t border-white/[0.04] px-6 py-10 md:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-[#E6EDF3]">Data integrity</h2>
            </div>
            <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-[#8B949E]">
              Every data gap, unavailable field, and model confidence level is labelled. No buy/sell/hold, no fabricated predictions, no hidden missing data. Provider status is exposed in plain language.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button id="hero-cta-start" type="button" onClick={() => navigatePage("signup")} className="h-9 px-4 text-[11px]">Sign in / Get started</Button>
              <Button id="onboarding-cta-about" type="button" onClick={() => navigatePage("about")} variant="secondary" className="h-9 px-4 text-[11px]">Read mission</Button>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0D1117] p-4">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">
              <span>What you will see</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#E6EDF3]">Source-backed</span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#E6EDF3]">Fresh / stale</span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#E6EDF3]">Confidence</span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#E6EDF3]">Gaps labelled</span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#E6EDF3]">Provider status</span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#E6EDF3]">Lineage trace</span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#E6EDF3]">No advice</span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#E6EDF3]">No forecasts</span>
            </div>
          </div>
        </div>
      </section>
    </PremiumPage>
  );
};

export default PublicLandingPage;
