import React, { useEffect, useMemo, useState } from "react";
import { subscribeWatchlist, getWatchlist } from "../../services/portfolio/watchlistStore";
import { personalWorkspaceStore, type WorkspaceSnapshot } from "../../store/workspace/personalWorkspaceStore";

import { useCompanyUniverseModel } from "../../services/company/useCompanyUniverseModel";
import type { CompanyHealthState, CompanyHealthState as CompanyHealthStateType } from "../../types/CompanyUniverse";
import type { ConfidenceState } from "../intelligence/ConfidenceEngine";

type Props = {
  beginner?: boolean;
  isMobile?: boolean;
  /**
   * Optional: if true, shows only the top-level “preview” card (no extra UI).
   */
  compact?: boolean;
};

/**
 * SEBI-safe, calm company continuation preview:
 * - uses watchlist as continuation source
 * - shows health + narrative context only (no trading CTAs)
 * - opens company superpage via URL
 */
function healthLabel(state: CompanyHealthState): string {
  switch (state) {
    case "STRUCTURALLY_HEALTHY":
      return "Strong";
    case "STABLE_EXPANSION":
      return "Stable";
    case "CONFIDENCE_IMPROVING":
      return "Improving";
    case "LIQUIDITY_FRAGILE":
      return "Weakening";
    case "VOLATILITY_SENSITIVE":
      return "Pressured";
    case "STRUCTURALLY_WEAKENING":
    default:
      return "High Risk";
  }
}

function truncateWords(text: string, maxWords: number): string {
  const parts = text.trim().split(/\s+/g);
  if (parts.length <= maxWords) return text.trim();
  return `${parts.slice(0, maxWords).join(" ")}…`;
}

export default function DashboardCompanyExplorationPreview({
  beginner = false,
  isMobile = false,
  compact = false,
}: Props): JSX.Element | null {
  const [watchlistVersion, setWatchlistVersion] = useState(0);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(() => personalWorkspaceStore.getSnapshot());

  useEffect(() => {
    const unsub = subscribeWatchlist(() => setWatchlistVersion((v) => v + 1));
    const unsubWs = personalWorkspaceStore.subscribe((snap) => setWorkspace(snap));
    return () => {
      unsub();
      unsubWs();
    };
  }, []);

  const entries = useMemo(() => {
    void watchlistVersion;
    return getWatchlist();
  }, [watchlistVersion]);

  const pinnedSet = useMemo(() => new Set(workspace.pinnedCompanies), [workspace.pinnedCompanies]);

  const chosenTicker = useMemo(() => {
    if (!entries.length) return null;

    // Prefer pinned tickers for continuation.
    const pinned = entries.find((e) => pinnedSet.has(e.ticker));
    if (pinned) return pinned.ticker;

    return entries[0]?.ticker ?? null;
  }, [entries, pinnedSet]);

  const hasSavedCompanies = entries.length > 0;

  // Hook must always run; provide a safe fallback.
  const effectiveTicker = chosenTicker ?? "TTM";
  const model = useCompanyUniverseModel(effectiveTicker);

  const glow =
    model.healthState === "STRUCTURALLY_HEALTHY" || model.healthState === "STABLE_EXPANSION" || model.healthState === "CONFIDENCE_IMPROVING"
      ? model.healthTheme.glowCyan
      : model.healthState === "LIQUIDITY_FRAGILE" || model.healthState === "STRUCTURALLY_WEAKENING"
        ? model.healthTheme.glowslate
        : model.healthTheme.glowWarning;

  const narrativePreview = beginner
    ? truncateWords(model.narrative.body, 28)
    : truncateWords(model.narrative.body, 40);

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Company continuation</div>
          <div className="mt-2 text-[18px] font-medium text-white/92 leading-[1.2] truncate">
            {model.companyName}
          </div>
          <div className="mt-3 text-[13px] leading-[1.7] text-white/80">
            {hasSavedCompanies ? narrativePreview : `Add a saved ticker to guide continuation. Example educational lens (for now): ${narrativePreview}`}
          </div>
        </div>

        <div
          className="shrink-0 rounded-[999px] border border-white/10 bg-black/25 px-[14px] py-[10px]"
          style={{ boxShadow: `0 0 60px ${glow}` }}
        >
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{model.healthTheme.label}</div>
          <div className="mt-1 text-[12px] uppercase tracking-[0.18em] text-white/70">{healthLabel(model.healthState as CompanyHealthStateType)}</div>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("page", "company");
              url.searchParams.set("ticker", effectiveTicker);
              url.searchParams.set("skipOnboarding", "1");
              window.location.href = url.toString();
            }}
            className="h-[38px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
          >
            Open company superpage
          </button>

          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 ml-1">
            Calm learning context • structure-first
          </div>
        </div>
      )}

      {isMobile && (
        <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
          Swipe-safe preview • expand for deeper learning
        </div>
      )}
    </section>
  );
}
