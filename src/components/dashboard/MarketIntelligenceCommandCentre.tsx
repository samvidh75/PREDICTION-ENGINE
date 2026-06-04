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
      subtitle: "Simple company health and stability overview.",
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
    <div className="min-h-screen bg-[#020304] text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-10 sm:px-10 lg:px-16">
        <div className="mb-10 flex flex-col gap-5">
          <div className="inline-flex w-fit items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1 text-xs uppercase tracking-[0.28em] text-cyan-200">
            StockStory India
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Market Intelligence OS
              </h1>

              <p className="mt-4 text-base leading-7 text-white/60 sm:text-lg">
                Cleaner market intelligence with beginner-friendly stock analysis,
                realtime dashboards, simplified health signals, and immersive stock tracking.
              </p>
            </div>

            <div className="w-full max-w-[480px] rounded-3xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
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
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition hover:border-cyan-500/30 hover:text-cyan-200"
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
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
            >
              <div className="mb-3 text-sm uppercase tracking-[0.18em] text-cyan-200/80">
                {section.title}
              </div>

              <div className="text-sm leading-6 text-white/65">
                {section.subtitle}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                  Reliance Industries · NSE
                </div>

                <div className="mt-3 flex items-end gap-3">
                  <div className="text-3xl font-semibold text-white sm:text-4xl">
                    ₹2,984.25
                  </div>

                  <div className="pb-1 text-sm text-emerald-300">
                    +1.84%
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                Very Healthy
              </div>
            </div>

            <div className="h-[320px] rounded-2xl border border-white/5 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent" />
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div className="mb-5 text-sm uppercase tracking-[0.18em] text-cyan-200/80">
                Healthometer
              </div>

              <div className="flex items-center justify-between gap-6 rounded-2xl border border-white/5 bg-black/20 px-5 py-4">
                <div>
                  <div className="text-2xl font-semibold text-white">78%</div>

                  <div className="mt-2 text-sm leading-6 text-white/55">
                    Strong long-term market behaviour
                  </div>
                </div>

                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                  Very Healthy
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div className="mb-5 text-sm uppercase tracking-[0.18em] text-cyan-200/80">
                Quick Stats
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">Market Cap</span>
                  <span className="text-white">₹20.1T</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">52W High</span>
                  <span className="text-white">₹3,024.90</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">52W Low</span>
                  <span className="text-white">₹2,220.30</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">Trend</span>
                  <span className="text-emerald-300">Positive</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="mb-5 text-sm uppercase tracking-[0.18em] text-cyan-200/80">
            Predictive Intelligence
          </div>
          <PredictivePanel symbol="RELIANCE" />
        </div>
      </div>
    </div>
  );
}
