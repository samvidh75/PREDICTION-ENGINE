import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Search, ShieldCheck, TrendingUp, AlertCircle, ArrowLeftRight, BookOpen, Eye, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ProductAction, productNavigate } from "../components/product/ProductUI";
import ScorePill from "../components/ui/ScorePill";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { PremiumCommandButton } from "../components/intelligence/PremiumCommandButton";
import { FirstRunGuide } from "../components/onboarding/FirstRunGuide";
import { ResearchWorkflowRail } from "../components/intelligence/ResearchWorkflowRail";
import { RoundedDepthPanel } from "../components/intelligence/RoundedDepthPanel";

function navigate(pageKey: string, query?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  if (query) params.set("q", query); else params.delete("q");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

function openCompany(symbol: string): void {
  RecentSearchStore.addTicker(symbol);
  const params = new URLSearchParams(window.location.search);
  params.set("page", "stock");
  params.set("id", symbol);
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

const PRESET_ACTIONS = [
  { label: "Quality compounders", icon: Sparkles, action: () => productNavigate("scanner") },
  { label: "Undervalued quality", icon: BarChart3, action: () => productNavigate("scanner") },
  { label: "Improving momentum", icon: TrendingUp, action: () => productNavigate("scanner") },
  { label: "Low debt leaders", icon: ShieldCheck, action: () => productNavigate("scanner") },
];

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const handler = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", handler);
    return () => window.removeEventListener("watchlistchange", handler);
  }, []);

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach((watchlist) => watchlist.tickers.forEach((ticker) => unique.add(ticker)));
    return [...unique].slice(0, 8);
  }, [watchlists]);

  return (
    <div className="w-full overflow-x-hidden px-4 pb-20 pt-6 sm:px-6">
      <FirstRunGuide />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#2962FF]" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">Research command center</h1>
        </div>
        <p className="mt-1 text-sm text-[#9AA7B5]">What should you research next? Screen Indian equities, review scored models, or build comparison matrixes.</p>
      </div>

      {/* Command search */}
      <div className="mb-6">
        <PremiumCommandButton onClick={() => navigate("search")} placeholder="Search symbol or sector to begin research..." />
      </div>

      {/* Start with research */}
      <RoundedDepthPanel padding="md" className="mb-6 border border-white/[0.08]">
        <h2 className="text-xs font-semibold text-[#E6EDF3]">Start with research</h2>
        <p className="mt-1 text-[10px] text-[#9AA7B5]">Choose a strategy to discover companies worth researching.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_ACTIONS.map((preset) => (
            <Button key={preset.label} type="button" size="sm" variant="secondary" onClick={preset.action}>
              <preset.icon className="h-3.5 w-3.5" aria-hidden="true" /> {preset.label}
            </Button>
          ))}
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate("scanner")}>
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> All strategies
          </Button>
        </div>
      </RoundedDepthPanel>

      {/* Quick actions cluster */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button type="button" onClick={() => navigate("scanner")} className="rounded-xl border border-white/[0.08] bg-[#0D1117] p-4 text-left transition hover:border-[#2962FF]/40">
          <Search className="h-5 w-5 text-[#2962FF]" aria-hidden="true" />
          <span className="mt-2 block text-xs font-semibold text-[#E6EDF3]">Open scanner</span>
          <span className="mt-0.5 block text-[10px] text-[#9AA7B5]">Discover research candidates</span>
        </button>
        <button type="button" onClick={() => navigate("rankings")} className="rounded-xl border border-white/[0.08] bg-[#0D1117] p-4 text-left transition hover:border-[#2962FF]/40">
          <BarChart3 className="h-5 w-5 text-[#2962FF]" aria-hidden="true" />
          <span className="mt-2 block text-xs font-semibold text-[#E6EDF3]">View rankings</span>
          <span className="mt-0.5 block text-[10px] text-[#9AA7B5]">Browse scored companies</span>
        </button>
        <button type="button" onClick={() => navigate("compare")} className="rounded-xl border border-white/[0.08] bg-[#0D1117] p-4 text-left transition hover:border-[#2962FF]/40">
          <ArrowLeftRight className="h-5 w-5 text-[#2962FF]" aria-hidden="true" />
          <span className="mt-2 block text-xs font-semibold text-[#E6EDF3]">Compare companies</span>
          <span className="mt-0.5 block text-[10px] text-[#9AA7B5]">Side-by-side research</span>
        </button>
        <button type="button" onClick={() => navigate("watchlist")} className="rounded-xl border border-white/[0.08] bg-[#0D1117] p-4 text-left transition hover:border-[#2962FF]/40">
          <Eye className="h-5 w-5 text-[#2962FF]" aria-hidden="true" />
          <span className="mt-2 block text-xs font-semibold text-[#E6EDF3]">Review watchlist</span>
          <span className="mt-0.5 block text-[10px] text-[#9AA7B5]">Track thesis changes</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* What changed preview */}
          <RoundedDepthPanel padding="md" className="border border-white/[0.08]">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-[#E6EDF3]">What changed</h2>
            </div>
            <p className="mt-1 text-xs text-[#9AA7B5]">Track a company to review important changes — thesis shifts, score movements, and risk updates.</p>
            <div className="mt-3">
              <Button type="button" size="sm" onClick={() => navigate("alerts")}>
                Open what changed <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </RoundedDepthPanel>

          {/* Methodology note */}
          <RoundedDepthPanel padding="md" className="border border-white/[0.08]">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-[#E6EDF3]">How StockStory thinks</h2>
            </div>
            <p className="mt-1 text-xs text-[#9AA7B5]">Research is not a guarantee. Understand our methodology — how we evaluate financial strength, valuation context, risk, and conviction.</p>
            <div className="mt-3">
              <Button type="button" size="sm" variant="secondary" onClick={() => navigate("methodology")}>
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Read methodology
              </Button>
            </div>
          </RoundedDepthPanel>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <RoundedDepthPanel padding="sm" className="border border-white/[0.08]">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">Research workflow</h3>
            <ResearchWorkflowRail className="mt-3" />
          </RoundedDepthPanel>

          {/* Tracked companies */}
          <RoundedDepthPanel padding="sm" className="border border-white/[0.08]">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">Tracked companies</h3>
            {followedTickers.length === 0 ? (
              <div>
                <p className="mt-2 text-xs text-[#9AA7B5]">Track companies to review important changes.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ProductAction variant="secondary" onClick={() => navigate("scanner")}>Open scanner</ProductAction>
                  <ProductAction variant="ghost" onClick={() => navigate("search")}>Search company</ProductAction>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                {followedTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const score = info?.telemetrySnapshot?.healthScore;
                  return (
                    <button
                      key={ticker}
                      type="button"
                      onClick={() => openCompany(ticker)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <div>
                        <span className="font-mono text-xs font-semibold text-[#E6EDF3]">{ticker}</span>
                        {info?.companyName && <span className="ml-2 text-[10px] text-[#64748B]">{info.companyName}</span>}
                      </div>
                      {typeof score === "number" && Number.isFinite(score) ? (
                        <ScorePill score={Math.round(score)} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </RoundedDepthPanel>

          {/* Recently explored */}
          <RoundedDepthPanel padding="sm" className="border border-white/[0.08]">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">Recently explored</h3>
            {recentResearch.slice(0, 6).length === 0 ? (
              <p className="mt-2 text-xs text-[#9AA7B5]">Search for a company to begin research.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recentResearch.slice(0, 6).map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => openCompany(ticker)}
                    className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 font-mono text-[10px] font-semibold text-[#9AA7B5] hover:bg-white/[0.06] transition-colors"
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            )}
          </RoundedDepthPanel>
        </div>
      </div>
    </div>
  );
};

export default DashboardHub;