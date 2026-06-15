import React from "react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import { ResearchDisclaimer } from "../components/ui/PageHeader";
import { Database, LineChart, BarChart3, ShieldCheck, FileSearch } from "lucide-react";

function setPage(pageKey: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

const providers = ["Yahoo Finance", "Upstox", "Screener"];

const architecture = [
  { icon: <Database className="h-4 w-4" />, title: "Financial Data", body: "Provider snapshots, ratios, market data, and freshness metadata feed the company view." },
  { icon: <LineChart className="h-4 w-4" />, title: "Technical Signals", body: "Momentum, volatility, RSI, MACD, trend strength, and risk-sensitive signals are mapped into engine inputs when available." },
  { icon: <BarChart3 className="h-4 w-4" />, title: "Factor Models", body: "Quality, value, growth, risk, and sector factors create a repeatable ranking structure." },
  { icon: <ShieldCheck className="h-4 w-4" />, title: "Risk Analysis", body: "Volatility, leverage, cash-flow stress, accounting quality, and confidence indicators are separated from narrative." },
];

const methodology = ["Collect Data", "Generate Features", "Generate Factors", "Run Engines", "Produce Rankings"];

export const PublicAboutPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <TopNav />
      <MobileNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Research intelligence for Indian equities
          </h1>
          <p className="mt-6 text-base leading-relaxed text-slate-400 sm:text-lg">
            StockStory transforms financial data into structured, source-backed research signals. 
            The platform is built for serious investors who want explainable rankings, not black-box scores.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setPage("signup")}
              className="h-11 rounded-lg bg-slate-100 px-6 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Create free account
            </button>
            <button
              type="button"
              onClick={() => setPage("landing")}
              className="h-11 rounded-lg border border-slate-700 bg-slate-900/40 px-6 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Back to home
            </button>
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="border-t border-slate-800 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-white">Data providers</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
            Rankings are generated from provider-driven data, not paid placements or hidden analyst picks.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {providers.map((provider) => (
              <div key={provider} className="rounded-lg border border-slate-800 bg-slate-900/40 px-6 py-4 text-center">
                <div className="text-sm font-bold text-white">{provider}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">provider</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="border-t border-slate-800 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-white">What the system measures</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
            Factor-based scoring across five domains, backed by provider data.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {architecture.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
                <div className="mb-4 inline-flex rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-slate-300">{item.icon}</div>
                <h3 className="text-base font-semibold text-slate-200">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology pipeline */}
      <section className="border-t border-slate-800 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-white">From raw data to ranking</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
            Five steps from ingestion to output.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-5">
            {methodology.map((step, index) => (
              <div key={step} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-center">
                <div className="font-mono text-sm font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</div>
                <div className="mt-3 text-sm font-semibold text-white">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-t border-slate-800 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-lg font-semibold text-white">What rankings mean</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>• StockStory measures business quality, growth, valuation, stability, momentum, and risk.</li>
                <li>• StockStory does not guarantee returns or provide personalised investment advice.</li>
                <li>• Rankings change when provider data, factor snapshots, or risk context changes.</li>
                <li>• Confidence explains how complete and internally consistent the available data is.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-lg font-semibold text-white">Data commitment</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>• Provider-driven data is preferred over manual overrides.</li>
                <li>• No manual stock picks are inserted into rankings.</li>
                <li>• No paid ranking placements are supported.</li>
                <li>• Unavailable data is shown as unavailable, not invented.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Research Disclaimer */}
      <section className="border-t border-slate-800 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <ResearchDisclaimer />
        </div>
      </section>
    </main>
  );
};

export default PublicAboutPage;
