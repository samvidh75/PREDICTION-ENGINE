import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bookmark, Check, ShieldAlert, Sparkles } from "lucide-react";
import { ProductAction, ProductPage, ProductPanel, ProductShell, ProductStatusPill, productNavigate } from "../components/product/ProductUI";
import { InvestHandoffSheet } from "../components/invest/InvestHandoffSheet";
import { useToast } from "../components/feedback/useToast";
import { formatINR, formatPercent, useLiveQuote } from "../hooks/useLiveQuotes";
import { fetchUnifiedResearch, type UnifiedResearchResult } from "../lib/product/companyResearchClient";
import { buildCompanyResearch } from "../lib/product/companyResearchRuntime";
import { getCompanyIdentity, normalizeSymbol } from "../lib/product/identity";
import { buildSingleActionCluster, buildSinglePriceContext } from "../lib/product/stockDisplay";
import { healthometerLabelFromScore } from "../lib/product/publicLabels";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { StockRegistry } from "../services/stocks/StockRegistry";

function tickerFromUrl(): string {
  const p = new URLSearchParams(window.location.search);
  return normalizeSymbol(p.get("id") ?? p.get("symbol") ?? p.get("ticker") ?? "");
}

const DIM_COLORS: Record<string, string> = {
  quality: "#3B82F6", financial_strength: "#22C55E", valuation: "#A78BFA",
  growth: "#14B8A6", stability: "#64748B", risk: "#F59E0B", momentum: "#38BDF8",
};

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="mb-4"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">{eyebrow}</div><h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[#E6EDF3]">{title}</h2>{body && <p className="mt-1 max-w-2xl text-sm leading-6 text-[#9AA7B5]">{body}</p>}</div>;
}

export default function StockStoryPageF0(): JSX.Element {
  const ticker = tickerFromUrl();
  const stock = StockRegistry.getStock(ticker);
  const identity = getCompanyIdentity(ticker, stock?.companyName, stock?.sector);
  const quote = useLiveQuote(ticker);
  const [investOpen, setInvestOpen] = useState(() => new URLSearchParams(window.location.search).get("page") === "invest");
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const toast = useToast();
  const tracked = watchlists.some((list) => list.tickers.some((item) => normalizeSymbol(item) === ticker));

  const [research, setResearch] = useState<UnifiedResearchResult>(() => ({
    ...buildCompanyResearch(ticker, identity.displayName, identity.sector, null, tracked),
    healthometerLabel: null,
    analysis: null,
  }));

  useEffect(() => {
    const ctrl = new AbortController();
    fetchUnifiedResearch(ticker, identity.displayName, identity.sector, null, tracked, ctrl.signal).then((result) => {
      if (!ctrl.signal.aborted) setResearch(result);
    });
    return () => ctrl.abort();
  }, [ticker, identity.displayName, identity.sector, tracked]);

  const readiness = research.prediction.readiness;
  const score = research.healthometer.overallScore ?? research.prediction.overallScore;
  const label = research.healthometerLabel ?? healthometerLabelFromScore(research.healthometer.overallScore);
  const price = buildSinglePriceContext(
    quote.quote ? formatINR(quote.quote.price) : "Price pending",
    quote.quote ? `${formatINR(quote.quote.change)} (${formatPercent(quote.quote.changePercent)})` : null,
    quote.quote ? quote.quote.changePercent >= 0 : null,
  );
  const actions = buildSingleActionCluster(readiness, tracked);
  const dimensions = research.healthometer.dimensions;
  const allDrivers = [...new Set(research.prediction.topPositiveDrivers)];
  const drivers = allDrivers.length ? allDrivers : ["Business quality", "Financial strength", "Capital efficiency"];
  const allRisks = [...new Set(research.prediction.topRiskDrivers)];
  const risks = allRisks.length ? allRisks : [research.riskContext.overall ?? "Review recent business momentum"];

  const toggleTrack = () => {
    const list = watchlists[0];
    if (!list) return;
    tracked ? WatchlistEngine.removeTicker(list.id, ticker) : WatchlistEngine.addTicker(list.id, ticker);
    setWatchlists([...WatchlistEngine.getWatchlists()]);
    toast.success(tracked ? `${ticker} removed from tracking` : `${ticker} added to tracking`);
  };

  const runAction = (id: string) => {
    if (id === "invest") setInvestOpen(true);
    else if (id === "track") toggleTrack();
    else if (id === "compare") productNavigate("compare", ticker);
    else if (id === "methodology") productNavigate("methodology");
    else productNavigate("scanner");
  };

  const actionLabel: Record<string, string> = { invest: "Invest", track: tracked ? "Tracking" : "Track", compare: "Compare", methodology: "Methodology", scanner: "Open scanner" };

  return <ProductShell>
    <ProductPage className="max-w-[1320px] !py-5 md:!py-8">
      <header className="overflow-hidden rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[#0D1117]">
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold tracking-[0.12em] text-[#9AA7B5]">{identity.symbol}</span>
              {identity.sector && <span className="text-xs text-[#64748B]">· {identity.sector}</span>}
              <ProductStatusPill tone={score !== null && score >= 70 ? "verified" : score !== null && score >= 45 ? "blue" : "muted"}>{label}</ProductStatusPill>
            </div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[#E6EDF3] md:text-[38px]">{identity.displayName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9AA7B5]">A decision-ready view of business quality, financial strength, valuation and risk — composed for review, not reaction.</p>
          </div>
          <div className="flex min-w-[220px] flex-col justify-between gap-4 rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#111827] p-4">
            <div><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Price context</div><div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#E6EDF3]">{price.price}</div>{price.change && <div className={`mt-1 font-mono text-xs tabular-nums ${price.positive ? "text-[#16A34A]" : "text-[#EF4444]"}`}>{price.change}</div>}</div>
            <div className="text-[11px] text-[#64748B]">Updated with the latest available market context</div>
          </div>
        </div>
        {research.message && <div className="border-t border-[rgba(148,163,184,0.12)] px-5 py-3 text-xs text-[#9AA7B5] md:px-7">{research.message}</div>}
        <div data-testid="stock-action-cluster" className="flex flex-col gap-2 border-t border-[rgba(148,163,184,0.12)] bg-[#0A0F16] p-4 sm:flex-row sm:flex-wrap md:px-7">
          {actions.map((action) => <ProductAction key={action.id} variant={action.primary ? "primary" : "secondary"} onClick={() => runAction(action.id)} className="sm:min-w-[120px]">{actionLabel[action.id]}</ProductAction>)}
        </div>
      </header>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <ProductPanel className="p-5 lg:col-span-1">
          <div className="flex items-start justify-between gap-4"><div><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Healthometer</div><div className="mt-2 text-xl font-semibold text-[#E6EDF3]">{label}</div></div><div className="font-mono text-3xl font-semibold tabular-nums text-[#E6EDF3]">{score ?? "—"}</div></div>
          <p className="mt-3 text-xs leading-5 text-[#9AA7B5]">A compact reading of the company's present condition across active research dimensions.</p>
          <div className="mt-5 space-y-3">{dimensions.map((dimension) => <div key={dimension.id}><div className="mb-1 flex justify-between text-xs"><span className="text-[#9AA7B5]">{dimension.label}</span><span className="font-mono tabular-nums text-[#E6EDF3]">{dimension.score ?? "—"}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#161B22]"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, dimension.score ?? 0))}%`, backgroundColor: DIM_COLORS[dimension.id] || "#2962FF" }} /></div></div>)}</div>
        </ProductPanel>
        <ProductPanel className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between"><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Prediction Engine</div><Sparkles className="h-4 w-4 text-[#2962FF]" /></div>
          <div className="mt-3 text-xl font-semibold text-[#E6EDF3]">{research.prediction.publicResearchStance}</div>
          <div className="mt-1 text-xs text-[#9AA7B5]">{research.prediction.confidence} confidence · {research.prediction.activeFactorCount} active signals</div>
          <div className="mt-5 flex flex-wrap gap-2">{drivers.slice(0, 3).map((driver) => <span key={driver} className="rounded-lg border border-[rgba(41,98,255,0.22)] bg-[rgba(41,98,255,0.08)] px-2.5 py-1.5 text-xs text-[#B8C8FF]">{driver}</span>)}</div>
          <p className="mt-5 text-xs leading-5 text-[#9AA7B5]">Prediction Engine reflects research context, signal strength, and recent data. Review the thesis and risks before acting.</p>
        </ProductPanel>
        <ProductPanel className="p-5 lg:col-span-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]"><ShieldAlert className="h-4 w-4 text-[#F59E0B]" /> Review first</div>
          <div className="mt-4 space-y-3">{risks.slice(0, 3).map((risk) => <div key={risk} className="flex gap-2.5 text-sm leading-5 text-[#CDD5DF]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />{risk}</div>)}</div>
          <button onClick={() => productNavigate("compare", ticker)} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#7EA1FF] hover:text-white">Compare before deciding <ArrowRight className="h-3.5 w-3.5" /></button>
        </ProductPanel>
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <main className="min-w-0 space-y-7">
          <section><SectionTitle eyebrow="Research narrative" title="The thesis in one pass" body="What matters, what can improve, and what deserves skepticism." /><div className="grid gap-4 md:grid-cols-2"><ProductPanel className="p-5"><h3 className="text-base font-semibold text-[#E6EDF3]">Why it matters</h3><p className="mt-2 text-sm leading-6 text-[#9AA7B5]">{drivers[0]} is the clearest signal supporting further research. Assess whether this strength is durable and reflected in the current valuation.</p></ProductPanel><ProductPanel className="p-5"><h3 className="text-base font-semibold text-[#E6EDF3]">What to challenge</h3><p className="mt-2 text-sm leading-6 text-[#9AA7B5]">{risks[0]}. A complete thesis requires evidence that this concern is either contained or actively improving.</p></ProductPanel></div></section>
          <section><SectionTitle eyebrow="Factor intelligence" title="Condition by dimension" /><div className="grid gap-3 sm:grid-cols-2">{dimensions.map((d) => <ProductPanel key={d.id} className="flex items-center justify-between p-4"><div><h3 className="text-sm font-semibold text-[#E6EDF3]">{d.label}</h3><p className="mt-1 text-xs text-[#64748B]">{d.score === null ? "Not enough information" : d.score >= 65 ? "Supporting the thesis" : d.score >= 45 ? "Balanced context" : "Needs review"}</p></div><div className="font-mono text-2xl font-semibold tabular-nums text-[#E6EDF3]">{d.score ?? "—"}</div></ProductPanel>)}</div></section>
        </main>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ProductPanel className="p-5"><h2 className="text-base font-semibold text-[#E6EDF3]">Review checklist</h2><div className="mt-4 space-y-3">{["Read the thesis", "Challenge the key risk", "Compare a close alternative", "Record what would change your mind"].map((item) => <div key={item} className="flex gap-2.5 text-sm text-[#9AA7B5]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2962FF]" />{item}</div>)}</div></ProductPanel>
          <ProductPanel className="p-5"><h2 className="text-base font-semibold text-[#E6EDF3]">Keep the thesis observable</h2><p className="mt-2 text-sm leading-6 text-[#9AA7B5]">Track this company to revisit changes in quality, risk and valuation context.</p><button onClick={toggleTrack} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[rgba(148,163,184,0.2)] bg-[#111827] text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]"><Bookmark className="h-4 w-4" />{tracked ? "Tracking" : "Track thesis"}</button></ProductPanel>
          <button onClick={() => productNavigate("methodology")} className="w-full px-2 py-2 text-left text-xs leading-5 text-[#64748B] hover:text-[#9AA7B5]">How to interpret Healthometer and Prediction Engine →</button>
        </aside>
      </div>
      <InvestHandoffSheet open={investOpen} onClose={() => setInvestOpen(false)} symbol={ticker} />
    </ProductPage>
  </ProductShell>;
}
