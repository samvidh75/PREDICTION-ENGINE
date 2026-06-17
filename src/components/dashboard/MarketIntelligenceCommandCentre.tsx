import React from "react";
import PredictivePanel from "../PredictivePanel";

const quickSearches = [
  "Reliance",
  "Tata Motors",
  "HAL",
  "Suzlon",
  "BEL",
  "Granules India",
];

export default function MarketIntelligenceCommandCentre(): JSX.Element {
  const sections = [
    {
      title: "Market Pulse",
      subtitle: "Track broader market direction and major movement.",
    },
    {
      title: "Healthometer",
      subtitle: "Company health and stability overview from available data.",
    },
    {
      title: "Market Movers",
      subtitle: "Discover active stocks and stronger trends.",
    },
    {
      title: "Sector Watch",
      subtitle: "Track sector movement and market strength.",
    },
  ];

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-10 sm:px-10 lg:px-16">
        <div className="mb-10 flex flex-col gap-5">
          <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-wider text-white/60">
            Research workspace
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Market Intelligence
              </h1>

              <p className="mt-4 text-base leading-7 text-white/60 sm:text-lg">
                Company search, market data, watchlists, and health signals in one research workspace.
              </p>
            </div>

            <div className="w-full max-w-[480px] rounded-lg border border-white/10 bg-[#111418] p-3">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#1e222d] px-4 py-3">
                <div className="text-white/40">⌕</div>

                <input
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  placeholder="Search NSE, BSE & SME stocks"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {quickSearches.map((stock) => (
                  <button
                    key={stock}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition hover:border-[#2962ff]/40 hover:text-white"
                  >
                    {stock}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-lg border border-white/10 bg-[#161B22] p-6"
            >
              <div className="mb-3 text-sm uppercase tracking-[0.18em] text-[#9bb5ff]">
                {section.title}
              </div>

              <div className="text-sm leading-6 text-white/65">
                {section.subtitle}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-lg border border-white/10 bg-[#111418] p-6">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#9bb5ff]">
                  Open a company page for verified live quote data
                </div>

                <div className="mt-3 flex items-end gap-3">
                  <div className="text-3xl font-semibold text-white sm:text-4xl">
                    Live market data
                  </div>

                  <div className="pb-1 text-sm text-[#787b86]">
                    No synthetic price shown
                  </div>
                </div>
              </div>

              <div                     className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
                Data-backed
              </div>
            </div>

            <div className="h-[320px] rounded-lg border border-white/5 bg-[linear-gradient(180deg,rgba(41,98,255,0.16),rgba(34,171,148,0.08),transparent)]" />
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-white/10 bg-[#161B22] p-6">
              <div className="mb-5 text-sm uppercase tracking-[0.18em] text-[#9bb5ff]">
                Healthometer
              </div>

              <div className="flex items-center justify-between gap-6 rounded-lg border border-white/5 bg-black/20 px-5 py-4">
                <div>
                  <div className="text-2xl font-semibold text-white">Health Score</div>

                  <div className="mt-2 text-sm leading-6 text-white/55">
                    Uses company health only when market data is available.
                  </div>
                </div>

                <div                     className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
                  Research Signal
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#161B22] p-6">
              <div className="mb-5 text-sm uppercase tracking-[0.18em] text-[#9bb5ff]">
                Quick Stats
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">Market Cap</span>
                  <span className="text-[#787b86]">Open company page</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">52W High</span>
                  <span className="text-[#787b86]">Open company page</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">52W Low</span>
                  <span className="text-[#787b86]">Open company page</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">Trend</span>
                  <span className="text-[#787b86]">Live source required</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ss-tv-panel ss-tv-neon-edge mt-10 rounded-lg p-6">
          <div className="mb-5 text-sm uppercase tracking-[0.18em] text-[#9bb5ff]">
            Company Health
          </div>
          <PredictivePanel symbol="RELIANCE" />
        </div>
      </div>
    </div>
  );
}
