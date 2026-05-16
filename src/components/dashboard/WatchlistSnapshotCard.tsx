import React, { useMemo, useState } from "react";
import { getWatchlist, removeTickerFromWatchlist } from "../../services/portfolio/watchlistStore";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";

function formatAgeMs(ms: number): string {
  const abs = Math.max(0, ms);
  const minutes = Math.floor(abs / 60000);
  if (minutes < 60) return `${minutes || 1}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function WatchlistSnapshotCard(props: { maxItems?: number; beginner?: boolean }): JSX.Element {
  const { maxItems = 5, beginner = false } = props;

  const [version, setVersion] = useState(0);

  const entries = useMemo(() => {
    // localStorage read is deterministic and cheap (small payload).
    // version forces re-read after user actions in this card.
    void version;
    return getWatchlist();
  }, [version]);

  const visible = entries.slice(0, maxItems);

  const onRemove = (ticker: string) => {
    removeTickerFromWatchlist(ticker);
    setVersion((v) => v + 1);
  };

  const empty = visible.length === 0;

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/35 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.35)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Watchlist snapshot</div>
          <div className="mt-2 text-[20px] font-medium text-white/92 leading-[1.2]">
            {empty ? "Save tickers to guide exploration" : beginner ? "Your saved lenses" : "Saved tickers for quick entry"}
          </div>
        </div>

        {!empty && (
          <div className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-white/45">
            {entries.length} saved
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {empty ? (
          <div className="text-[13px] leading-[1.8] text-white/75">
            Add a ticker from any company or intelligence context. We’ll keep this calm and fast for guided discovery.
          </div>
        ) : (
          visible.map((e) => {
            const age = formatAgeMs(Date.now() - e.addedAt);
            return (
              <div
                key={e.ticker}
                className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-black/25 px-4 py-3"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => navigateToStock({ ticker: e.ticker, mode: "hard", preserveParamKeys: ["skipOnboarding"] })}
                    className="text-[14px] font-semibold text-white/92 hover:text-white/100 transition ss-focus-outline"
                    aria-label={`Open ${e.ticker}`}
                  >
                    {e.ticker}
                  </button>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mt-1">{age}</div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(e.ticker)}
                  className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition ss-focus-outline"
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-white/45">
        Calm entry • educational only • no trade execution
      </div>
    </section>
  );
}
