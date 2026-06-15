import React from "react";
import { Activity, BarChart3, Database, LineChart, Lock, Radar, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";

function setPage(pageKey: string, id?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  if (id) params.set("id", id);
  else params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

const metrics = [
  ["Companies tracked", "500+"],
  ["Signals analysed", "12k+"],
  ["Factors calculated", "35+"],
  ["Technical indicators", "11"],
];

const trustSignals = [
  "Provider-driven data",
  "No manual stock picks",
  "No paid ranking placements",
  "Confidence shown with every score",
];

const engineCards = [
  { icon: <Database className="h-4 w-4" />, title: "Data coverage", copy: "Market data, fundamentals, factor snapshots, and source freshness stay visible." },
  { icon: <Radar className="h-4 w-4" />, title: "Ranking engine", copy: "Growth, quality, stability, valuation, momentum, and risk feed one auditable score." },
  { icon: <ShieldCheck className="h-4 w-4" />, title: "Trust controls", copy: "Provider source, confidence, and freshness are shown next to the analysis." },
];

const examples = ["RELIANCE", "TCS", "HDFCBANK", "INFY"];

export const PublicLandingPage: React.FC = () => {
  return (
    <main className="ss-tv-app ss-tv-stage relative min-h-screen overflow-x-hidden text-[#F7FAFF]">
      <TopNav />
      <MobileNav />

      <section className="relative z-10 mx-auto grid min-h-[92vh] max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-14 pt-28 md:px-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00FFE0]">
            <Sparkles className="h-3.5 w-3.5" />
            AI-native Indian equity intelligence
          </div>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-normal text-white md:text-7xl">
            Intelligence for Indian Investors
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-[#B8C4D8] md:text-lg">
            StockStory turns financial, technical, factor, and risk data into clear company research with visible methodology and source transparency.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setPage("signup")} className="ss-premium-button px-7 text-sm">
              Open workspace
            </button>
            <button type="button" onClick={() => setPage("about")} className="ss-secondary-button px-7 text-sm">
              View methodology
            </button>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div key={label} className="ss-premium-panel p-4">
                <div className="font-mono text-xl font-bold text-white">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B98AA]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ss-premium-panel relative overflow-hidden p-4">
          <div className="flex h-11 items-center justify-between border-b border-white/10 px-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8B98AA]">
              <LineChart className="h-4 w-4 text-[#00C8FF]" />
              StockStory terminal
            </div>
            <div className="rounded border border-[#00FFE0]/20 bg-[#00FFE0]/10 px-2 py-1 font-mono text-[10px] text-[#00FFE0]">LIVE METHOD</div>
          </div>
          <div className="grid gap-4 p-2 pt-5 lg:grid-cols-[1fr_220px]">
            <div className="rounded-lg border border-white/10 bg-[#05070A] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B98AA]">Composite health</div>
                  <div className="mt-2 text-3xl font-extrabold text-white">Reliance Industries</div>
                </div>
                <div className="rounded-lg border border-[#00C8FF]/25 bg-[#00C8FF]/10 p-3 text-[#00C8FF]">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-8 h-[260px] rounded-lg border border-white/10 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px] p-4">
                <svg viewBox="0 0 720 260" className="h-full w-full" role="img" aria-label="Market intelligence preview">
                  <path d="M0 188 L80 170 L150 180 L230 118 L310 132 L405 88 L480 110 L570 62 L650 78 L720 44" fill="none" stroke="#00C8FF" strokeWidth="5" />
                  <path d="M0 210 L90 190 L180 198 L270 160 L360 172 L450 140 L540 151 L630 116 L720 126" fill="none" stroke="#00E676" strokeWidth="3" opacity="0.75" />
                  <path d="M0 154 L95 158 L180 135 L270 144 L360 111 L450 119 L540 91 L630 98 L720 84" fill="none" stroke="#7B61FF" strokeWidth="3" opacity="0.72" />
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              {examples.map((symbol, index) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => setPage("company", symbol)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-left transition hover:border-[#00C8FF]/50"
                >
                  <span>
                    <span className="block font-mono text-xs font-bold text-white">{symbol}</span>
                    <span className="block text-[10px] text-[#8B98AA]">NSE equity</span>
                  </span>
                  <span className={index < 2 ? "text-[#00E676]" : "text-[#FFC857]"}>
                    <TrendingUp className="h-4 w-4" />
                  </span>
                </button>
              ))}
              <div className="rounded-lg border border-[#FFC857]/20 bg-[#FFC857]/10 p-3 text-xs leading-6 text-[#D6DEEA]">
                Research signals only. Not personal investment advice.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/10 bg-[#0A0F17]/70">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-5 py-8 md:grid-cols-4 md:px-8">
          {trustSignals.map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#D6DEEA]">
              <ShieldCheck className="h-4 w-4 text-[#00FFE0]" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="max-w-3xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00C8FF]">Why different</div>
          <h2 className="mt-3 text-4xl font-extrabold tracking-normal text-white md:text-5xl">A research platform that shows its work.</h2>
          <p className="mt-5 text-base leading-8 text-[#B8C4D8]">
            Find a company, inspect data lineage, read engine breakdowns, and understand why rankings move.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {engineCards.map((card) => (
            <div key={card.title} className="ss-premium-panel p-6">
              <div className="mb-8 inline-flex rounded-lg border border-[#00C8FF]/25 bg-[#00C8FF]/10 p-3 text-[#00C8FF]">{card.icon}</div>
              <h3 className="text-xl font-bold text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#B8C4D8]">{card.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="ss-premium-panel grid gap-8 p-8 md:grid-cols-[1fr_0.9fr] md:p-10">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00FFE0]">Performance dashboard</div>
            <h2 className="mt-3 text-3xl font-extrabold text-white">Coverage, factors, technicals, and confidence in one workspace.</h2>
            <p className="mt-4 text-sm leading-7 text-[#B8C4D8]">
              Compare the signals behind a stock score before you decide what deserves deeper research.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["Financial data", "Technical signals", "Factor models", "AI explanations"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-[#05070A]/70 p-4">
                <Activity className="mb-5 h-4 w-4 text-[#00C8FF]" />
                <div className="text-sm font-bold text-white">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default PublicLandingPage;
