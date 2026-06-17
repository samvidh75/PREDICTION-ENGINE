import React from "react";
import { BarChart3, Database, FileSearch, LineChart, ShieldCheck } from "lucide-react";
import MobileNav from "../components/navigation/MobileNav";
import TopNav from "../components/navigation/TopNav";
import { ResearchDisclaimer } from "../components/ui/PageHeader";
import Button from "../components/ui/Button";

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
    <main className="min-h-screen font-sans text-slate-900 antialiased">
      <TopNav />
      <MobileNav />

      <section className="mx-auto max-w-6xl px-6 pb-12 pt-24 md:pt-32">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass px-3 py-1.5 text-xs font-medium text-slate-600">
            <FileSearch className="h-3.5 w-3.5 text-emerald-700" />
            Research methodology
          </div>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">
            Research intelligence for Indian equities
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            StockStory turns available financial data into structured research signals with clear source and availability labels.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => setPage("signup")} className="h-11 px-6 text-sm">
              Create free account
            </Button>
            <Button type="button" onClick={() => setPage("landing")} variant="secondary" glass className="h-11 px-6 text-sm">
              Back to home
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y border-white/30 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-900">What the research measures</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {architecture.map((item) => (
              <div key={item.title} className="rounded-2xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-6">
                <div className="mb-4 inline-flex rounded-xl bg-emerald-50/60 backdrop-blur-sm border border-emerald-200/30 p-2.5 text-emerald-700">{item.icon}</div>
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-xl font-semibold tracking-tight text-slate-900">From raw data to ranking</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-5">
          {methodology.map((step, index) => (
            <div key={step} className="rounded-2xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-5 text-center">
              <div className="font-mono text-sm font-semibold text-slate-400">{String(index + 1).padStart(2, "0")}</div>
              <div className="mt-3 text-sm font-semibold text-slate-900">{step}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        <ResearchDisclaimer />
      </section>
    </main>
  );
};

export default PublicAboutPage;
