import React from "react";
import { BarChart3, Database, FileSearch, LineChart, ShieldCheck } from "lucide-react";
import MobileNav from "../components/navigation/MobileNav";
import TopNav from "../components/navigation/TopNav";
import { ResearchDisclaimer } from "../components/ui/PageHeader";

function setPage(pageKey: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

const architecture = [
  { icon: <Database className="h-4 w-4" />, title: "Financial data", body: "Provider snapshots, ratios, market data and freshness metadata feed company pages when available." },
  { icon: <LineChart className="h-4 w-4" />, title: "Technical signals", body: "Momentum, volatility, trend and risk-sensitive signals are mapped into engine inputs only when source data exists." },
  { icon: <BarChart3 className="h-4 w-4" />, title: "Factor models", body: "Quality, value, growth, risk and sector factors create a repeatable ranking structure." },
  { icon: <ShieldCheck className="h-4 w-4" />, title: "Risk separation", body: "Confidence and availability are shown separately from score outputs so missing evidence is visible." },
];

const methodology = ["Collect data", "Generate features", "Generate factors", "Run engines", "Publish rankings"];

export const PublicAboutPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
      <TopNav />
      <MobileNav />

      <section className="mx-auto max-w-6xl px-6 pb-12 pt-28 md:pt-32">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <FileSearch className="h-3.5 w-3.5 text-emerald-700" />
            Research methodology
          </div>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl">
            Research intelligence for Indian equities
          </h1>
          <p className="mt-6 text-base leading-7 text-slate-600 sm:text-lg">
            StockStory transforms provider-driven financial data into structured, source-backed research signals. The product is built for explainability, unavailable-state honesty and repeatable analysis.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setPage("signup")} className="h-11 rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800">
              Create free account
            </button>
            <button type="button" onClick={() => setPage("landing")} className="h-11 rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Back to home
            </button>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-950">What the system measures</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {architecture.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-2.5 text-emerald-800">{item.icon}</div>
                <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-center text-xl font-semibold tracking-tight text-slate-950">From raw data to ranking</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-5">
          {methodology.map((step, index) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className="font-mono text-sm font-semibold text-slate-500">{String(index + 1).padStart(2, "0")}</div>
              <div className="mt-3 text-sm font-semibold text-slate-950">{step}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-12">
        <ResearchDisclaimer />
      </section>
    </main>
  );
};

export default PublicAboutPage;
