import React from "react";
import { BarChart3, Database, FileSearch, LineChart, ShieldCheck } from "lucide-react";
import MobileNav from "../components/navigation/MobileNav";
import TopNav from "../components/navigation/TopNav";
import Button from "../components/ui/Button";

function setPage(pageKey: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

const architecture = [
  {
    icon: <Database className="h-4 w-4" aria-hidden="true" />,
    title: "Financial data",
    body: "Provider snapshots, ratios, market data and freshness metadata feed company pages when available. Missing data is clearly labelled.",
  },
  {
    icon: <LineChart className="h-4 w-4" aria-hidden="true" />,
    title: "Technical signals",
    body: "Momentum, volatility, trend and risk-sensitive signals are mapped into engine inputs only when source data exists.",
  },
  {
    icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />,
    title: "Factor models",
    body: "Quality, value, growth, risk and sector factors create a repeatable ranking structure for the covered universe.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
    title: "Risk separation",
    body: "Confidence and availability are shown separately from score outputs so missing evidence is visible and accounted for.",
  },
];

const methodologySteps = [
  { number: "01", title: "Collect data" },
  { number: "02", title: "Generate features" },
  { number: "03", title: "Generate factors" },
  { number: "04", title: "Run engines" },
  { number: "05", title: "Publish rankings" },
];

export const PublicAboutPage: React.FC = () => {
  return (
    <main className="min-h-screen antialiased" style={{ background: "#f7f8fb", color: "#0f1419", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <MobileNav />

      <section className="mx-auto max-w-6xl px-6 pb-12 pt-24 md:pt-32">
        <div className="max-w-3xl">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", color: "#536471" }}
          >
            <FileSearch className="h-3.5 w-3.5" style={{ color: "#1a6e4a" }} aria-hidden="true" />
            Research platform
          </div>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl" style={{ color: "#0f1419" }}>
            Research intelligence for Indian equities
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 sm:text-lg" style={{ color: "#536471" }}>
            StockStory India turns available financial data into structured research signals with clear source and availability labels.
            This is a research tool, not an advisory service.
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

      <section className="py-16" style={{ borderTop: "1px solid rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xl font-semibold tracking-tight" style={{ color: "#0f1419" }}>
            What the research measures
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {architecture.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-6 transition-all duration-200 hover:shadow-lg"
                style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
              >
                <div
                  className="mb-4 inline-flex rounded-xl p-2.5"
                  style={{ background: "#e8f4ee", border: "1px solid rgba(26,110,74,0.15)", color: "#1a6e4a" }}
                >
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold" style={{ color: "#0f1419" }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "#536471" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-xl font-semibold tracking-tight" style={{ color: "#0f1419" }}>
          From raw data to ranking
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-5">
          {methodologySteps.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl p-5 text-center"
              style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
            >
              <div className="font-mono text-sm font-semibold" style={{ color: "#8b98a5" }}>{step.number}</div>
              <div className="mt-3 text-sm font-semibold" style={{ color: "#0f1419" }}>{step.title}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div
          className="rounded-2xl p-6 text-sm leading-relaxed"
          style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.3)", color: "#8b98a5" }}
        >
          <strong>Research signals only.</strong> StockStory India provides structured equity research signals.
          All data is sourced from public financial data providers and clearly labelled with source and freshness.
          Nothing on this platform constitutes investment advice, a recommendation to buy or sell securities, or a solicitation.
          Past scoring patterns do not guarantee future outcomes. Verify all data independently before making investment decisions.
        </div>
      </section>
    </main>
  );
};

export default PublicAboutPage;
