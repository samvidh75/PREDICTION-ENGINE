import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Eye, GitCompare, Info, Loader2, Search, Sparkles, TrendingUp, BarChart3, Activity, Shield, BookOpen, Briefcase, Star } from "lucide-react";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { PortfolioEngine } from "../../services/portfolio/PortfolioEngine";
import { WatchlistEngine } from "../../services/portfolio/WatchlistEngine";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { api, type Signal as ApiSignal, type ScannerResultItem } from "../../services/api/client";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate } from "../product/ProductUI";
import ResearchContextLink from "../research/ResearchContextLink";

function trackedSignalDot(_ticker: string): { color: string; label: string } {
  return { color: "#2962FF", label: "Researching" };
}

function severityColor(severity: string): string {
  return severity === "critical" ? "#EF4444" : severity === "important" ? "#F59E0B" : "#64748B";
}

interface SignalItem {
  symbol: string;
  type: string;
  severity: "critical" | "important" | "monitor";
  explanation: string;
}

const typeLabel: Record<string, string> = {
  classification_upgrade: "Thesis improved",
  classification_downgrade: "Thesis weakened",
  confidence_increase: "Confidence increased",
  confidence_decrease: "Confidence decreased",
  factor_change: "Factor changed",
  ranking_change: "Ranking changed",
};

const RESEARCH_STRATEGIES = [
  { id: "positive-momentum", label: "Positive momentum", description: "Momentum above zero, highest first", icon: TrendingUp },
  { id: "lower-volatility", label: "Lower volatility", description: "Lowest volatility first", icon: Activity },
  { id: "value-watch", label: "Value watch", description: "Lowest positive PE ratios", icon: BarChart3 },
  { id: "large-cap", label: "Large cap", description: "Highest market capitalisation", icon: Star },
] as const;

function openCompany(symbol: string): void {
  RecentSearchStore.addTicker(symbol);
  navigateToStock({ ticker: symbol, mode: "push" });
}

import { WorkspaceSummary } from "./WorkspaceSummary";
import { buildDashboardViewModel } from "../../lib/product/viewModels/dashboardViewModel";

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsError, setSignalsError] = useState(false);
  const [opportunities, setOpportunities] = useState<ScannerResultItem[]>([]);
  const [oppsLoading, setOppsLoading] = useState(true);

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
          explanation: s.explanation ?? "Research change detected.",
        })));
      })
      .catch(() => { if (!ctrl.signal.aborted) setSignalsError(true); })
      .finally(() => { if (!ctrl.signal.aborted) setSignalsLoading(false); });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    api.getScanner("Quality compounders", 3)
      .then((res) => {
        const seen = new Set<string>();
        setOpportunities((res.data ?? []).filter((item) => {
          if (seen.has(item.symbol)) return false;
          seen.add(item.symbol);
          return true;
        }));
      })
      .catch(() => setOpportunities([]))
      .finally(() => setOppsLoading(false));
  }, []);

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach((w) => w.tickers.forEach((ticker) => unique.add(ticker)));
    return [...unique].slice(0, 6);
  }, [watchlists]);

  const topSignals = signals.slice(0, 4);
  const remainingCount = signals.length - topSignals.length;

  const trackedCompaniesList = useMemo(() => {
    return followedTickers.map((ticker) => {
      const stock = StockRegistry.getStock(ticker);
      return {
        symbol: ticker,
        companyName: stock?.companyName || "",
        score: null,
      };
    });
  }, [followedTickers]);

  const viewModel = useMemo(() => {
    return buildDashboardViewModel(
      recentResearch,
      trackedCompaniesList,
      signals.map(s => ({
        symbol: s.symbol,
        type: s.type,
        severity: s.severity,
        explanation: s.explanation,
      })),
      watchlists.length > 0,
      PortfolioEngine.getHoldings().length > 0,
      signals.length > 0
    );
  }, [recentResearch, trackedCompaniesList, signals, watchlists.length]);

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              Research command center
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#E6EDF3]">Understand the stock before you invest</h1>
            <p className="mt-1 text-xs text-[#9AA7B5]">Search, discover, compare, and track — AI research for Indian equities.</p>
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search company to begin research..."
              className="h-10 w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] pl-10 pr-4 text-sm text-[#E6EDF3] placeholder:text-[#64748B] outline-none transition focus:border-[#2962FF]"
              onFocus={() => productNavigate("search")}
              readOnly
            />
          </div>
        </div>

        {/* Research actions cluster */}
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => productNavigate("scanner")} className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-left transition hover:border-[#2962FF]/40">
            <Search className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <span className="mt-2 block text-xs font-semibold text-[#E6EDF3]">Open scanner</span>
            <span className="mt-0.5 block text-[10px] text-[#9AA7B5]">Discover research candidates</span>
          </button>
          <button type="button" onClick={() => productNavigate("rankings")} className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-left transition hover:border-[#2962FF]/40">
            <BarChart3 className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <span className="mt-2 block text-xs font-semibold text-[#E6EDF3]">View rankings</span>
            <span className="mt-0.5 block text-[10px] text-[#9AA7B5]">Browse scored companies</span>
          </button>
          <button type="button" onClick={() => productNavigate("compare")} className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-left transition hover:border-[#2962FF]/40">
            <GitCompare className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <span className="mt-2 block text-xs font-semibold text-[#E6EDF3]">Compare companies</span>
            <span className="mt-0.5 block text-[10px] text-[#9AA7B5]">Side-by-side research</span>
          </button>
          <button type="button" onClick={() => productNavigate("watchlist")} className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-left transition hover:border-[#2962FF]/40">
            <Eye className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <span className="mt-2 block text-xs font-semibold text-[#E6EDF3]">Review watchlist</span>
            <span className="mt-0.5 block text-[10px] text-[#9AA7B5]">Track thesis changes</span>
          </button>
        </div>

        {/* Start with research - strategy chips */}
        <div className="mb-5">
          <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-[#E6EDF3]">Start with research</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <ProductAction variant="secondary" onClick={() => productNavigate("scanner")}><Sparkles className="h-3.5 w-3.5" /> Quality compounders</ProductAction>
              <ProductAction variant="secondary" onClick={() => productNavigate("scanner")}><BarChart3 className="h-3.5 w-3.5" /> Undervalued quality</ProductAction>
              <ProductAction variant="secondary" onClick={() => productNavigate("scanner")}><TrendingUp className="h-3.5 w-3.5" /> Improving momentum</ProductAction>
              <ProductAction variant="secondary" onClick={() => productNavigate("scanner")}><Shield className="h-3.5 w-3.5" /> Low debt leaders</ProductAction>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.8fr]">
          <div className="space-y-4">
            {/* What Changed Signal Feed */}
            <ProductPanel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">What changed</h2>
                  <ResearchContextLink label="How signals work" />
                </div>
                {!signalsLoading && !signalsError && (
                  <span className="text-[11px] text-[#64748B]">{signals.length} signal{signals.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              {signalsLoading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-[#9AA7B5]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
                  Loading changes...
                </div>
              ) : signalsError ? (
                <div className="flex flex-col items-center p-6 text-center">
                  <AlertTriangle className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
                  <h3 className="mt-2 text-sm font-semibold text-[#E6EDF3]">Research signals pending</h3>
                  <p className="mt-1 text-xs text-[#9AA7B5]">Track companies to review important changes.</p>
                </div>
              ) : signals.length === 0 ? (
                <div className="flex flex-col items-center p-6 text-center">
                  <Activity className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
                  <h3 className="mt-2 text-sm font-semibold text-[#E6EDF3]">No notable changes</h3>
                  <p className="mt-1 text-xs text-[#9AA7B5]">No research changes crossed the display threshold for tracked companies.</p>
                  <div className="mt-3"><ProductAction variant="secondary" onClick={() => productNavigate("rankings")}>Open rankings</ProductAction></div>
                </div>
              ) : (
                <div className="divide-y divide-[rgba(148,163,184,0.1)]">
                  {topSignals.map((signal, index) => (
                    <button key={`${signal.symbol}-${signal.type}-${index}`} type="button" onClick={() => openCompany(signal.symbol)} className="grid w-full gap-2 px-4 py-3 text-left transition hover:bg-white/[0.03] sm:grid-cols-[100px_150px_1fr_auto] sm:items-center">
                      <span className="font-mono text-xs font-semibold text-[#E6EDF3]">{signal.symbol}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium" style={{ borderColor: `${severityColor(signal.severity)}33`, backgroundColor: `${severityColor(signal.severity)}15`, color: severityColor(signal.severity) }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: severityColor(signal.severity) }} />
                        {typeLabel[signal.type] ?? "Research change"}
                      </span>
                      <span className="min-w-0 truncate text-xs text-[#9AA7B5]">{signal.explanation}</span>
                      <ArrowRight className="hidden h-3.5 w-3.5 text-[#64748B] sm:block" aria-hidden="true" />
                    </button>
                  ))}
                  {remainingCount > 0 && (
                    <button type="button" onClick={() => productNavigate("alerts")} className="flex w-full items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-[#2962FF] transition hover:bg-white/[0.02]">
                      View {remainingCount} more signal{remainingCount !== 1 ? "s" : ""}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </ProductPanel>

            {/* Research candidates */}
            <ProductPanel className="p-4">
              <div className="mb-3 flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">Research candidates</h2>
                </div>
                <span className="text-[11px] text-[#64748B]">Top compounders</span>
              </div>
              {oppsLoading ? (
                <div className="flex items-center gap-2 p-3 text-xs text-[#9AA7B5]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
                  Compiling research candidates...
                </div>
              ) : opportunities.length === 0 ? (
                <div className="p-3 text-xs text-[#9AA7B5]">
                  Open the scanner to discover research candidates.
                  <div className="mt-3"><ProductAction variant="secondary" onClick={() => productNavigate("scanner")}>Open scanner</ProductAction></div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {opportunities.map((opp) => {
                    const labelInfo = opp.score !== null && opp.score !== undefined
                      ? opp.score >= 75 ? { label: "Very Healthy", color: "#16A34A" }
                        : opp.score >= 55 ? { label: "Healthy", color: "#2962FF" }
                          : opp.score >= 40 ? { label: "Needs review", color: "#F59E0B" }
                            : { label: "Risk rising", color: "#EF4444" }
                      : null;
                    return (
                      <div
                        key={opp.symbol}
                        onClick={() => openCompany(opp.symbol)}
                        className="group flex cursor-pointer flex-col justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.015)] p-3 transition hover:border-[#2962FF]/40 hover:bg-white/[0.01]"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-semibold text-[#E6EDF3] group-hover:text-[#2962FF]">{opp.symbol}</span>
                            {opp.score !== null && (
                              <span className="text-xs font-bold text-[#2962FF]">{Math.round(opp.score)}</span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-[#9AA7B5]">{opp.companyName}</p>
                          {labelInfo && (
                            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-medium" style={{ borderColor: `${labelInfo.color}33`, backgroundColor: `${labelInfo.color}15`, color: labelInfo.color }}>
                              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: labelInfo.color }} />
                              {labelInfo.label}
                            </span>
                          )}
                          {opp.keyReason && (
                            <p className="mt-2 text-[10px] leading-relaxed text-[#64748B] line-clamp-2">{opp.keyReason}</p>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[9px] text-[#64748B]">
                          <span>{opp.sector || "General"}</span>
                          <span className="group-hover:text-[#E6EDF3] flex items-center gap-0.5 transition-colors">Research <ArrowRight className="h-2.5 w-2.5" /></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ProductPanel>

            {/* Research strategies */}
            <ProductPanel className="p-4">
              <div className="mb-3 text-sm font-semibold text-[#E6EDF3]">Research strategies</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {RESEARCH_STRATEGIES.map((strategy) => {
                  const Icon = strategy.icon;
                  return (
                    <button
                      key={strategy.id}
                      type="button"
                      onClick={() => productNavigate("scanner")}
                      className="flex items-start gap-3 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-left transition hover:border-[#2962FF]/40"
                    >
                      <Icon className="mt-0.5 h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#E6EDF3]">{strategy.label}</div>
                        <div className="mt-0.5 text-[11px] leading-4 text-[#9AA7B5]">{strategy.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ProductPanel>

            {/* Prediction Engine & Healthometer Previews */}
            <div className="grid gap-4 sm:grid-cols-2">
              <ProductPanel className="p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-[#E6EDF3]">
                    <Activity className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                    <h3 className="text-xs font-semibold">Prediction Engine</h3>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#9AA7B5]">
                    Evaluates corporate business quality, relative valuations, risk vectors, and market timing using our advanced multi-factor model.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ProductAction variant="secondary" onClick={() => productNavigate("search")}>Search company</ProductAction>
                  <ProductAction variant="ghost" onClick={() => productNavigate("scanner")}>Open scanner</ProductAction>
                </div>
              </ProductPanel>

              <ProductPanel className="p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-[#E6EDF3]">
                    <Shield className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                    <h3 className="text-xs font-semibold">Healthometer</h3>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#9AA7B5]">
                    Measures stock quality across key dimensions including financial strength, stability, risk indicators, valuation context, and momentum.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ProductAction variant="secondary" onClick={() => productNavigate("search")}>Research a company</ProductAction>
                  <ProductAction variant="ghost" onClick={() => productNavigate("compare")}>Compare companies</ProductAction>
                </div>
              </ProductPanel>
            </div>

            {/* Compare prompt */}
            <ProductPanel className="p-4">
              <div className="flex items-start gap-3">
                <GitCompare className="mt-0.5 h-4 w-4 shrink-0 text-[#2962FF]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[#E6EDF3]">Compare companies</h3>
                  <p className="mt-1 text-xs text-[#9AA7B5]">Side-by-side research to evaluate which company deserves deeper investigation.</p>
                  <div className="mt-3">
                    <ProductAction variant="secondary" onClick={() => productNavigate("compare")}>
                      <GitCompare className="h-3.5 w-3.5" aria-hidden="true" /> Open compare
                    </ProductAction>
                  </div>
                </div>
              </div>
            </ProductPanel>
          </div>

          <div className="space-y-4">
            {/* Portfolio thesis monitor */}
            <ProductPanel className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-[#E6EDF3]">Portfolio thesis monitor</h3>
              </div>
              <p className="text-xs text-[#9AA7B5]">
                {PortfolioEngine.getHoldings().length === 0
                  ? "Track thesis positions from the portfolio page. Research only."
                  : `${PortfolioEngine.getHoldings().length} thesis position${PortfolioEngine.getHoldings().length === 1 ? "" : "s"} being monitored.`}
              </p>
            </ProductPanel>

            {/* Workspace status */}
            <ProductPanel className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#E6EDF3]">Workspace status</span>
              </div>
              <WorkspaceSummary />
            </ProductPanel>

            {/* Tracked companies */}
            <ProductPanel className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#E6EDF3]">Tracked companies</span>
              </div>
              {followedTickers.length === 0 ? (
                <div className="flex flex-col items-center p-4 text-center">
                  <p className="text-xs text-[#9AA7B5]">Track companies to review important changes.</p>
                  <div className="mt-3">
                    <ProductAction variant="secondary" onClick={() => productNavigate("scanner")}>Open scanner</ProductAction>
                    <ProductAction variant="ghost" onClick={() => productNavigate("search")}>Search company</ProductAction>
                  </div>
                </div>
              ) : (
                followedTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const dot = trackedSignalDot(ticker);
                  return (
                    <button key={ticker} type="button" onClick={() => openCompany(ticker)} className="mb-2 flex w-full items-center justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-3 py-2 text-left last:mb-0 hover:border-[#2962FF]/40">
                      <span className="min-w-0 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dot.color }} aria-hidden="true" />
                        <span>
                          <span className="block font-mono text-xs font-semibold text-[#E6EDF3]">{ticker}</span>
                          <span className="block truncate text-[11px] text-[#9AA7B5]">{info?.companyName || "Company"}</span>
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#64748B]">{dot.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })
              )}
            </ProductPanel>

            {/* Research workflow */}
            <ProductPanel className="p-4">
              <div className="mb-3 text-sm font-semibold text-[#E6EDF3]">Research workflow</div>
              <div className="grid gap-2 text-xs">
                <button type="button" onClick={() => productNavigate("search")} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#E6EDF3] transition">
                  <span>1. Discover — Open scanner</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
                <button type="button" onClick={() => productNavigate("rankings")} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#E6EDF3] transition">
                  <span>2. Research — Browse rankings</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
                <button type="button" onClick={() => productNavigate("compare")} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#E6EDF3] transition">
                  <span>3. Compare — Evaluate alternatives</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
                <button type="button" onClick={() => productNavigate("watchlist")} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#E6EDF3] transition">
                  <span>4. Review — Track thesis changes</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
              </div>
            </ProductPanel>

            <button type="button" onClick={() => productNavigate("methodology")} className="flex w-full items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[#0D1117] px-4 py-3 text-xs text-[#64748B] transition hover:border-[#2962FF]/40 hover:text-[#E6EDF3]">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
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