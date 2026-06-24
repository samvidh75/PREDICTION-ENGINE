import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Check, ShoppingBag, Sparkles, ArrowUpRight, ShieldCheck, TrendingUp, BarChart3, Scale, Activity, History } from "lucide-react";
import { addTrackedCompany, isTracked, removeTrackedCompany } from "../lib/track/trackStore";
import { addRecentResearch } from "../lib/recent/recentResearchStore";
import { ProductPage, ProductPanel, ProductShell, ProductStatusPill, productNavigate } from "../components/product/ProductUI";
import { InvestHandoffSheet } from "../components/invest/InvestHandoffSheet";
import { formatINR, formatPercent, useLiveQuote } from "../hooks/useLiveQuotes";
import { fetchUnifiedResearch, type UnifiedResearchResult } from "../lib/product/companyResearchClient";
import { buildCompanyResearch } from "../lib/product/companyResearchRuntime";
import { getCompanyIdentity, normalizeSymbol } from "../lib/product/identity";
import { healthometerLabelFromScore } from "../lib/product/publicLabels";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { api, type NewsItemResponse } from "../services/api/client";
import { getStaleSnapshot, setCachedSnapshot } from "../lib/product/stockPageSnapshotCache";
import { resolveCanonicalResearchState } from "../backend/services/research/CanonicalResearchStateResolver";
import type { EngineResearchSnapshot } from "../shared/research/CanonicalResearchStateTypes";
import type { StockPageSnapshot } from "../shared/research/StockPageSnapshotTypes";
import HistoricalPriceChart from "../components/market/HistoricalPriceChart";
import HealthometerPanel from "../components/research/HealthometerPanel";
import FinancialHistogram from "../components/research/FinancialHistogram";
import StockNewsPanel from "../components/research/StockNewsPanel";
import ResearchChecklistPanel from "../components/research/ResearchChecklistPanel";
import TechnicalIntelligencePanel from "../components/research/TechnicalIntelligencePanel";
import OwnershipIntelligencePanel from "../components/research/OwnershipIntelligencePanel";
import CorporateEventsTimeline from "../components/research/CorporateEventsTimeline";
import { TrendlyneWidget } from "../components/external/TrendlyneWidget";
import ScoreRing, { scoreColor } from "../components/ui/ScoreRing";
import ClassificationBadge from "../components/ui/ClassificationBadge";
import SebiDisclaimer from "../components/compliance/SebiDisclaimer";
import type { UnifiedClassification } from "../prediction-engine/types";

function tickerFromUrl(): string {
  const p = new URLSearchParams(window.location.search);
  return normalizeSymbol(p.get("id") ?? p.get("symbol") ?? p.get("ticker") ?? "");
}

const FactorBar = React.memo(function FactorBar({ label, score }: { label: string; score: number | null }): JSX.Element {
  return <div className="min-w-[120px] flex-1"><div className="mb-1.5 flex justify-between text-[11px] font-semibold text-slate-600"><span>{label}</span><span>{score === null ? "—" : Math.round(score)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${score ?? 0}%`, backgroundColor: scoreColor(score) }} /></div></div>;
});

export default function StockStoryPageF0(): JSX.Element {
  const ticker = tickerFromUrl();
  const identity = getCompanyIdentity(ticker, null, null);
  const quote = useLiveQuote(ticker);
  const [investOpen, setInvestOpen] = useState(() => new URLSearchParams(window.location.search).get("page") === "invest");
  const [watchlists] = useState(() => WatchlistEngine.getWatchlists());
  const tracked = watchlists.some((list) => list.tickers.some((item) => normalizeSymbol(item) === ticker));
  const researchFetched = useRef(false);

  const cachedSnap = useMemo(() => getStaleSnapshot(ticker), [ticker]);

  const [research, setResearch] = useState<UnifiedResearchResult>(() => {
    const s = cachedSnap;
    return {
      ...buildCompanyResearch(ticker, identity.displayName, identity.sector, null, tracked),
      healthometerLabel: s?.healthometer?.label ?? null,
      analysis: s?.healthometer?.overallScore !== null ? {
        companyHealth: s?.healthometer?.label ?? null,
        convictionState: s?.healthometer?.label ?? null,
        summary: s?.investContext?.thesis ?? null,
        thesis: s?.investContext?.thesis ?? null,
        bullCase: null, bearCase: null,
        keyDrivers: s?.investContext?.keyStrengths ?? [],
        riskFlags: s?.investContext?.keyRisks ?? [],
        watchNext: s?.investContext?.whatToWatch ?? [],
        investmentChecklist: [],
      } : null,
      healthometer: s?.healthometer ? {
        overallScore: s.healthometer.overallScore,
        overallStatus: (s.healthometer.dimensions?.filter(d => d.score !== null).length ?? 0) >= 7 ? "Complete" : "Partial research context",
        dimensions: s.healthometer.dimensions.map(d => ({ id: d.id, label: d.label, score: d.score, status: d.status as any, color: "#64748B" })),
      } : { overallScore: null, overallStatus: "Not enough information for this view yet", dimensions: [] },
      priceHistory: s?.priceHistory ?? [],
    };
  });
  const [newsItems, setNewsItems] = useState<NewsItemResponse[]>(() =>
    (cachedSnap?.news ?? []).map((n) => ({
      headline: n.headline, publisher: n.publisher, publishedAt: n.publishedAt,
      summary: n.summary, whyItMatters: n.whyItMatters, url: n.url, category: n.category,
    }))
  );
  const [newsRefreshedAt, setNewsRefreshedAt] = useState<string>("");
  const [financialSeries, setFinancialSeries] = useState<import("../components/research/FinancialHistogram").FinancialSeries[]>(() =>
    (cachedSnap?.financialSeries ?? []).map((s) => ({
      metric: s.metric as any, label: s.label,
      points: s.points.map((p) => ({ period: p.period, value: p.value, unit: p.unit as any })),
    }))
  );
  const [trendlyneAvailable, setTrendlyneAvailable] = useState(() => cachedSnap?.trendlyne?.available ?? false);
  const [activeTab, setActiveTab] = useState<"thesis" | "fundamentals" | "risk" | "technicals" | "peers" | "history">("thesis");

  useEffect(() => {
    const ctrl = new AbortController();
    researchFetched.current = false;
    setTrendlyneAvailable(false);

    fetch(`${window.location.origin}/api/research/snapshot/${ticker}`, { signal: ctrl.signal })
      .then(r => r.json()).then((data) => {
        if (ctrl.signal.aborted || !data?.data) return;
        const snap = data.data as StockPageSnapshot;
        setCachedSnapshot(ticker, snap);
        if (snap.priceHistory?.length) setResearch((prev) => ({ ...prev, priceHistory: snap.priceHistory }));
        if (snap.healthometer?.overallScore !== null) {
          setResearch((prev) => ({
            ...prev,
            healthometer: { overallScore: snap.healthometer.overallScore, overallStatus: "Partial research context", dimensions: snap.healthometer.dimensions.map(d => ({ id: d.id, label: d.label, score: d.score, status: d.status as any, color: "#64748B" })) },
            healthometerLabel: snap.healthometer.label,
          }));
        }
        if (snap.news?.length) setNewsItems(snap.news.map((n: any) => ({ headline: n.headline, publisher: n.publisher, publishedAt: n.publishedAt, summary: n.summary, whyItMatters: n.whyItMatters, url: n.url, category: n.category })));
        if (snap.financialSeries?.length) setFinancialSeries(snap.financialSeries.map((s: any) => ({ metric: s.metric, label: s.label, points: s.points.map((p: any) => ({ period: p.period, value: p.value, unit: p.unit })) })));
        if (snap.trendlyne?.available) setTrendlyneAvailable(true);
        researchFetched.current = true;
      }).catch(() => {});

    fetchUnifiedResearch(ticker, identity.displayName, identity.sector, null, tracked, ctrl.signal).then((result) => {
      if (!ctrl.signal.aborted) { setResearch(result); researchFetched.current = true; }
    });
    addRecentResearch({ symbol: ticker, companyName: identity.displayName });
    api.getNews(ticker, { signal: ctrl.signal }).then((res) => {
      if (!ctrl.signal.aborted) { setNewsItems(res.items || []); setNewsRefreshedAt(res.cachedAt || new Date().toISOString()); }
    }).catch(() => {});
    api.getFinancialSeries(ticker, { signal: ctrl.signal }).then((res) => {
      if (!ctrl.signal.aborted && res.series) {
        setFinancialSeries(res.series.map((s) => ({
          metric: s.metric as any, label: s.label,
          points: s.points.map((p) => ({ period: p.period, value: p.value, unit: p.unit as any })),
        })));
      }
    }).catch(() => {});
    return () => ctrl.abort();
  }, [ticker, identity.displayName, identity.sector, tracked]);

  const engineSnapshots: EngineResearchSnapshot[] = [
    {
      engineName: "healthometer",
      score: research.healthometer.overallScore,
      label: research.healthometerLabel || "",
      dataAsOf: null,
      freshnessDays: null,
    },
    {
      engineName: "prediction",
      score: research.prediction.overallScore,
      label: research.prediction.publicResearchStance || "",
      dataAsOf: null,
      freshnessDays: null,
    },
  ].filter(s => s.score !== null);

  const canonical = useMemo(() => resolveCanonicalResearchState(ticker, engineSnapshots), [ticker, engineSnapshots]);

  const score = canonical.score ?? research.healthometer.overallScore ?? research.prediction.overallScore;
  const label = canonical.label || research.healthometerLabel || healthometerLabelFromScore(research.healthometer.overallScore) || "Not enough information";
  const dimensions = research.healthometer.dimensions;
  const allDrivers = [...new Set(research.prediction.topPositiveDrivers)];
  const drivers = allDrivers.length ? allDrivers : ["Business quality", "Financial strength", "Capital efficiency"];
  const allRisks = [...new Set(research.prediction.topRiskDrivers)];
  const risks = allRisks.length ? allRisks : [research.riskContext.overall ?? "Review recent business momentum"];

  const contextTone = quote.quote ? (quote.quote.changePercent > 0 ? "positive" : quote.quote.changePercent < 0 ? "risk" : "neutral") : score !== null && score >= 70 ? "positive" : score !== null && score < 45 ? "risk" : "neutral";
  const contextShadow = contextTone === "positive" ? "shadow-[var(--shadow-green-context)]" : contextTone === "risk" ? "shadow-[var(--shadow-red-context)]" : "shadow-[var(--shadow-blue-context)]";
  const latestHistoryPoint = research.priceHistory.at(-1) ?? null;
  const quoteUpdatedAt = quote.quote?.updatedAt ? new Date(quote.quote.updatedAt) : null;
  const quoteAgeHours = quoteUpdatedAt && !Number.isNaN(quoteUpdatedAt.getTime()) ? (Date.now() - quoteUpdatedAt.getTime()) / 3_600_000 : null;
  const chartQuoteMismatch = Boolean(quote.quote && latestHistoryPoint && Math.abs(quote.quote.price - latestHistoryPoint.close) / quote.quote.price > 0.005);
  const marketDataNeedsReview = quote.quote?.delayed === true || quoteAgeHours === null || quoteAgeHours > 30 || chartQuoteMismatch;

  const factorNames = ["Quality", "Valuation", "Growth", "Stability", "Momentum", "Safety"];
  const factorScores = factorNames.map((name) => {
    const aliases = name === "Safety" ? ["risk", "safety"] : [name.toLowerCase()];
    const match = dimensions.find((dimension) => aliases.includes(dimension.id.toLowerCase()) || aliases.includes(dimension.label.toLowerCase()));
    return { name, score: match?.score ?? null, detail: match?.status ?? "Awaiting enough verified inputs to explain this factor." };
  });
  const classification: UnifiedClassification = score === null ? "INSUFFICIENT_DATA" : score >= 80 ? "EXCELLENT" : score >= 65 ? "HEALTHY" : score >= 50 ? "STABLE" : score >= 35 ? "WEAKENING" : "AT_RISK";
  const availableFactors = factorScores.filter((factor) => factor.score !== null).length;
  const dataCompleteness = Math.round((availableFactors / factorScores.length) * 100);
  const confidence = dataCompleteness >= 80 ? "HIGH" : dataCompleteness >= 50 ? "MEDIUM" : "LOW";
  const latestMetrics = financialSeries.slice(0, 9).map((series) => ({ label: series.label, value: series.points.at(-1)?.value ?? null, unit: series.points.at(-1)?.unit ?? "" }));

  return <ProductShell>
    <ProductPage className="max-w-[1280px] !py-5">
      <header className="sticky top-24 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-blue-600">NSE · {identity.symbol}</span><ClassificationBadge classification={classification} /><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${confidence === "HIGH" ? "bg-emerald-50 text-emerald-700" : confidence === "MEDIUM" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{confidence} CONFIDENCE</span></div><h1 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{identity.displayName}</h1></div>
          <div><div className="font-mono text-2xl font-bold text-slate-950">{quote.quote ? formatINR(quote.quote.price) : "—"}</div>{quote.quote && <div className={`mt-1 text-sm font-bold ${quote.quote.changePercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>{quote.quote.changePercent >= 0 ? "+" : ""}{formatPercent(quote.quote.changePercent)}</div>}</div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => isTracked(ticker) ? removeTrackedCompany(ticker) : addTrackedCompany({ symbol: ticker, companyName: identity.displayName, addedAt: new Date().toISOString(), source: "stock_page" })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Bookmark className="mr-1 inline h-3.5 w-3.5" />Track</button><button type="button" onClick={() => productNavigate("compare", ticker)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Compare</button><button type="button" onClick={() => setInvestOpen(true)} title="Research only — consult a SEBI-registered adviser before investing" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Continue to broker →</button></div>
        </div>
      </header>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center"><ScoreRing score={score} size="xl" /><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-4">{factorScores.map((factor) => <FactorBar key={factor.name} label={factor.name} score={factor.score} />)}</div><div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span><strong className="text-slate-900">{dataCompleteness}%</strong> data available — {confidence} confidence</span><span className="rounded bg-slate-100 px-2 py-1 font-mono">Unified Engine v2.0.0</span></div></div></div>
      </section>

      <nav className="mt-5 flex overflow-x-auto border-b border-slate-200" aria-label="Stock research tabs">{(["thesis", "fundamentals", "risk", "technicals", "peers", "history"] as const).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 border-b-2 px-4 py-3 text-xs font-bold capitalize ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>{tab}</button>)}</nav>

      <div className="mt-5 min-h-[360px]">
        {activeTab === "thesis" && <div className="grid gap-4 md:grid-cols-2">{factorScores.map((factor, index) => { const Icon = [ShieldCheck, Scale, TrendingUp, BarChart3, Activity, ShieldCheck][index]; return <article key={factor.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-bold text-slate-950"><Icon className="h-4 w-4 text-blue-600" />{factor.name}</span><strong className="text-2xl" style={{ color: scoreColor(factor.score) }}>{factor.score === null ? "—" : Math.round(factor.score)}</strong></div><FactorBar label="Factor score" score={factor.score} /><p className="mt-4 text-sm leading-6 text-slate-600">{factor.score === null ? "This factor is waiting for enough verified source data." : `${factor.name} currently provides ${factor.score >= 65 ? "supportive" : factor.score >= 50 ? "mixed" : "cautious"} evidence for the research thesis. ${factor.detail}`}</p>{factor.score === null && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Missing inputs · awaiting data</p>}</article>; })}</div>}

        {activeTab === "fundamentals" && <section><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 9 }, (_, index) => latestMetrics[index] ?? ({ label: ["Revenue Growth", "EPS Growth", "Profit Growth", "Gross Margin", "Operating Margin", "Net Margin", "Current Ratio", "D/E Ratio", "FCF Yield"][index], value: null, unit: "" })).map((metric) => <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-semibold text-slate-500">{metric.label}</div><div className="mt-2 text-2xl font-bold text-slate-950">{metric.value === null ? "—" : `${metric.value}${metric.unit}`}</div>{metric.value === null && <div className="mt-1 text-[10px] text-slate-400">Awaiting data</div>}</div>)}</div><p className="mt-4 text-xs text-slate-500">Last updated: {quoteUpdatedAt?.toLocaleString("en-IN") ?? "Awaiting source refresh"} · Public company filings and licensed market data</p></section>}

        {activeTab === "risk" && <section><div className="mb-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><ShieldCheck className="h-8 w-8 text-emerald-600" /><div><div className="text-xs font-bold uppercase text-slate-400">Safety score · higher is safer</div><div className="text-3xl font-black" style={{ color: scoreColor(factorScores[5].score) }}>{factorScores[5].score ?? "—"}</div></div></div><div className="grid gap-4 md:grid-cols-2">{[["Market Risk", "Beta"], ["Financial Leverage", "D/E"], ["Liquidity", "Current ratio"], ["Earnings Quality", "FCF vs earnings"]].map(([name, metric], index) => { const value = latestMetrics.find((item) => item.label.toLowerCase().includes(metric.toLowerCase().split(" ")[0]))?.value ?? null; const level = value === null ? "AWAITING DATA" : index === 0 && value > 2 ? "CRITICAL" : value > 1 ? "HIGH" : "LOW"; return <div key={name} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex justify-between"><strong>{name}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${level === "CRITICAL" ? "bg-red-50 text-red-700" : level === "HIGH" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{level}</span></div><div className="mt-4 text-xl font-bold">{value ?? "—"}</div><p className="mt-2 text-xs text-slate-500">{metric} · {value === null ? "Verified input not yet available." : "Review this metric in the context of sector norms."}</p></div>; })}</div></section>}

        {activeTab === "technicals" && (trendlyneAvailable || research.priceHistory.length > 1 ? <section><div className="mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" /><strong>Overall technical signal: <span className="text-blue-600">NEUTRAL</span></strong></div><TechnicalIntelligencePanel input={{ priceHistory: research.priceHistory.map((point) => ({ close: point.close, volume: point.volume ?? undefined })), momentumScore: factorScores[4].score, volatilityScore: factorScores[5].score, priceChangePercent: quote.quote?.changePercent ?? null, rsiValue: null, macdValue: null, distanceFrom52WeekHigh: null }} /></section> : <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><Activity className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 font-bold">Technical data not yet available for this stock</h2><p className="mt-2 text-sm text-slate-500">RSI, MACD and ADX cards will appear after the next indicator refresh.</p></div>)}

        {activeTab === "peers" && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><Scale className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 font-bold">Peer comparison is being prepared</h2><p className="mt-2 text-sm text-slate-500">Add this company to Compare to review verified peers side by side.</p><button onClick={() => productNavigate("compare", ticker)} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white">Add to compare</button></div>}
        {activeTab === "history" && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><History className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 font-bold">Thesis snapshots will appear here once you start tracking this company.</h2></div>}
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
            <div id="technicals" className="scroll-mt-16">
            <TechnicalIntelligencePanel
              input={{
                priceHistory: research.priceHistory.map((point) => ({ close: point.close, volume: point.volume ?? undefined })),
                momentumScore: dimensions.find((d) => d.id === "momentum")?.score ?? null,
                volatilityScore: dimensions.find((d) => d.id === "risk")?.score ?? null,
                priceChangePercent: quote.quote?.changePercent ?? null,
                rsiValue: null, macdValue: null, distanceFrom52WeekHigh: null,
              }}
            />
            </div>
          </>
        )}
      </section>

      {/* Invest CTA */}
      <button
        type="button"
        onClick={() => setInvestOpen(true)}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1220] px-5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(15,23,42,.28),inset_0_1px_0_rgba(255,255,255,.15)] transition hover:-translate-y-0.5 hover:bg-[#16A34A] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 md:bottom-5 md:right-5"
        aria-label={`Invest in ${identity.displayName}`}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10"><ShoppingBag className="h-3.5 w-3.5" /></span>
        <span>Invest</span>
      </button>

      <SebiDisclaimer variant="footer" className="mt-8 rounded-xl" />
      <InvestHandoffSheet open={investOpen} onClose={() => setInvestOpen(false)} symbol={ticker} companyName={identity.displayName} marketPrice={quote.quote?.price ?? null} />
    </ProductPage>
  </ProductShell>;

}
