import React, { useMemo } from "react";
import type { MarketComposite, MarketConnectionStatus } from "../../services/market/marketService";

type Props = {
  marketSnapshot: MarketComposite;
  connectionStatus: MarketConnectionStatus;
};

function formatIndexValue(n: number): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function statusLabel(status: MarketConnectionStatus): string {
  if (status === "connecting" || status === "reconnecting") {
    return "Updating";
  }

  if (status === "disconnected") {
    return "Offline";
  }

  return "Live";
}

export default function TopMoversSnapshot({
  marketSnapshot,
  connectionStatus,
}: Props): JSX.Element {
  const { marketState } = marketSnapshot;

  const cards = useMemo(
    () => [
      {
        id: "nifty",
        name: "Nifty 50",
        value: marketState.nifty,
        trend: "+0.84%",
        health: "Healthy",
      },
      {
        id: "sensex",
        name: "Sensex",
        value: marketState.sensex,
        trend: "+0.63%",
        health: "Stable",
      },
      {
        id: "banknifty",
        name: "Bank Nifty",
        value: marketState.bankNifty,
        trend: "+1.12%",
        health: "Very Healthy",
      },
    ],
    [marketState.bankNifty, marketState.nifty, marketState.sensex],
  );

  return (
    <section className="relative z-[12]">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/75">
            Market Snapshot
          </div>

          <div className="mt-2 text-sm text-white/50">
            Live overview of the Indian market.
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/60">
          {statusLabel(connectionStatus)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="rounded-[30px] border border-white/10 bg-[#050607]/90 p-6 shadow-[0_0_60px_rgba(0,0,0,0.32)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                  {card.name}
                </div>

                <div className="mt-4 text-[30px] font-semibold tracking-tight text-white">
                  {formatIndexValue(card.value)}
                </div>
              </div>

              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
                {card.health}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4 text-sm">
              <div className="text-white/42">Today</div>

              <div className="text-emerald-300">{card.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[30px] border border-white/10 bg-[#050607]/90 p-6 shadow-[0_0_60px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
              Market Pulse
            </div>

            <div className="mt-3 text-sm leading-7 text-white/58 sm:text-[15px]">
              Indian markets remain stable with stronger momentum in banking,
              infrastructure, and large-cap sectors.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
              Breadth {Math.round(marketState.breadthPct)}%
            </div>

            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              Market Stable
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
