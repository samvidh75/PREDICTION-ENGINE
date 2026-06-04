import React, { useMemo } from "react";
import { Activity, BarChart3, Bell, Briefcase, Eye, LineChart, Search, Shield } from "lucide-react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import { formatINR, formatPercent, useLiveQuotes } from "../hooks/useLiveQuotes";
import { StockRegistry } from "../services/stocks/StockRegistry";

type FeatureRoute = "dashboard" | "search" | "company" | "watchlist" | "portfolio" | "alerts";

type FeatureCard = {
  title: string;
  eyebrow: string;
  description: string;
  route: FeatureRoute;
  icon: React.ReactNode;
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    title: "Search and company pages",
    eyebrow: "Discovery",
    description: "Find Indian companies quickly and open the company intelligence page with the same stock route used across the app.",
    route: "search",
    icon: <Search className="h-4 w-4" />,
  },
  {
    title: "Live market data",
    eyebrow: "Quotes",
    description: "Surface live quote responses only when the market-data API returns a valid price.",
    route: "company",
    icon: <LineChart className="h-4 w-4" />,
  },
  {
    title: "Watchlist",
    eyebrow: "Tracking",
    description: "Keep a focused list of companies and open any ticker directly into its stock intelligence page.",
    route: "watchlist",
    icon: <Eye className="h-4 w-4" />,
  },
  {
    title: "Portfolio",
    eyebrow: "Holdings",
    description: "Review holdings in one workspace without turning the product into a speculative recommendation feed.",
    route: "portfolio",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    title: "Alerts",
    eyebrow: "Monitoring",
    description: "Use alert surfaces for market and company follow-up instead of scattered notes.",
    route: "alerts",
    icon: <Bell className="h-4 w-4" />,
  },
  {
    title: "Dashboard intelligence",
    eyebrow: "Workspace",
    description: "Start from a market command center that connects search, watchlist, portfolio, alerts, and company analysis.",
    route: "dashboard",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

const WATCH_SYMBOLS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"];

function setPage(pageKey: string, id?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  if (id) params.set("id", id);
  else params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

export const PublicAboutPage: React.FC = () => {
  const featuredStocks = useMemo(() => {
    return WATCH_SYMBOLS.map((symbol) => StockRegistry.getStock(symbol)).filter(Boolean);
  }, []);

  const liveQuotes = useLiveQuotes(featuredStocks.map((stock) => stock!.symbol));

  const liveRows = featuredStocks
    .map((stock) => {
      const quote = liveQuotes[stock!.symbol]?.quote;
      return quote ? { stock: stock!, quote } : null;
    })
    .filter(Boolean);

  const openFeature = (route: FeatureRoute) => {
    if (route === "search") {
      setPage("login");
      return;
    }
    if (route === "company") {
      const firstLive = liveRows[0]?.stock.symbol;
      setPage(firstLive ? "company" : "login", firstLive);
      return;
    }
    setPage(route);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0f0f0f] text-[#f0f3fa] font-sans antialiased">
      <TopNav />
      <MobileNav />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,123,134,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,123,134,0.10)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
        <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_50%_0%,rgba(41,98,255,0.22),transparent_58%)]" />
      </div>

      <section className="relative z-10 mx-auto grid min-h-[760px] w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-20 pt-32 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:pt-36">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2a2e39] bg-[#131722]/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7da0ff]">
            <Activity className="h-3.5 w-3.5" />
            Market workspace for Indian equities
          </div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight text-[#f0f3fa] md:text-7xl">
            Research Indian stocks with a real market interface.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#b2b5be] md:text-lg">
            StockStory India brings search, company intelligence, live quote checks, watchlists, portfolios, and alerts into one focused investing workspace.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setPage("signup")}
              className="h-12 rounded-full bg-[#2962ff] px-7 text-sm font-semibold text-white transition hover:bg-[#1e53e5]"
            >
              Get started
            </button>
            <button
              type="button"
              onClick={() => setPage("login")}
              className="h-12 rounded-full border border-[#2a2e39] bg-[#131722] px-7 text-sm font-semibold text-[#f0f3fa] transition hover:bg-[#1e222d]"
            >
              Sign in
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[36px] bg-[#2962ff]/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[28px] border border-[#2a2e39] bg-[#131722] shadow-2xl">
            <div className="flex h-10 items-center gap-2 border-b border-[#2a2e39] bg-[#1e222d] px-4">
              <span className="h-3 w-3 rounded-full bg-[#f23645]" />
              <span className="h-3 w-3 rounded-full bg-[#f0b90b]" />
              <span className="h-3 w-3 rounded-full bg-[#22ab94]" />
              <span className="ml-3 text-[11px] font-medium text-[#787b86]">StockStory workspace</span>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[1fr_220px]">
              <div className="min-h-[340px] rounded-2xl border border-[#2a2e39] bg-[#0f0f0f] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[#787b86]">Company intelligence</div>
                    <div className="mt-1 text-xl font-semibold text-[#f0f3fa]">Research view</div>
                  </div>
                  <Shield className="h-5 w-5 text-[#2962ff]" />
                </div>
                <div className="relative h-48 overflow-hidden rounded-xl border border-[#2a2e39] bg-[#131722]">
                  <svg viewBox="0 0 640 260" className="h-full w-full" role="img" aria-label="StockStory chart preview">
                    <defs>
                      <linearGradient id="aboutChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2962ff" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#2962ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 190 L60 174 L110 182 L170 132 L230 142 L290 96 L350 118 L410 78 L470 88 L540 48 L640 62 L640 260 L0 260 Z" fill="url(#aboutChartFill)" />
                    <path d="M0 190 L60 174 L110 182 L170 132 L230 142 L290 96 L350 118 L410 78 L470 88 L540 48 L640 62" fill="none" stroke="#2962ff" strokeWidth="4" />
                    <g stroke="#2a2e39" strokeWidth="1">
                      <path d="M0 52 H640" />
                      <path d="M0 130 H640" />
                      <path d="M0 208 H640" />
                    </g>
                  </svg>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {["Search", "Watchlist", "Alerts"].map((label) => (
                    <div key={label} className="rounded-xl border border-[#2a2e39] bg-[#131722] px-3 py-3 text-xs font-semibold text-[#b2b5be]">
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-[#2a2e39] bg-[#0f0f0f] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#787b86]">Modules</div>
                  <div className="mt-3 space-y-2">
                    {FEATURE_CARDS.slice(0, 4).map((feature) => (
                      <button
                        key={feature.title}
                        type="button"
                        onClick={() => openFeature(feature.route)}
                        className="flex w-full items-center gap-3 rounded-lg border border-[#2a2e39] bg-[#131722] px-3 py-2 text-left text-xs text-[#b2b5be] transition hover:border-[#2962ff]/60 hover:text-[#f0f3fa]"
                      >
                        <span className="text-[#2962ff]">{feature.icon}</span>
                        {feature.title}
                      </button>
                    ))}
                  </div>
                </div>

                {liveRows.length > 0 && (
                  <div className="rounded-2xl border border-[#2a2e39] bg-[#0f0f0f] p-4">
                    <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[#787b86]">Live quotes</div>
                    <div className="space-y-2">
                      {liveRows.slice(0, 4).map((row) => {
                        const positive = row!.quote.changePercent >= 0;
                        return (
                          <button
                            key={row!.stock.symbol}
                            type="button"
                            onClick={() => setPage("company", row!.stock.symbol)}
                            className="flex w-full items-center justify-between rounded-lg bg-[#131722] px-3 py-2 text-left"
                          >
                            <span>
                              <span className="block text-xs font-semibold text-[#f0f3fa]">{row!.stock.symbol}</span>
                              <span className="block text-[10px] text-[#787b86]">{row!.stock.exchange}</span>
                            </span>
                            <span className="text-right">
                              <span className="block text-xs font-semibold text-[#f0f3fa]">{formatINR(row!.quote.price)}</span>
                              <span className="block text-[10px]" style={{ color: positive ? "#22ab94" : "#f23645" }}>
                                {formatPercent(row!.quote.changePercent)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-[#2a2e39] bg-[#131722]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 py-12 md:grid-cols-3 md:px-8">
          {[
            ["Coverage", "Indian equity universe routed through StockStory company pages"],
            ["Data policy", "Real quote previews only; unavailable data is hidden"],
            ["Product focus", "Research workflow over social trading noise"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[#2a2e39] bg-[#0f0f0f] p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#787b86]">{label}</div>
              <div className="mt-3 text-base font-semibold leading-7 text-[#f0f3fa]">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mb-10 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7da0ff]">Real app modules</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#f0f3fa] md:text-5xl">Features follow the data workflow.</h2>
          <p className="mt-4 text-sm leading-7 text-[#b2b5be]">
            These sections map to active product areas in StockStory. They are not decorative promises or prototype pages.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURE_CARDS.map((feature) => (
            <button
              key={feature.title}
              type="button"
              onClick={() => openFeature(feature.route)}
              className="group min-h-[210px] rounded-2xl border border-[#2a2e39] bg-[#131722] p-6 text-left transition hover:border-[#2962ff]/60 hover:bg-[#1e222d]"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-lg border border-[#2962ff]/30 bg-[#2962ff]/10 p-2 text-[#7da0ff]">{feature.icon}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#787b86]">{feature.eyebrow}</span>
              </div>
              <h3 className="mt-7 text-xl font-semibold tracking-tight text-[#f0f3fa]">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#b2b5be]">{feature.description}</p>
              <div className="mt-5 text-xs font-semibold text-[#7da0ff] group-hover:text-[#f0f3fa]">Open module</div>
            </button>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="overflow-hidden rounded-[28px] border border-[#2a2e39] bg-[#131722] p-8 md:p-12">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7da0ff]">Start with the real product</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#f0f3fa] md:text-5xl">
              Move from search to company intelligence without leaving the workflow.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#b2b5be]">
              Create an account to use protected research surfaces including dashboard, watchlist, portfolio, alerts, and company pages.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setPage("signup")}
              className="h-12 rounded-full bg-[#2962ff] px-7 text-sm font-semibold text-white transition hover:bg-[#1e53e5]"
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => setPage("login")}
              className="h-12 rounded-full border border-[#2a2e39] bg-[#0f0f0f] px-7 text-sm font-semibold text-[#f0f3fa] transition hover:bg-[#1e222d]"
            >
              Sign in
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PublicAboutPage;
