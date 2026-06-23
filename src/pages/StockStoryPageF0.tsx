import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, ShoppingBag, Sparkles } from "lucide-react";
import { ProductAction, ProductPage, ProductPanel, ProductShell, ProductStatusPill, productNavigate } from "../components/product/ProductUI";
import { InvestHandoffSheet } from "../components/invest/InvestHandoffSheet";
import { formatINR, formatPercent, useLiveQuote } from "../hooks/useLiveQuotes";
import { fetchUnifiedResearch, type UnifiedResearchResult } from "../lib/product/companyResearchClient";
import { buildCompanyResearch } from "../lib/product/companyResearchRuntime";
import { getCompanyIdentity, normalizeSymbol } from "../lib/product/identity";
import { healthometerLabelFromScore } from "../lib/product/publicLabels";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import type { NewsItemResponse } from "../services/api/client";
import HistoricalPriceChart from "../components/market/HistoricalPriceChart";
import HealthometerPanel from "../components/research/HealthometerPanel";
import FinancialHistogram from "../components/research/FinancialHistogram";
import StockNewsPanel from "../components/research/StockNewsPanel";
import ResearchChecklistPanel from "../components/research/ResearchChecklistPanel";
import TechnicalIntelligencePanel from "../components/research/TechnicalIntelligencePanel";
import OwnershipIntelligencePanel from "../components/research/OwnershipIntelligencePanel";
import CorporateEventsTimeline from "../components/research/CorporateEventsTimeline";
import { TrendlyneWidget } from "../components/external/TrendlyneWidget";

function tickerFromUrl(): string {
  const p = new URLSearchParams(window.location.search);
  return normalizeSymbol(p.get("id") ?? p.get("symbol") ?? p.get("ticker") ?? "");
}

export default function StockStoryPageF0(): JSX.Element {
  const ticker = tickerFromUrl();
  const identity = getCompanyIdentity(ticker, null, null);
  const quote = useLiveQuote(ticker);
  const [investOpen, setInvestOpen] = useState(() => new URLSearchParams(window.location.search).get("page") === "invest");
  const [watchlists] = useState(() => WatchlistEngine.getWatchlists());
  const tracked = watchlists.some((list) => list.tickers.some((item) => normalizeSymbol(item) === ticker));
  const researchFetched = useRef(false);

  const [research, setResearch] = useState<UnifiedResearchResult>(() => ({
    ...buildCompanyResearch(ticker, identity.displayName, identity.sector, null, tracked),
    healthometerLabel: null,
    analysis: null,
    priceHistory: [],
  }));
  const [newsItems, setNewsItems] = useState<NewsItemResponse[]>([]);
  const [newsRefreshedAt, setNewsRefreshedAt] = useState<string>("");
  const [financialSeries, setFinancialSeries] = useState<import("../components/research/FinancialHistogram").FinancialSeries[]>([]);
  const [trendlyneAvailable, setTrendlyneAvailable] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    researchFetched.current = false;
    setTrendlyneAvailable(false);
    fetchUnifiedResearch(ticker, identity.displayName, identity.sector, null, tracked, ctrl.signal).then((result) => {
      if (!ctrl.signal.aborted) { setResearch(result); researchFetched.current = true; }
    });
    import("../services/api/client").then(({ api }) => {
      api.getNews(ticker, { signal: ctrl.signal }).then((res) => {
        if (!ctrl.signal.aborted) {
          setNewsItems(res.items || []);
          setNewsRefreshedAt(res.cachedAt || new Date().toISOString());
        }
      }).catch(() => {});
      api.getFinancialSeries(ticker, { signal: ctrl.signal }).then((res) => {
        if (!ctrl.signal.aborted && res.series) {
          setFinancialSeries(res.series.map((s) => ({
            metric: s.metric as any,
            label: s.label,
            points: s.points.map((p) => ({ period: p.period, value: p.value, unit: p.unit as any })),
          })));
        }
      }).catch(() => {});
      api.getTrendlyneWidget("technicals", ticker, { signal: ctrl.signal }).then((res) => {
        if (!ctrl.signal.aborted) setTrendlyneAvailable(Boolean(res.available && res.widgetUrl));
      }).catch(() => {});
    });
    return () => ctrl.abort();
  }, [ticker, identity.displayName, identity.sector, tracked]);

  const score = research.healthometer.overallScore ?? research.prediction.overallScore;
  const label = research.healthometerLabel ?? healthometerLabelFromScore(research.healthometer.overallScore);
  const dimensions = research.healthometer.dimensions;
  const allDrivers = [...new Set(research.prediction.topPositiveDrivers)];
  const drivers = allDrivers.length ? allDrivers : ["Business quality", "Financial strength", "Capital efficiency"];
  const allRisks = [...new Set(research.prediction.topRiskDrivers)];
  const risks = allRisks.length ? allRisks : [research.riskContext.overall ?? "Review recent business momentum"];

  const contextTone = quote.quote ? (quote.quote.changePercent > 0 ? "positive" : quote.quote.changePercent < 0 ? "risk" : "neutral") : score !== null && score >= 70 ? "positive" : score !== null && score < 45 ? "risk" : "neutral";
  const contextShadow = contextTone === "positive" ? "shadow-[var(--shadow-green-context)]" : contextTone === "risk" ? "shadow-[var(--shadow-red-context)]" : "shadow-[var(--shadow-blue-context)]";

  return <ProductShell>
    <ProductPage className="max-w-[1180px] !py-3 md:!py-4">
      {/* Compact stock header */}
      <header data-context-tone={contextTone} className={`overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] ${contextShadow}`}>
        <div className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold tracking-[0.12em] text-[var(--color-text-secondary)]">{identity.symbol}</span>
              {identity.sector && <span className="text-[11px] text-[var(--color-text-muted)]">· {identity.sector}</span>}
              <ProductStatusPill tone={score !== null && score >= 70 ? "verified" : score !== null && score >= 45 ? "blue" : "muted"}>{label}</ProductStatusPill>
            </div>
            <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text-primary)] md:text-[32px]">{identity.displayName}</h1>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-mono text-[22px] font-semibold tabular-nums tracking-[-0.03em] text-[var(--color-text-primary)] md:text-[26px]">{quote.quote ? formatINR(quote.quote.price) : "—"}</span>
              {quote.quote && (
                <span className={`inline-flex items-center gap-1 font-mono text-sm tabular-nums ${quote.quote.changePercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {quote.quote.changePercent >= 0 ? "+" : ""}{formatINR(quote.quote.change)} ({quote.quote.changePercent >= 0 ? "+" : ""}{formatPercent(quote.quote.changePercent)})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 self-start">
            <ProductAction variant="secondary" onClick={() => productNavigate("compare", ticker)} className="h-9 text-xs">
              <ArrowUpRight className="h-3.5 w-3.5" /> Compare
            </ProductAction>
          </div>
        </div>
        {research.message && <div className="border-t border-[rgba(148,163,184,0.12)] px-3 py-2.5 text-[11px] text-[var(--color-text-secondary)] md:px-4">{research.message}</div>}
      </header>

      {/* Price chart */}
      <section className="mt-3">
        <HistoricalPriceChart symbol={ticker} points={research.priceHistory} />
      </section>

      {/* Healthometer summary — compact, gated detail */}
      <section className="mt-3">
        <HealthometerPanel label={label} score={score} dimensions={dimensions} />
      </section>

      {/* Financial trend histogram — interactive */}
      <section className="mt-3">
        <FinancialHistogram series={financialSeries} />
      </section>

      {/* Trendlyne technical context — only when available */}
      {trendlyneAvailable && (
        <section className="mt-3">
          <TrendlyneWidget kind="technicals" symbol={ticker} title="Technical checklist" description="" lazy />
        </section>
      )}

      {/* News / What changed */}
      <section className="mt-3">
        <StockNewsPanel
          items={newsItems.map((n) => ({
            id: `${ticker}-${n.publishedAt}-${n.headline.slice(0, 40)}`,
            symbol: ticker, headline: n.headline, publisher: n.publisher,
            publishedAt: n.publishedAt, summary: n.summary, whyItMatters: n.whyItMatters,
            url: n.url, category: n.category as "company" | "results" | "brokerage" | "sector" | "corporate_action" | "market",
          }))}
          refreshedAt={newsRefreshedAt}
        />
      </section>

      {/* Thesis + review + premium CTA */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
        <main className="min-w-0 space-y-5">
          {/* Thesis overview — compact */}
          <section>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Research narrative</div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Thesis overview</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ProductPanel className="p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Why it matters</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{drivers[0]} is the clearest signal supporting further research.</p>
              </ProductPanel>
              <ProductPanel className="p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">What to challenge</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{risks[0]}. A complete thesis requires evidence that this concern is either contained or actively improving.</p>
              </ProductPanel>
            </div>
          </section>

          {/* Premium deep-dive CTA (replaces former factor intelligence grid) */}
          <ProductPanel className="p-4 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-[#2962FF]" />
            <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">Go deeper with Investor plan</p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
              Unlock score breakdown, detailed factor analysis, trend changes, and advanced comparison.
            </p>
            <a href="/?page=pricing" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#2962FF] px-4 py-2 text-xs font-semibold text-white">
              Investor ₹99 <ArrowUpRight className="h-3 w-3" />
            </a>
          </ProductPanel>
        </main>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ProductPanel className="p-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Review checklist</h2>
            <div className="mt-3 space-y-2.5">
              {["Check the current price", "Challenge the key risk", "Compare a close alternative", "Decide position size externally"].map((item) => (
                <div key={item} className="flex gap-2 text-sm text-[var(--color-text-secondary)]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2962FF]" />{item}
                </div>
              ))}
            </div>
          </ProductPanel>
          <button onClick={() => productNavigate("methodology")} className="w-full px-2 py-2 text-left text-xs leading-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
            How to interpret scores →
          </button>
        </aside>
      </div>

      {/* Research intelligence sections — only when populated, otherwise omitted */}
      <section className="mt-5 space-y-4">
        {(research.healthometer.dimensions.length > 0 || research.priceHistory.length > 1) && (
          <>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              <Sparkles className="h-3.5 w-3.5" /> Research Intelligence
            </div>
            <ResearchChecklistPanel
              input={{
                healthometerScores: dimensions.map((d) => ({ id: d.id, label: d.label, score: d.score })),
                momentumScore: dimensions.find((d) => d.id === "momentum")?.score ?? null,
                riskScore: dimensions.find((d) => d.id === "risk")?.score ?? null,
                peContext: research.valuationContext?.peContext ?? null,
                pbContext: research.valuationContext?.pbContext ?? null,
                debtWarning: research.riskContext?.debtWarning ?? null,
                volatilityNote: research.riskContext?.volatilityNote ?? null,
                revenueGrowth: null, profitGrowth: null, roce: null, roe: null,
                debtToEquity: null, currentRatio: null, promoterHolding: null,
                fiiHolding: null, hasPeerData: false,
              }}
            />
            <TechnicalIntelligencePanel
              input={{
                priceHistory: research.priceHistory.map((point) => ({ close: point.close, volume: point.volume ?? undefined })),
                momentumScore: dimensions.find((d) => d.id === "momentum")?.score ?? null,
                volatilityScore: dimensions.find((d) => d.id === "risk")?.score ?? null,
                priceChangePercent: quote.quote?.changePercent ?? null,
                rsiValue: null, macdValue: null, distanceFrom52WeekHigh: null,
              }}
            />
          </>
        )}
      </section>

      {/* Invest CTA */}
      <button
        type="button"
        onClick={() => setInvestOpen(true)}
        className="fixed bottom-5 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1220] px-5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(15,23,42,.28),inset_0_1px_0_rgba(255,255,255,.15)] transition hover:-translate-y-0.5 hover:bg-[#16A34A] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 md:bottom-5 md:right-5"
        aria-label={`Invest in ${identity.displayName}`}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10"><ShoppingBag className="h-3.5 w-3.5" /></span>
        <span>Invest</span>
      </button>
      <InvestHandoffSheet open={investOpen} onClose={() => setInvestOpen(false)} symbol={ticker} companyName={identity.displayName} marketPrice={quote.quote?.price ?? null} />
    </ProductPage>
  </ProductShell>;
}
