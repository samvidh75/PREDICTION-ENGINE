import React from "react";
import { BarChart3, Database, LineChart, ShieldCheck, TrendingUp } from "lucide-react";
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
  ["Signals reviewed", "12k+"],
  ["Financial factors", "35+"],
  ["Technical indicators", "11"],
];

const trustSignals = [
  "Source-backed data",
  "No paid placements",
  "Confidence shown clearly",
  "Research, not investment advice",
];

const engineCards = [
  { title: "Clean company view", copy: "Financials, factors, technicals, and confidence are grouped into one readable workspace." },
  { title: "Transparent scoring", copy: "Each ranking shows the inputs and methodology behind the score instead of hiding the calculation." },
  { title: "Built for Indian equities", copy: "The product focuses on NSE-listed companies and keeps provider freshness visible." },
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
            Indian equity research platform
          </div>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-[-0.03em] text-white md:text-7xl">
            Clear stock research for Indian investors
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-[#D6DEEA] md:text-lg">
            StockStory India turns market data, fundamentals, technical indicators, and risk signals into a readable research workspace. Rankings are research signals, not personal investment advice.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setPage("signup")} className="ss-premium-button px-7 text-sm">
              Create account
            </button>
            <button type="button" onClick={() => setPage("about")} className="ss-secondary-button px-7 text-sm">
              See methodology
            </button>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div key={label} className="ss-premium-panel p-4">
                <div className="font-mono text-xl font-bold text-white">{value}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9AA8BD]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ss-premium-panel relative overflow-hidden p-4">
          <div className="flex h-11 items-center justify-between border-b border-white/10 px-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9AA8BD]">
              <LineChart className="h-4 w-4 text-[#00C8FF]" />
              Research preview
            </div>
            <div className="rounded border border-[#00FFE0]/20 bg-[#00FFE0]/10 px-2 py-1 font-mono text-[10px] text-[#00FFE0]">METHOD</div>
          </div>
          <div className="grid gap-4 p-2 pt-5 lg:grid-cols-[1fr_220px]">
            <div className="rounded-lg border border-white/10 bg-[#05070A] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9AA8BD]">Composite health</div>
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
                    <span className="block text-[11px] text-[#9AA8BD]">NSE equity</span>
                  </span>
                  <span className={index < 2 ? "text-[#00E676]" : "text-[#FFC857]"}>
                    <TrendingUp className="h-4 w-4" />
                  </span>
                </button>
              ))}
              <div className="rounded-lg border border-[#FFC857]/20 bg-[#FFC857]/10 p-3 text-xs leading-6 text-[#D6DEEA]">
                Use rankings as research context, not buy or sell instructions.
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
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00C8FF]">Why it helps</div>
          <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-white md:text-5xl">Research that shows its work.</h2>
          <p className="mt-5 text-base leading-8 text-[#D6DEEA]">
            Find a company, review its data lineage, inspect the score breakdown, and understand why a ranking changed.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {engineCards.map((card) => (
            <div key={card.title} className="ss-premium-panel p-6">
              <div className="mb-8 inline-flex rounded-lg border border-[#00C8FF]/25 bg-[#00C8FF]/10 p-3 text-[#00C8FF]"><Database className="h-4 w-4" /></div>
              <h3 className="text-xl font-bold text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#D6DEEA]">{card.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default PublicLandingPage;
