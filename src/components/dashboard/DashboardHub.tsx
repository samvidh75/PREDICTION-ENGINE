import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Eye, GitCompare, Info, Loader2, Search, ShieldCheck, Star, TrendingUp } from "lucide-react";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { PortfolioEngine } from "../../services/portfolio/PortfolioEngine";
import { WatchlistEngine } from "../../services/portfolio/WatchlistEngine";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { api, type Signal as ApiSignal } from "../../services/api/client";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductEmptyState, ProductStatusPill, productNavigate } from "../product/ProductUI";

interface SignalItem {
  symbol: string;
  type: string;
  severity: "critical" | "important" | "monitor";
  explanation: string;
}

const typeLabel: Record<string, string> = {
  classification_upgrade: "Classification change",
  classification_downgrade: "Classification change",
  confidence_increase: "Confidence changed",
  confidence_decrease: "Confidence changed",
  factor_change: "Factor changed",
  ranking_change: "Ranking changed",
};

function openCompany(symbol: string): void {
  RecentSearchStore.addTicker(symbol);
  navigateToStock({ ticker: symbol, mode: "push" });
}

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsError, setSignalsError] = useState(false);
  const [symbolsAnalyzed, setSymbolsAnalyzed] = useState<number | null>(null);
  const [coverage, setCoverage] = useState<{
    symbols: number | null;
    scored: number | null;
    latest: string | null;
    quoteStatus: string | null;
    fallbackStatus: string | null;
  }>({ symbols: null, scored: null, latest: null, quoteStatus: null, fallbackStatus: null });
  const [showGuide, setShowGuide] = useState(() => {
    try { return localStorage.getItem("ssi-guide-dismissed") !== "true"; } catch { return true; }
  });

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const handler = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", handler);
    return () => window.removeEventListener("watchlistchange", handler);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    api.getSignals(12)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setSignals((data.signals ?? []).map((s: ApiSignal) => ({
          symbol: s.symbol,
          type: s.type,
          severity: s.severity,
          explanation: s.explanation ?? "Verified research change. Details are available on the company page.",
        })));
        setSymbolsAnalyzed(data.symbolsAnalyzed ?? null);
      })
      .catch(() => { if (!ctrl.signal.aborted) setSignalsError(true); })
      .finally(() => { if (!ctrl.signal.aborted) setSignalsLoading(false); });

    api.getDataCoverage()
      .then((cov) => {
        if (ctrl.signal.aborted) return;
        setCoverage({
          symbols: cov.coverage?.symbols?.count ?? null,
          scored: cov.coverage?.predictionRegistry?.symbolCount ?? null,
          latest: cov.coverage?.predictionRegistry?.latestPredictionDate ?? cov.generatedAt ?? null,
          quoteStatus: cov.providers?.INDIANAPI_KEY?.status ?? cov.providers?.YAHOO?.status ?? null,
          fallbackStatus: cov.providers?.YAHOO?.status ?? null,
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach((w) => w.tickers.forEach((ticker) => unique.add(ticker)));
    return [...unique].slice(0, 6);
  }, [watchlists]);

  const holdings = useMemo(() => PortfolioEngine.getHoldings(), []);
  const recentTickers = recentResearch.slice(0, 8);

  function dismissGuide() {
    setShowGuide(false);
    try { localStorage.setItem("ssi-guide-dismissed", "true"); } catch {}
  }

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">Research workspace</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#E6EDF3]">What do you want to inspect?</h1>
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by symbol or company..."
              className="h-10 w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] pl-10 pr-4 text-sm text-[#E6EDF3] placeholder:text-[#64748B] outline-none transition focus:border-[#2962FF]"
              onFocus={() => productNavigate("search")}
              readOnly
            />
          </div>
        </div>

        {showGuide && (
          <ProductPanel className="mb-5 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 text-[#2962FF]" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm text-[#E6EDF3]">StockStory<span className="text-[#16A34A]">.</span>India is a research-only product. Every data gap is labelled. No fabricated metrics.</p>
                <button type="button" onClick={dismissGuide} className="mt-2 text-xs font-medium text-[#2962FF] hover:text-[#3B71FF]">Dismiss</button>
              </div>
            </div>
          </ProductPanel>
        )}

        <div className="mb-5 grid gap-2 sm:grid-cols-4">
          <ProductAction onClick={() => productNavigate("search")}><Search className="h-3.5 w-3.5" aria-hidden="true" /> Search company</ProductAction>
          <ProductAction variant="secondary" onClick={() => productNavigate("compare")}><GitCompare className="h-3.5 w-3.5" aria-hidden="true" /> Compare companies</ProductAction>
          <ProductAction variant="secondary" onClick={() => productNavigate("rankings")}><TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> View rankings</ProductAction>
          <ProductAction variant="secondary" onClick={() => productNavigate("trust")}><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Check source trust</ProductAction>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <ProductStatusPill tone={coverage.symbols ? "verified" : "muted"}>
            {coverage.symbols ? `${coverage.symbols.toLocaleString("en-IN")} fundamentals coverage` : "Fundamentals: unavailable"}
          </ProductStatusPill>
          <ProductStatusPill tone="muted">
            Missing fundamentals: not tracked
          </ProductStatusPill>
          <ProductStatusPill tone={coverage.latest ? "verified" : "warning"}>
            Provider: {coverage.quoteStatus ?? "unchecked"}
          </ProductStatusPill>
          <ProductStatusPill tone={coverage.fallbackStatus === "healthy" ? "verified" : "warning"}>
            Quote/history fallback: {coverage.fallbackStatus ?? "unchecked"}
          </ProductStatusPill>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.8fr]">
          <ProductPanel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#E6EDF3]">Signal changes</h2>
              <ProductStatusPill tone={signalsError ? "warning" : "blue"}>{signalsError ? "Unavailable" : "Verified feed"}</ProductStatusPill>
            </div>
            {signalsLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-[#9AA7B5]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
                Checking verified signal feed...
              </div>
            ) : signalsError ? (
              <ProductEmptyState icon={AlertTriangle} title="Signals temporarily unavailable" body="No fallback signal cards were created. The panel will update when the verified endpoint responds." />
            ) : signals.length === 0 ? (
              <ProductEmptyState title="No significant signal changes" body={symbolsAnalyzed ? `${symbolsAnalyzed.toLocaleString("en-IN")} companies were analyzed in the latest cycle. No verified research changes crossed the display threshold.` : "Verified changes appear after the scoring feed returns data."} action={<ProductAction variant="secondary" onClick={() => productNavigate("rankings")}>Open rankings</ProductAction>} />
            ) : (
              <div className="divide-y divide-[rgba(148,163,184,0.1)]">
                {signals.map((signal, index) => (
                  <button key={`${signal.symbol}-${signal.type}-${index}`} type="button" onClick={() => openCompany(signal.symbol)} className="grid w-full gap-2 px-4 py-3 text-left transition hover:bg-white/[0.03] sm:grid-cols-[100px_150px_1fr_auto] sm:items-center">
                    <span className="font-mono text-xs font-semibold text-[#E6EDF3]">{signal.symbol}</span>
                    <ProductStatusPill tone={signal.severity === "critical" ? "danger" : signal.severity === "important" ? "warning" : "muted"}>{typeLabel[signal.type] ?? "Research change"}</ProductStatusPill>
                    <span className="min-w-0 truncate text-xs text-[#9AA7B5]">{signal.explanation}</span>
                    <ArrowRight className="hidden h-3.5 w-3.5 text-[#64748B] sm:block" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </ProductPanel>

          <div className="space-y-4">
            <ProductPanel className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#E6EDF3]">Watchlist</span>
              </div>
              {followedTickers.length === 0 ? (
                <ProductEmptyState title="No companies saved yet" body="Build a watchlist from search or company pages." action={<ProductAction variant="secondary" onClick={() => productNavigate("search")}>Search companies</ProductAction>} />
              ) : (
                followedTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  return (
                    <button key={ticker} type="button" onClick={() => openCompany(ticker)} className="mb-2 flex w-full items-center justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-3 py-2 text-left last:mb-0 hover:border-[#2962FF]/40">
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-semibold text-[#E6EDF3]">{ticker}</span>
                        <span className="block truncate text-[11px] text-[#9AA7B5]">{info?.companyName || "Company name unavailable"}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                    </button>
                  );
                })
              )}
            </ProductPanel>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <ProductPanel className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#E6EDF3]"><Star className="h-4 w-4 text-[#2962FF]" aria-hidden="true" /> Portfolio context</div>
                <p className="mt-2 text-xs text-[#9AA7B5]">{holdings.length === 0 ? "No positions saved. The product remains research-only." : `${holdings.length} saved position${holdings.length === 1 ? "" : "s"}.`}</p>
              </ProductPanel>

              {recentTickers.length > 0 && (
                <ProductPanel className="p-4">
                  <div className="mb-2 text-sm font-semibold text-[#E6EDF3]">Recent</div>
                  <div className="flex flex-wrap gap-2">
                    {recentTickers.map((ticker) => (
                      <button key={ticker} type="button" onClick={() => openCompany(ticker)} className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.025)] px-2 py-1 font-mono text-[11px] text-[#E6EDF3] hover:border-[#2962FF]/50">{ticker}</button>
                    ))}
                  </div>
                </ProductPanel>
              )}
            </div>
          </div>
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default DashboardHub;
