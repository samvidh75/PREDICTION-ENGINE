import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Eye, GitCompare, Info, Loader2, Search, Sparkles, Star, TrendingUp, BarChart3, Activity, Shield, BookOpen, Briefcase } from "lucide-react";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { PortfolioEngine } from "../../services/portfolio/PortfolioEngine";
import { WatchlistEngine } from "../../services/portfolio/WatchlistEngine";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { api, type Signal as ApiSignal, type ScannerResultItem } from "../../services/api/client";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductEmptyState, productNavigate } from "../product/ProductUI";
import ResearchContextLink from "../research/ResearchContextLink";

function trackedSignalDot(ticker: string): { color: string; label: string } {
  const info = StockRegistry.getStock(ticker);
  if (!info?.sector) return { color: "#64748B", label: "Tracked" };
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

import { WorkspaceSummary } from "./WorkspaceSummary";

function scannerSignalLabel(score: number | null): { label: string; color: string } | null {
  if (score === null) return null;
  if (score >= 75) return { label: "High conviction", color: "#16A34A" };
  if (score >= 55) return { label: "Worth researching", color: "#2962FF" };
  if (score >= 40) return { label: "Track", color: "#F59E0B" };
  return { label: "Needs review", color: "#EF4444" };
}

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
          explanation: s.explanation ?? "Research change detected. Details available on company page.",
        })));
      })
      .catch(() => { if (!ctrl.signal.aborted) setSignalsError(true); })
      .finally(() => { if (!ctrl.signal.aborted) setSignalsLoading(false); });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    api.getScanner("Quality compounders", 3)
      .then((res) => setOpportunities(res.data ?? []))
      .catch(() => setOpportunities([]))
      .finally(() => setOppsLoading(false));
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
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
              <BookOpen className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
              Research briefing
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#E6EDF3]">Research cockpit</h1>
            <p className="mt-1 text-xs text-[#9AA7B5]">Welcome back. Review signals, evaluate opportunities, and track your thesis progress.</p>
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
          <ProductAction variant="secondary" onClick={() => productNavigate("compare")}> <GitCompare className="h-3.5 w-3.5" aria-hidden="true" /> Compare companies</ProductAction>
          <ProductAction variant="secondary" onClick={() => productNavigate("watchlist")}><Eye className="h-3.5 w-3.5" aria-hidden="true" /> Watchlist</ProductAction>
          <ProductAction variant="secondary" onClick={() => productNavigate("portfolio")}><TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Portfolio monitor</ProductAction>
          <ProductPanel className="p-4">
            <h2 className="text-sm font-semibold text-[#E6EDF3]">Portfolio thesis monitor</h2>
            <p className="mt-2 text-xs text-[#9AA7B5]">Monitor your portfolio's thesis progress here.</p>
          </ProductPanel>
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
                      <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium" style={{ borderColor: `${severityColor(signal.severity)}33`, backgroundColor: `${severityColor(signal.severity)}15`, color: severityColor(signal.severity) }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: severityColor(signal.severity) }} />
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

            {/* Opportunity Queue */}
            <ProductPanel className="p-4">
              <div className="mb-3 flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">Opportunity queue</h2>
                </div>
                <span className="text-[11px] text-[#64748B]">Top compounders</span>
              </div>
              {oppsLoading ? (
                <div className="flex items-center gap-2 p-3 text-xs text-[#9AA7B5]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
                  Compiling scanner opportunities...
                </div>
              ) : opportunities.length === 0 ? (
                <p className="p-3 text-xs text-[#9AA7B5]">No opportunities found.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {opportunities.map((opp) => {
                    const labelInfo = scannerSignalLabel(opp.score);
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
            {/* Workspace State Indicators */}
            <ProductPanel className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#E6EDF3]">Workspace status</span>
              </div>
              <WorkspaceSummary />
            </ProductPanel>

            {/* Tracked Companies */}
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

            {/* Next Actions */}
            <ProductPanel className="p-4">
              <div className="mb-3 text-sm font-semibold text-[#E6EDF3]">Next actions</div>
              <div className="grid gap-2 text-xs">
                <button type="button" onClick={() => productNavigate("search")} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#E6EDF3] transition">
                  <span>1. Research a company</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
                <button type="button" onClick={() => productNavigate("scanner")} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#E6EDF3] transition">
                  <span>2. Run scanner presets</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
                <button type="button" onClick={() => productNavigate("compare")} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#E6EDF3] transition">
                  <span>3. Compare alternatives</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
                <button type="button" onClick={() => productNavigate("watchlist")} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#E6EDF3] transition">
                  <span>4. Review watchlist changes</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
              </div>
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
