import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Eye, GitCompare, Info, Loader2, Search, Sparkles, Star, TrendingUp, BarChart3, Activity } from "lucide-react";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { PortfolioEngine } from "../../services/portfolio/PortfolioEngine";
import { WatchlistEngine } from "../../services/portfolio/WatchlistEngine";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { api, type Signal as ApiSignal } from "../../services/api/client";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductEmptyState, productNavigate } from "../product/ProductUI";

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

const SCANNER_PRESETS = [
  { id: "positive-momentum", label: "Positive momentum", description: "Momentum above zero, highest first", icon: TrendingUp },
  { id: "lower-volatility", label: "Lower volatility", description: "Lowest volatility first", icon: Activity },
  { id: "value-watch", label: "Value watch", description: "Lowest positive PE ratios", icon: BarChart3 },
  { id: "large-cap", label: "Large cap", description: "Highest market capitalisation", icon: Star },
] as const;

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
          explanation: s.explanation ?? "Research change detected. Details available on company page.",
        })));
      })
      .catch(() => { if (!ctrl.signal.aborted) setSignalsError(true); })
      .finally(() => { if (!ctrl.signal.aborted) setSignalsLoading(false); });
    return () => ctrl.abort();
  }, []);

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach((w) => w.tickers.forEach((ticker) => unique.add(ticker)));
    return [...unique].slice(0, 6);
  }, [watchlists]);

  const holdings = useMemo(() => PortfolioEngine.getHoldings(), []);
  const topSignals = signals.slice(0, 4);
  const remainingCount = signals.length - topSignals.length;

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">Command centre</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#E6EDF3]">What do you want to do?</h1>
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

        <div className="mb-5 flex flex-wrap gap-2">
          <ProductAction onClick={() => productNavigate("scanner")}><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Open scanner</ProductAction>
          <ProductAction variant="secondary" onClick={() => productNavigate("search")}><Search className="h-3.5 w-3.5" aria-hidden="true" /> Research company</ProductAction>
          <ProductAction variant="secondary" onClick={() => productNavigate("compare")}><GitCompare className="h-3.5 w-3.5" aria-hidden="true" /> Compare companies</ProductAction>
          <ProductAction variant="secondary" onClick={() => productNavigate("watchlist")}><Eye className="h-3.5 w-3.5" aria-hidden="true" /> Review watchlist</ProductAction>
          <ProductAction variant="secondary" onClick={() => productNavigate("portfolio")}><Star className="h-3.5 w-3.5" aria-hidden="true" /> Track thesis</ProductAction>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.8fr]">
          <div className="space-y-4">
            <ProductPanel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] px-4 py-3">
                <h2 className="text-sm font-semibold text-[#E6EDF3]">What changed</h2>
                {!signalsLoading && !signalsError && (
                  <span className="text-[11px] text-[#64748B]">{signals.length} signal{signals.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              {signalsLoading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-[#9AA7B5]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
                  Loading signals...
                </div>
              ) : signalsError ? (
                <ProductEmptyState icon={AlertTriangle} title="Something went wrong" body="We're working on restoring research signals. Check back shortly." />
              ) : signals.length === 0 ? (
                <ProductEmptyState title="No notable changes" body="No research changes crossed the display threshold for tracked companies." action={<ProductAction variant="secondary" onClick={() => productNavigate("rankings")}>Open rankings</ProductAction>} />
              ) : (
                <div className="divide-y divide-[rgba(148,163,184,0.1)]">
                  {topSignals.map((signal, index) => (
                    <button key={`${signal.symbol}-${signal.type}-${index}`} type="button" onClick={() => openCompany(signal.symbol)} className="grid w-full gap-2 px-4 py-3 text-left transition hover:bg-white/[0.03] sm:grid-cols-[100px_150px_1fr_auto] sm:items-center">
                      <span className="font-mono text-xs font-semibold text-[#E6EDF3]">{signal.symbol}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[11px] font-medium text-[#9AA7B5]">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: signal.severity === "critical" ? "#EF4444" : signal.severity === "important" ? "#F59E0B" : "#64748B" }} />
                        {typeLabel[signal.type] ?? "Research change"}
                      </span>
                      <span className="min-w-0 truncate text-xs text-[#9AA7B5]">{signal.explanation}</span>
                      <ArrowRight className="hidden h-3.5 w-3.5 text-[#64748B] sm:block" aria-hidden="true" />
                    </button>
                  ))}
                  {remainingCount > 0 && (
                    <button type="button" onClick={() => productNavigate("scanner")} className="flex w-full items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-[#2962FF] transition hover:bg-white/[0.02]">
                      View {remainingCount} more signal{remainingCount !== 1 ? "s" : ""}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </ProductPanel>

            <ProductPanel className="p-4">
              <div className="mb-3 text-sm font-semibold text-[#E6EDF3]">Scanner presets</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SCANNER_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => productNavigate("scanner")}
                      className="flex items-start gap-3 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-left transition hover:border-[#2962FF]/40"
                    >
                      <Icon className="mt-0.5 h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#E6EDF3]">{preset.label}</div>
                        <div className="mt-0.5 text-[11px] leading-4 text-[#9AA7B5]">{preset.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ProductPanel>
          </div>

          <div className="space-y-4">
            <ProductPanel className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#E6EDF3]">Tracked companies</span>
              </div>
              {followedTickers.length === 0 ? (
                <ProductEmptyState title="No companies tracked" body="Track companies from search or company pages to monitor changes." action={<ProductAction variant="secondary" onClick={() => productNavigate("scanner")}>Open scanner</ProductAction>} />
              ) : (
                followedTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  return (
                    <button key={ticker} type="button" onClick={() => openCompany(ticker)} className="mb-2 flex w-full items-center justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-3 py-2 text-left last:mb-0 hover:border-[#2962FF]/40">
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-semibold text-[#E6EDF3]">{ticker}</span>
                        <span className="block truncate text-[11px] text-[#9AA7B5]">{info?.companyName || "Company"}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                    </button>
                  );
                })
              )}
            </ProductPanel>

            <ProductPanel className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#E6EDF3]"><Star className="h-4 w-4 text-[#2962FF]" aria-hidden="true" /> Portfolio thesis monitor</div>
              <p className="mt-2 text-xs text-[#9AA7B5]">{holdings.length === 0 ? "Track thesis positions from the portfolio page. Research only." : `${holdings.length} thesis position${holdings.length === 1 ? "" : "s"} being monitored.`}</p>
            </ProductPanel>

            <button type="button" onClick={() => productNavigate("methodology")} className="flex w-full items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[#0D1117] px-4 py-3 text-xs text-[#64748B] transition hover:border-[#2962FF]/40 hover:text-[#E6EDF3]">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              View research methodology
              <ArrowRight className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default DashboardHub;
