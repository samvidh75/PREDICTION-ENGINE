import React, { useEffect, useState } from "react";
import { ArrowRight, BarChart3, FileSearch, Eye, ShieldCheck, Search, TrendingUp, Database, Activity } from "lucide-react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import { api } from "../services/api/client";
import { PremiumPage, navigatePage } from "../components/premium/PremiumUI";
import { GlobalCommandButton } from "../components/intelligence/GlobalCommandButton";
import { RoundedDepthPanel } from "../components/intelligence/RoundedDepthPanel";
import { DataFreshnessOrb } from "../components/intelligence/DataFreshnessOrb";
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
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 md:pt-32 lg:pb-24">
        <div className="relative z-10 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#8B949E]">
              <Activity className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />
              StockStory Intelligence OS
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-tight text-[#E6EDF3] sm:text-6xl lg:text-7xl">
              AI-native research intelligence for Indian equities.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#8B949E] sm:text-lg">
              Evidence-first, transparent, no advice. StockStory turns verified market data and model scoring into inspectable research intelligence. Every score shows its inputs, confidence, freshness, and gaps.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button id="hero-cta-rankings" type="button" onClick={() => navigatePage("rankings")} className="h-12 px-6 text-sm">
                Explore rankings <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button id="hero-cta-methodology" type="button" onClick={() => navigatePage("trust")} variant="secondary" glass className="h-12 px-6 text-sm">
                View Trust Centre
              </Button>
            </div>
          </div>

          {/* Product preview */}
          <div className="space-y-4">
            <div className="rounded-[32px] border border-white/[0.08] bg-[#0D1117] p-6 shadow-[0_12px_48px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                  <span className="text-xs font-semibold text-[#E6EDF3]">Model intelligence</span>
                </div>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-[#8B949E]">Research only</span>
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Coverage</div>
                  <div className="mt-1 font-mono text-xl font-bold text-[#E6EDF3]">{coverage.symbols !== null ? coverage.symbols.toLocaleString("en-IN") : "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Scored</div>
                  <div className="mt-1 font-mono text-xl font-bold text-[#E6EDF3]">{coverage.scored !== null ? coverage.scored.toLocaleString("en-IN") : "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Records</div>
                  <div className="mt-1 font-mono text-xl font-bold text-[#E6EDF3]">{coverage.registryRows !== null ? coverage.registryRows.toLocaleString("en-IN") : "—"}</div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
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

            <div className="flex flex-wrap gap-2">
              <SourceTracePill provider="Indian API" status="healthy" domain="quote" />
              <SourceTracePill provider="Yahoo" status="unavailable" domain="blocked" />
              <SourceTracePill provider="Jugaad" status="degraded" domain="fallback" />
              <SourceTracePill provider="NSELib" status="archived" domain="evaluated" />
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[#E6EDF3]">Research workflow</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[22px] border border-white/[0.06] bg-[#0D1117] p-5">
              <Icon className="h-5 w-5 text-[#2962FF]" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-semibold text-[#E6EDF3]">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8B949E]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrity */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-[22px] border border-white/[0.06] bg-[#0D1117] p-6 md:p-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">Data integrity — what is and is not available</h2>
          </div>
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[#8B949E]">
            SSI labels every data gap, marks every unavailable field, and distinguishes model confidence from score visibility. The platform deliberately avoids buy/sell/hold language, fabricated predictions, and hidden missing data. Provider status is exposed in plain language.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button id="hero-cta-start" type="button" onClick={() => navigatePage("signup")} className="h-10 px-4 text-xs">Sign in / Get started</Button>
            <Button id="onboarding-cta-about" type="button" onClick={() => navigatePage("about")} variant="secondary" className="h-10 px-4 text-xs">Read mission</Button>
          </div>
        </div>
      </section>
    </PremiumPage>
  );
};

export default PublicLandingPage;
