import React, { useEffect, useMemo, useState } from "react";
import { Check, ShoppingBag, Sparkles } from "lucide-react";
import { ProductAction, ProductPage, ProductPanel, ProductShell, ProductStatusPill, productNavigate } from "../components/product/ProductUI";
import { InvestHandoffSheet } from "../components/invest/InvestHandoffSheet";
import { formatINR, formatPercent, useLiveQuote } from "../hooks/useLiveQuotes";
import { fetchUnifiedResearch, type UnifiedResearchResult } from "../lib/product/companyResearchClient";
import { buildCompanyResearch } from "../lib/product/companyResearchRuntime";
import { getCompanyIdentity, normalizeSymbol } from "../lib/product/identity";
import { buildSinglePriceContext } from "../lib/product/stockDisplay";
import { healthometerLabelFromScore } from "../lib/product/publicLabels";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import type { NewsItemResponse } from "../services/api/client";
import HistoricalPriceChart from "../components/market/HistoricalPriceChart";
import HealthometerPanel from "../components/research/HealthometerPanel";
import AnalysisMeters from "../components/research/AnalysisMeters";
import type { AnalysisMeter } from "../components/research/AnalysisMeters";
import FinancialHistogram from "../components/research/FinancialHistogram";
import StockNewsPanel from "../components/research/StockNewsPanel";
import ResearchChecklistPanel from "../components/research/ResearchChecklistPanel";
import TechnicalIntelligencePanel from "../components/research/TechnicalIntelligencePanel";
import OwnershipIntelligencePanel from "../components/research/OwnershipIntelligencePanel";
import CorporateEventsTimeline from "../components/research/CorporateEventsTimeline";

function tickerFromUrl(): string {
  const p = new URLSearchParams(window.location.search);
  return normalizeSymbol(p.get("id") ?? p.get("symbol") ?? p.get("ticker") ?? "");
}

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="mb-4"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">{eyebrow}</div><h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">{title}</h2>{body && <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">{body}</p>}</div>;
}

export default function StockStoryPageF0(): JSX.Element {
  const ticker = tickerFromUrl();
  const identity = getCompanyIdentity(ticker, null, null);
  const quote = useLiveQuote(ticker);
  const [investOpen, setInvestOpen] = useState(() => new URLSearchParams(window.location.search).get("page") === "invest");
  const [watchlists] = useState(() => WatchlistEngine.getWatchlists());
  const tracked = watchlists.some((list) => list.tickers.some((item) => normalizeSymbol(item) === ticker));

  const [research, setResearch] = useState<UnifiedResearchResult>(() => ({
    ...buildCompanyResearch(ticker, identity.displayName, identity.sector, null, tracked),
    healthometerLabel: null,
    analysis: null,
    priceHistory: [],
  }));
  const [newsItems, setNewsItems] = useState<NewsItemResponse[]>([]);
  const [newsRefreshedAt, setNewsRefreshedAt] = useState<string>("");

  useEffect(() => {
    const ctrl = new AbortController();
    fetchUnifiedResearch(ticker, identity.displayName, identity.sector, null, tracked, ctrl.signal).then((result) => {
      if (!ctrl.signal.aborted) setResearch(result);
    });
    import("../services/api/client").then(({ api }) => {
      api.getNews(ticker, { signal: ctrl.signal }).then((res) => {
        if (!ctrl.signal.aborted) {
          setNewsItems(res.items || []);
          setNewsRefreshedAt(res.cachedAt || new Date().toISOString());
        }
      }).catch(() => {});
    });
    return () => ctrl.abort();
  }, [ticker, identity.displayName, identity.sector, tracked]);

  const score = research.healthometer.overallScore ?? research.prediction.overallScore;
  const label = research.healthometerLabel ?? healthometerLabelFromScore(research.healthometer.overallScore);
  const price = buildSinglePriceContext(
    quote.quote ? formatINR(quote.quote.price) : "Price pending",
    quote.quote ? `${formatINR(quote.quote.change)} (${formatPercent(quote.quote.changePercent)})` : null,
    quote.quote ? quote.quote.changePercent >= 0 : null,
  );
  const dimensions = research.healthometer.dimensions;
  const allDrivers = [...new Set(research.prediction.topPositiveDrivers)];
  const drivers = allDrivers.length ? allDrivers : ["Business quality", "Financial strength", "Capital efficiency"];
  const allRisks = [...new Set(research.prediction.topRiskDrivers)];
  const risks = allRisks.length ? allRisks : [research.riskContext.overall ?? "Review recent business momentum"];

  const contextTone = quote.quote ? (quote.quote.changePercent > 0 ? "positive" : quote.quote.changePercent < 0 ? "risk" : "neutral") : score !== null && score >= 70 ? "positive" : score !== null && score < 45 ? "risk" : "neutral";
  const contextShadow = contextTone === "positive" ? "shadow-[var(--shadow-green-context)]" : contextTone === "risk" ? "shadow-[var(--shadow-red-context)]" : "shadow-[var(--shadow-blue-context)]";

  const analysisMeters: AnalysisMeter[] = useMemo(() => {
    const meters: AnalysisMeter[] = [];
    const momentumDim = dimensions.find((d) => d.id === "momentum");
    if (momentumDim) {
      meters.push({
        key: "momentum",
        label: "Momentum",
        value: momentumDim.score,
        interpretation: momentumDim.score !== null ? (momentumDim.score >= 65 ? "Positive momentum" : momentumDim.score >= 45 ? "Mixed signals" : "Weakening") : undefined,
        status: momentumDim.score !== null ? (momentumDim.score >= 65 ? "strong" : momentumDim.score >= 45 ? "neutral" : "caution") : "not_enough_information",
      });
    }
    if (research.valuationContext?.peContext) {
      meters.push({ key: "pe", label: "P/E ratio", value: research.valuationContext.peContext, interpretation: "Compared to historical and sector ranges", status: "neutral" });
    }
    if (research.valuationContext?.pbContext) {
      meters.push({ key: "pb", label: "P/B ratio", value: research.valuationContext.pbContext, interpretation: "Price to book value", status: "neutral" });
    }
    const riskDim = dimensions.find((d) => d.id === "risk");
    if (riskDim && riskDim.score !== null) {
      meters.push({ key: "risk", label: "Risk score", value: riskDim.score, interpretation: riskDim.score >= 65 ? "Lower risk profile" : riskDim.score >= 45 ? "Moderate risk" : "Elevated risk", status: riskDim.score >= 65 ? "strong" : riskDim.score >= 45 ? "neutral" : "caution" });
    }
    const qualityDim = dimensions.find((d) => d.id === "quality");
    if (qualityDim && qualityDim.score !== null) {
      meters.push({ key: "quality", label: "Quality", value: qualityDim.score, interpretation: qualityDim.score >= 65 ? "Strong business quality" : qualityDim.score >= 45 ? "Adequate quality" : "Below average", status: qualityDim.score >= 65 ? "strong" : qualityDim.score >= 45 ? "neutral" : "caution" });
    }
    return meters;
  }, [research, dimensions]);

  const financialSeries: import("../components/research/FinancialHistogram").FinancialSeries[] = useMemo(() => {
    return [];
  }, [research]);

  return <ProductShell>
    <ProductPage className="max-w-[1120px] !py-4 md:!py-6">
      <header data-context-tone={contextTone} className={`overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] backdrop-blur-[18px] ${contextShadow}`}>
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:p-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold tracking-[0.12em] text-[var(--color-text-secondary)]">{identity.symbol}</span>
              {identity.sector && <span className="text-xs text-[#64748B]">· {identity.sector}</span>}
              <ProductStatusPill tone={score !== null && score >= 70 ? "verified" : score !== null && score >= 45 ? "blue" : "muted"}>{label}</ProductStatusPill>
            </div>
            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.035em] text-[var(--color-text-primary)] md:text-[40px]">{identity.displayName}</h1>
          </div>
          <div className="flex min-w-[200px] flex-col justify-center rounded-2xl border border-[var(--color-border)] bg-white/80 p-4 shadow-[var(--shadow-sm)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Price</div>
            <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">{price.price}</div>
            {price.change && <div className={`mt-1 font-mono text-xs tabular-nums ${price.positive ? "text-[#16A34A]" : "text-[#EF4444]"}`}>{price.change}</div>}
          </div>
        </div>
        {research.message && <div className="border-t border-[rgba(148,163,184,0.12)] px-4 py-3 text-xs text-[var(--color-text-secondary)] md:px-5">{research.message}</div>}
        <div data-testid="stock-action-cluster" className="flex flex-wrap gap-2 border-t border-[var(--color-border)] bg-slate-50/70 p-3 md:px-5">
          <ProductAction variant="secondary" onClick={() => productNavigate("compare", ticker)} className="min-w-[132px]">Compare</ProductAction>
        </div>
      </header>

      <section className="mt-4">
        <HistoricalPriceChart symbol={ticker} points={research.priceHistory} />
      </section>

      <section className="mt-4">
        <HealthometerPanel label={label} score={score} dimensions={dimensions} />
      </section>

      <section className="mt-4">
        <AnalysisMeters meters={analysisMeters} />
      </section>

      <section className="mt-4">
        <FinancialHistogram series={financialSeries} />
      </section>

      <section className="mt-5">
        <StockNewsPanel
          items={newsItems.map((n) => ({
            id: `${ticker}-${n.publishedAt}-${n.headline.slice(0, 40)}`,
            symbol: ticker,
            headline: n.headline,
            publisher: n.publisher,
            publishedAt: n.publishedAt,
            summary: n.summary,
            whyItMatters: n.whyItMatters,
            url: n.url,
            category: n.category as "company" | "results" | "brokerage" | "sector" | "corporate_action" | "market",
          }))}
          refreshedAt={newsRefreshedAt}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <main className="min-w-0 space-y-6">
          <section>
            <SectionTitle eyebrow="Research narrative" title="The thesis in one pass" body="The core positives, risks, and review points before taking any external action." />
            <div className="grid gap-4 md:grid-cols-2">
              <ProductPanel className="p-5">
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Why it matters</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{drivers[0]} is the clearest signal supporting further research. Assess whether this strength is durable and reflected in the current valuation.</p>
              </ProductPanel>
              <ProductPanel className="p-5">
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">What to challenge</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{risks[0]}. A complete thesis requires evidence that this concern is either contained or actively improving.</p>
              </ProductPanel>
            </div>
          </section>
          <section>
            <SectionTitle eyebrow="Factor intelligence" title="Condition by dimension" />
            <div className="grid gap-3 sm:grid-cols-2">
              {dimensions.map((d) => (
                <ProductPanel key={d.id} className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{d.label}</h3>
                    <p className="mt-1 text-xs text-[#64748B]">{d.score === null ? "Not enough information" : d.score >= 65 ? "Supporting the thesis" : d.score >= 45 ? "Balanced context" : "Needs review"}</p>
                  </div>
                  <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">{d.score ?? "—"}</div>
                </ProductPanel>
              ))}
            </div>
          </section>
        </main>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ProductPanel className="p-5">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Review checklist</h2>
            <div className="mt-4 space-y-3">
              {["Check the current price", "Challenge the key risk", "Compare a close alternative", "Decide position size externally"].map((item) => (
                <div key={item} className="flex gap-2.5 text-sm text-[var(--color-text-secondary)]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2962FF]" />{item}
                </div>
              ))}
            </div>
          </ProductPanel>
          <button onClick={() => productNavigate("methodology")} className="w-full px-2 py-2 text-left text-xs leading-5 text-[#64748B] hover:text-[var(--color-text-secondary)]">
            How to interpret Healthometer and Prediction Engine →
          </button>
        </aside>
      </div>

      <section className="mt-6 space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <Sparkles className="h-4 w-4" /> Research Intelligence
        </div>
        <ResearchChecklistPanel input={{ healthometerScores: dimensions.map((d) => ({ id: d.id, label: d.label, score: d.score })), momentumScore: dimensions.find((d) => d.id === "momentum")?.score ?? null, riskScore: dimensions.find((d) => d.id === "risk")?.score ?? null, peContext: research.valuationContext?.peContext ?? null, pbContext: research.valuationContext?.pbContext ?? null, debtWarning: research.riskContext?.debtWarning ?? null, volatilityNote: research.riskContext?.volatilityNote ?? null, revenueGrowth: null, profitGrowth: null, roce: null, roe: null, debtToEquity: null, currentRatio: null, promoterHolding: null, fiiHolding: null, hasPeerData: false }} />
        <TechnicalIntelligencePanel input={{ priceHistory: research.priceHistory.map((point) => ({ close: point.close, volume: point.volume ?? undefined })), momentumScore: dimensions.find((d) => d.id === "momentum")?.score ?? null, volatilityScore: dimensions.find((d) => d.id === "risk")?.score ?? null, priceChangePercent: quote.quote?.changePercent ?? null, rsiValue: null, macdValue: null, distanceFrom52WeekHigh: null }} />
        <OwnershipIntelligencePanel input={{ snapshots: [] }} />
        <CorporateEventsTimeline events={[]} />
      </section>

      <button type="button" onClick={() => setInvestOpen(true)} className="fixed bottom-20 right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full border border-white/50 bg-[#0B1220] px-5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,.32),inset_0_1px_0_rgba(255,255,255,.18)] transition hover:-translate-y-1 hover:bg-[#16A34A] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 md:bottom-5 md:right-5" aria-label={`Buy ${identity.displayName} through broker`}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><ShoppingBag className="h-4 w-4" /></span>
        <span>Buy via broker</span>
      </button>
      <InvestHandoffSheet open={investOpen} onClose={() => setInvestOpen(false)} symbol={ticker} companyName={identity.displayName} marketPrice={quote.quote?.price ?? null} />
    </ProductPage>
  </ProductShell>;
}
