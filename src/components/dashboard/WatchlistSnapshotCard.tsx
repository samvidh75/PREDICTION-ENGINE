import React, { useEffect, useMemo, useState } from "react";
import { getWatchlist, removeTickerFromWatchlist, subscribeWatchlist, getWatchlists } from "../../services/portfolio/watchlistStore";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";

import { chartSeriesStore } from "../../services/charting/live/chartSeriesStore";
import type { ChartTimeframe } from "../charts/chartTypes";
import { routeIntensityStore, type RouteIntensity } from "../../services/charting/live/routeIntensityStore";
import { personalWorkspaceStore, type WorkspaceSnapshot } from "../../store/workspace/personalWorkspaceStore";

function formatAgeMs(ms: number): string {
  const abs = Math.max(0, ms);
  const minutes = Math.floor(abs / 60000);

  if (minutes < 60) return `${minutes || 1}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 48) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

const PREFETCH_TIMEFRAME: ChartTimeframe = "1M";

export default function WatchlistSnapshotCard(props: { maxItems?: number; beginner?: boolean }): JSX.Element {
  const { maxItems = 5, beginner = false } = props;

  const [version, setVersion] = useState(0);
  const [routeIntensity, setRouteIntensity] = useState<RouteIntensity>(routeIntensityStore.getIntensity());
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(() => personalWorkspaceStore.getSnapshot());

  useEffect(() => {
    const unsub = subscribeWatchlist(() => setVersion((v) => v + 1));
    const unsubRoute = routeIntensityStore.subscribe((i) => setRouteIntensity(i));
    const unsubWs = personalWorkspaceStore.subscribe((snap) => setWorkspace(snap));

    return () => {
      unsub();
      unsubRoute();
      unsubWs();
    };
  }, []);

  const entries = useMemo(() => {
    void version;
    return getWatchlist();
  }, [version]);

  const ordered = useMemo(() => {
    if (workspace.pinnedCompanies.length === 0) return entries;

    const pinnedSet = new Set(workspace.pinnedCompanies);
    const byTicker = new Map(entries.map((e) => [e.ticker, e] as const));

    const pinnedEntries = workspace.pinnedCompanies
      .map((t) => byTicker.get(t))
      .filter((e): e is (typeof entries)[number] => Boolean(e));

    const rest = entries.filter((e) => !pinnedSet.has(e.ticker));

    return [...pinnedEntries, ...rest];
  }, [entries, workspace.pinnedCompanies]);

  const visible = ordered.slice(0, maxItems);

  useEffect(() => {
    if (routeIntensity === "low") return;

    for (const e of visible) {
      chartSeriesStore.prefetch({ ticker: e.ticker, timeframe: PREFETCH_TIMEFRAME });
    }
  }, [visible, routeIntensity]);

  const empty = visible.length === 0;

  return (
    <section className="rounded-[30px] border border-white/10 bg-[#050607]/90 p-5 shadow-[0_0_70px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">
            Watchlist
          </div>

          <div className="mt-2 text-[22px] font-semibold leading-[1.2] text-white/92">
            {empty ? "Track your favourite stocks" : beginner ? "Your saved stocks" : "Saved stocks for quick access"}
          </div>
        </div>

        {!empty && (
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/58">
            {entries.length} saved
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {empty ? (
          <div className="rounded-[22px] border border-white/10 bg-black/20 px-5 py-4 text-[14px] leading-[1.9] text-white/72">
            Add stocks from anywhere in the app to build your personal market dashboard.
          </div>
        ) : (
          visible.map((e) => {
            const age = formatAgeMs(Date.now() - e.addedAt);

            return (
              <div key={e.ticker} className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-black/25 px-5 py-4">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => navigateToStock({ ticker: e.ticker, mode: "hard" })}
                    className="text-[15px] font-semibold tracking-tight text-white/92 transition hover:text-white"
                  >
                    {e.ticker}
                  </button>

                  <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                    Added {age}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const listId = getWatchlists()[0]?.id || "1";
                    removeTickerFromWatchlist(listId, e.ticker);
                  }}
                  className="h-[38px] rounded-full border border-white/10 bg-black/25 px-4 text-[11px] uppercase tracking-[0.18em] text-white/58 transition hover:text-rose-200"
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/40">
        Faster stock continuity • cleaner tracking
      </div>
    </section>
  );
}
