import React from "react";
import { ArrowRight, BarChart3, Eye, Search, ShieldCheck } from "lucide-react";
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

const workflow = [
  {
    icon: <Search className="h-5 w-5" style={{ color: "#1a6e4a" }} aria-hidden="true" />,
    title: "Search a company",
    body: "Find companies by ticker, name, or sector. Review evidence-backed research signals and source labels.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" style={{ color: "#1a6e4a" }} aria-hidden="true" />,
    title: "Inspect signal changes",
    body: "Review scoring signals, factor breakdowns, and freshness indicators for every data point.",
  },
  {
    icon: <Eye className="h-5 w-5" style={{ color: "#1a6e4a" }} aria-hidden="true" />,
    title: "Save research",
    body: "Track companies and add research notes. Your watchlist and portfolio are saved locally by default.",
  },
];

export const PublicLandingPage: React.FC = () => {
  return (
    <main className="min-h-screen antialiased" style={{ background: "#f7f8fb", color: "#0f1419", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <MobileNav />

      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-24 md:pt-36">
        <div className="grid gap-12 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <div
              className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", color: "#536471" }}
            >
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#1a6e4a" }} aria-hidden="true" />
              Evidence-driven research platform
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]" style={{ color: "#0f1419" }}>
              Indian equity research,<br />with evidence you can inspect.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8" style={{ color: "#536471" }}>
              Track signals, fundamentals, and ranking changes without noisy dashboards. Built for research workflows, not tips or recommendations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                id="hero-cta-start"
                type="button"
                onClick={() => setPage("signup")}
                className="h-12 px-6 text-sm"
              >
                Start Research <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                id="hero-cta-rankings"
                type="button"
                onClick={() => setPage("rankings")}
                variant="secondary"
                glass
                className="h-12 px-6 text-sm"
              >
                View live rankings
              </Button>
            </div>
          </div>

          <div
            className="rounded-2xl p-6 aura-float"
            style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            <div className="mb-5 flex items-center justify-between pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.4)" }}>
              <span className="text-sm font-medium" style={{ color: "#536471" }}>
                Research principles
              </span>
              <span
                className="rounded-full px-3 py-0.5 text-xs font-medium"
                style={{ background: "#e8f4ee", border: "1px solid rgba(26,110,74,0.2)", color: "#1a6e4a" }}
              >
                Evidence first
              </span>
            </div>
            <div className="grid gap-3">
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#16a34a" }} aria-hidden="true" />
                No fabricated rankings or scores
              </div>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#16a34a" }} aria-hidden="true" />
                Unavailable data clearly labelled
              </div>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#16a34a" }} aria-hidden="true" />
                Source-backed signals only
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20" style={{ borderTop: "1px solid rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight" style={{ color: "#0f1419" }}>
            How stock research works
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {workflow.map(({ icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
              >
                <div
                  className="mb-4 inline-flex rounded-xl p-3"
                  style={{ background: "#e8f4ee", border: "1px solid rgba(26,110,74,0.15)" }}
                >
                  {icon}
                </div>
                <h3 className="text-base font-semibold" style={{ color: "#0f1419" }}>{title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "#536471" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
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

      <section
        className="py-14"
        style={{ background: "#1a6e4a" }}
        aria-label="Call to action"
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-xl font-semibold text-white">Start researching</h2>
          <p className="mt-3 mx-auto max-w-md text-base text-white/70">
            Search companies, review signals, and track your research. No advisory claims, no fabricated scores.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              id="onboarding-cta-signup"
              type="button"
              onClick={() => setPage("signup")}
              variant="secondary"
              className="h-12 border-white/20 bg-white px-7 text-sm hover:bg-slate-100"
              style={{ color: "#1a6e4a" }}
            >
              Create free account <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              id="onboarding-cta-about"
              type="button"
              onClick={() => setPage("about")}
              variant="outline"
              className="h-12 border-white/20 px-7 text-sm text-white/80 hover:bg-white/10 hover:text-white"
            >
              Learn more
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PublicLandingPage;
