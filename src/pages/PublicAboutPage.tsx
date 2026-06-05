import React, { useMemo } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Eye,
  LineChart,
  Lock,
  Radar,
  Search,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
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
    title: "Universal stock search",
    eyebrow: "Discovery",
    description: "Search by ticker or company name and move straight into a company intelligence page.",
    route: "search",
    icon: <Search className="h-4 w-4" />,
  },
  {
    title: "Company intelligence pages",
    eyebrow: "Research",
    description: "Open a focused company view built around market data, business context, notes, and related companies.",
    route: "company",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    title: "Live quote gateway",
    eyebrow: "Market data",
    description: "Show live quote data only when the API returns a valid price, so the interface never has to invent numbers.",
    route: "company",
    icon: <LineChart className="h-4 w-4" />,
  },
  {
    title: "Watchlist command layer",
    eyebrow: "Tracking",
    description: "Keep companies close, revisit research quickly, and open any ticker into the same stock route.",
    route: "watchlist",
    icon: <Eye className="h-4 w-4" />,
  },
  {
    title: "Portfolio workspace",
    eyebrow: "Holdings",
    description: "Track holdings in the same system that handles company research, alerts, and market discovery.",
    route: "portfolio",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    title: "Alert centre",
    eyebrow: "Monitoring",
    description: "Bring important follow-up prompts into one surface instead of scattered reminders.",
    route: "alerts",
    icon: <Bell className="h-4 w-4" />,
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

function NeonFrame({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="relative ss-tv-terminal-glow">
      <div className="absolute -inset-[1px] rounded-[32px] bg-[linear-gradient(135deg,rgba(41,98,255,0.9),rgba(34,171,148,0.55),rgba(143,92,255,0.8),rgba(242,54,69,0.55))] opacity-70 blur-sm" />
      <div className="absolute -inset-12 rounded-[44px] bg-[radial-gradient(circle_at_20%_20%,rgba(41,98,255,0.34),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(143,92,255,0.26),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(34,171,148,0.22),transparent_38%)] blur-3xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#080a0f]/95 shadow-[0_0_80px_rgba(41,98,255,0.18),0_0_120px_rgba(143,92,255,0.12)]">
        {children}
      </div>
    </div>
  );
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
      const firstLive = liveRows[0]?.stock.symbol ?? featuredStocks[0]?.symbol;
      setPage(firstLive ? "company" : "login", firstLive);
      return;
    }
    setPage(route);
  };

  return (
    <main className="ss-tv-app ss-tv-stage relative min-h-screen overflow-x-hidden bg-[#05070d] text-[#f0f3fa] font-sans antialiased">
      <TopNav />
      <MobileNav />
      <div className="ss-tv-giant-word">markets</div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,123,134,0.13)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,123,134,0.10)_1px,transparent_1px)] bg-[size:78px_78px] opacity-35" />
        <div className="absolute left-[-20%] top-[-16%] h-[560px] w-[560px] rounded-full bg-[#2962ff]/25 blur-[120px]" />
        <div className="absolute right-[-18%] top-[7%] h-[520px] w-[520px] rounded-full bg-[#8f5cff]/22 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[28%] h-[420px] w-[420px] rounded-full bg-[#22ab94]/16 blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.09),transparent_52%)]" />
      </div>

      <section className="relative z-10 mx-auto grid min-h-[860px] w-full max-w-7xl grid-cols-1 items-center gap-14 px-5 pb-24 pt-32 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:pt-36">
        <div className="pt-8 text-center lg:text-left">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b7c8ff] shadow-[0_0_34px_rgba(41,98,255,0.18)] backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-[#7da0ff]" />
            StockStory India market terminal
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[0.96] tracking-tight text-white md:text-7xl xl:text-8xl lg:mx-0">
            Track Indian companies like a premium market desk.
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#c4c7d0] md:text-lg lg:mx-0">
            StockStory India is a premium research workspace for Indian equities. Search companies, inspect live market data, build watchlists, monitor portfolios, and turn raw company information into a cleaner decision workflow.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <button
              type="button"
              onClick={() => setPage("signup")}
              className="h-[52px] rounded-full bg-[#2962ff] px-8 text-sm font-bold text-white shadow-[0_0_34px_rgba(41,98,255,0.45)] transition hover:bg-[#1e53e5]"
            >
              Launch StockStory
            </button>
            <button
              type="button"
              onClick={() => setPage("login")}
              className="h-[52px] rounded-full border border-white/12 bg-white/[0.045] px-8 text-sm font-bold text-[#f0f3fa] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/[0.08]"
            >
              Sign in
            </button>
          </div>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3 lg:mx-0">
            {[
              ["Built for", "Indian equities"],
              ["Interface", "Charts, lists, alerts"],
              ["Data rule", "Real or hidden"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#787b86]">{label}</div>
                <div className="mt-2 text-sm font-bold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <NeonFrame>
          <div className="ss-tv-chart-toolbar px-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#f23645] shadow-[0_0_16px_rgba(242,54,69,0.75)]" />
              <span className="h-3 w-3 rounded-full bg-[#f0b90b] shadow-[0_0_16px_rgba(240,185,11,0.65)]" />
              <span className="h-3 w-3 rounded-full bg-[#22ab94] shadow-[0_0_16px_rgba(34,171,148,0.75)]" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#787b86]">StockStory workspace</div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_230px]">
            <div className="ss-tv-chart-terminal rounded-lg p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#787b86]">NSE company intelligence</div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-white">Reliance Industries</div>
                </div>
                <div className="rounded-lg border border-[#2962ff]/35 bg-[#2962ff]/12 p-3 text-[#9bb5ff] shadow-[0_0_28px_rgba(41,98,255,0.22)]">
                  <Radar className="h-5 w-5" />
                </div>
              </div>

              <div className="relative h-[280px] overflow-hidden rounded-xl border border-white/10 bg-[#05070d]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,123,134,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,123,134,0.13)_1px,transparent_1px)] bg-[size:54px_54px]" />
                <svg viewBox="0 0 760 330" className="absolute inset-0 h-full w-full" role="img" aria-label="StockStory premium chart preview">
                  <defs>
                    <linearGradient id="rgbFillBlue" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2962ff" stopOpacity="0.42" />
                      <stop offset="100%" stopColor="#2962ff" stopOpacity="0" />
                    </linearGradient>
                    <filter id="chartGlow">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path d="M0 236 L72 218 L130 230 L198 158 L270 176 L344 102 L420 132 L508 82 L592 96 L668 48 L760 64 L760 330 L0 330 Z" fill="url(#rgbFillBlue)" />
                  <path d="M0 236 L72 218 L130 230 L198 158 L270 176 L344 102 L420 132 L508 82 L592 96 L668 48 L760 64" fill="none" stroke="#2962ff" strokeWidth="5" filter="url(#chartGlow)" />
                  <path d="M0 260 L90 238 L170 252 L250 212 L330 226 L412 188 L500 204 L590 156 L680 172 L760 142" fill="none" stroke="#22ab94" strokeWidth="2.5" opacity="0.82" />
                  <path d="M0 196 L78 202 L150 174 L230 186 L312 148 L390 162 L468 124 L548 136 L628 108 L760 118" fill="none" stroke="#8f5cff" strokeWidth="2.5" opacity="0.82" />
                </svg>

                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3">
                  {["Quality", "Valuation", "Risk"].map((label, index) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-black/35 p-3 backdrop-blur-xl">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[#787b86]">{label}</div>
                      <div className="mt-2 h-2 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${index === 0 ? 72 : index === 1 ? 54 : 38}%`,
                            background: index === 2 ? "#f23645" : index === 1 ? "#8f5cff" : "#22ab94",
                            boxShadow: `0 0 18px ${index === 2 ? "rgba(242,54,69,0.55)" : index === 1 ? "rgba(143,92,255,0.55)" : "rgba(34,171,148,0.55)"}`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {["Search", "Watchlist", "Portfolio", "Alerts"].map((label) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-xs font-bold text-[#c4c7d0]">
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="ss-tv-chart-terminal rounded-lg p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#787b86]">Live rail</div>
                  <Lock className="h-3.5 w-3.5 text-[#7da0ff]" />
                </div>

                {liveRows.length > 0 ? (
                  <div className="space-y-2">
                    {liveRows.slice(0, 4).map((row) => {
                      const positive = row!.quote.changePercent >= 0;
                      return (
                        <button
                          key={row!.stock.symbol}
                          type="button"
                          onClick={() => setPage("company", row!.stock.symbol)}
                          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-left transition hover:border-[#2962ff]/45"
                        >
                          <span>
                            <span className="block text-xs font-black text-white">{row!.stock.symbol}</span>
                            <span className="block text-[10px] text-[#787b86]">{row!.stock.exchange}</span>
                          </span>
                          <span className="text-right">
                            <span className="block text-xs font-bold text-white">{formatINR(row!.quote.price)}</span>
                            <span className="block text-[10px] font-bold" style={{ color: positive ? "#22ab94" : "#f23645" }}>
                              {formatPercent(row!.quote.changePercent)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-xs leading-6 text-[#9ca3af]">
                    Live quote previews appear here only when the market-data API returns valid prices.
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-[linear-gradient(145deg,rgba(41,98,255,0.16),rgba(143,92,255,0.12),rgba(34,171,148,0.08))] p-4 shadow-[0_0_34px_rgba(41,98,255,0.12)]">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b7c8ff]">
                  <Zap className="h-3.5 w-3.5" />
                  Premium signal layer
                </div>
                <p className="mt-3 text-sm leading-6 text-white/82">
                  Built to feel like a serious market desk for real Indian company research.
                </p>
              </div>
            </div>
          </div>
        </NeonFrame>
      </section>

      <section className="relative z-10 border-y border-white/10 bg-white/[0.035] backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-5 py-12 md:grid-cols-3 md:px-8">
          {[
            ["Market coverage", "Indian company research surfaces connected to app routes"],
            ["Data integrity", "Real quote data appears only after valid API responses"],
            ["Premium workflow", "Search, watchlists, portfolios, alerts, and research in one flow"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-[#080a0f]/85 p-6 shadow-[0_0_40px_rgba(41,98,255,0.08)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7da0ff]">{label}</div>
              <div className="mt-3 text-lg font-black leading-7 text-white">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-24 md:px-8">
        <div className="mb-12 max-w-3xl">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7da0ff]">What StockStory India is building</div>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">A market operating system for research-first investors.</h2>
          <p className="mt-5 text-base leading-8 text-[#b2b5be]">
            The product should feel powerful because the workflow is powerful: start with search, inspect companies, track what matters, and keep portfolio decisions inside a clean market interface.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURE_CARDS.map((feature) => (
            <button
              key={feature.title}
              type="button"
              onClick={() => openFeature(feature.route)}
                className="group relative min-h-[230px] overflow-hidden rounded-lg border border-white/10 bg-[#080a0f] p-6 text-left shadow-[0_0_44px_rgba(41,98,255,0.08)] transition hover:-translate-y-1 hover:border-[#2962ff]/60 hover:shadow-[0_0_60px_rgba(41,98,255,0.18)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(41,98,255,0.22),transparent_36%),radial-gradient(circle_at_90%_100%,rgba(143,92,255,0.16),transparent_36%)] opacity-80" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg border border-[#2962ff]/35 bg-[#2962ff]/12 p-3 text-[#9bb5ff] shadow-[0_0_24px_rgba(41,98,255,0.18)]">{feature.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#787b86]">{feature.eyebrow}</span>
                </div>
                <h3 className="mt-8 text-2xl font-black tracking-tight text-white">{feature.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#b2b5be]">{feature.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#7da0ff] group-hover:text-white">
                  Open module
                  <Activity className="h-3.5 w-3.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-28 md:px-8">
        <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#080a0f] p-8 shadow-[0_0_90px_rgba(41,98,255,0.16)] md:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(41,98,255,0.22),transparent_34%),radial-gradient(circle_at_90%_30%,rgba(143,92,255,0.18),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(34,171,148,0.16),transparent_38%)]" />
          <div className="relative max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#b7c8ff]">
              <BarChart3 className="h-3.5 w-3.5" />
              Designed to market the product, not just explain it
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              StockStory India should feel like opening a premium market terminal for Indian companies.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#c4c7d0]">
              Create an account to enter the full workspace: dashboard, search, company intelligence, watchlist, portfolio, and alerts.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setPage("signup")}
                className="h-[52px] rounded-full bg-white px-8 text-sm font-black text-black shadow-[0_0_34px_rgba(255,255,255,0.24)] transition hover:bg-[#dbe6ff]"
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => setPage("login")}
                className="h-[52px] rounded-full border border-white/12 bg-white/[0.045] px-8 text-sm font-black text-white transition hover:bg-white/[0.08]"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PublicAboutPage;
