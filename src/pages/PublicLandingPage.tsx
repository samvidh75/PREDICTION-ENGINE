import React, { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Eye, FileSearch, GitCompare, RefreshCw, Scale, Search, ShieldCheck, Target, Users } from "lucide-react";
import {
  ProductAction,
  ProductHero,
  ProductIntegrityRow,
  ProductPage,
  ProductPanel,
  ProductSection,
  ProductShell,
  productNavigate,
} from "../components/product/ProductUI";
import { EarlyAccessPanel } from "../components/share/EarlyAccessPanel";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";
import { runCompanyDataPipeline } from "../services/data/CompanyDataPipeline";
import type { PipelineResult } from "../services/data/CompanyDataPipeline";
import ScoreRing from "../components/ui/ScoreRing";
import ClassificationBadge from "../components/ui/ClassificationBadge";

const steps = [
  { icon: Search, title: "Discover opportunities", body: "Screen and scan Indian equities that match your investment criteria." },
  { icon: FileSearch, title: "Research a company", body: "Open any company page for scores, conviction context, and fundamental analysis." },
  { icon: GitCompare, title: "Compare alternatives", body: "Side-by-side peer comparison shows which stock fits your thesis better." },
  { icon: Eye, title: "Track thesis changes", body: "Save companies to your watchlist and monitor score changes that affect your thesis." },
  { icon: ArrowRight, title: "Continue through your broker", body: "Take your research and invest through your broker — StockStory never handles your money." },
];

const differentiators = [
  { icon: ShieldCheck, title: "Research-driven, not broker-dependent", body: "StockStory is independent. No commissions, no referrals, no order flow. Just research." },
  { icon: BookOpen, title: "Transparent methodology", body: "Every score has a cited rationale. You can see why a company scores what it scores." },
  { icon: Scale, title: "Compare before you decide", body: "Side-by-side peer comparison shows you the trade-offs before you commit capital." },
  { icon: Target, title: "Thesis tracking", body: "Watchlist and portfolio tools help you monitor your thesis and know when your reasoning needs updating." },
  { icon: Users, title: "Built for Indian equity investors", body: "Designed specifically for investors who research Indian stocks. From discovery to broker handoff." },
];

const PREVIEW_SYMBOLS = ["TCS", "RELIANCE", "INFY"];

function scoreColor(v: number | null): string {
  if (v === null) return "#94A3B8";
  if (v >= 70) return "#16A34A";
  if (v >= 55) return "#22C55E";
  if (v >= 40) return "#92400E";
  if (v >= 25) return "#FB923C";
  return "#EF4444";
}

function MiniScoreRing({ score }: { score: number | null }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const fill = score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const color = scoreColor(score);
  return (
    <svg width={40} height={40} viewBox="0 0 40 40">
      <circle cx={20} cy={20} r={r} fill="none" stroke="#E2E8F0" strokeWidth={5} />
      <circle cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)}
        strokeLinecap="round" transform="rotate(-90 20 20)" />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize="10" fontWeight="700" fill={color}>
        {score !== null ? Math.round(score) : "—"}
      </text>
    </svg>
  );
}

export function RealScoresPanel(): JSX.Element {
  const [results, setResults] = useState<Record<string, PipelineResult | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(PREVIEW_SYMBOLS.map(s => runCompanyDataPipeline(s))).then(settled => {
      if (cancelled) return;
      const map: Record<string, PipelineResult | null> = {};
      PREVIEW_SYMBOLS.forEach((s, i) => {
        map[s] = settled[i].status === "fulfilled" ? settled[i].value : null;
      });
      setResults(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative rounded-[24px] border border-[#E2E8F0] bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,.10)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#64748B]">Live Research Scores</p>
        <span className="text-[9px] text-[#94A3B8]">Nifty 50 · Multi-factor</span>
      </div>
      <div className="space-y-3">
        {PREVIEW_SYMBOLS.map(sym => {
          const r = results[sym];
          const score = r?.prediction?.rankingScore ?? null;
          const name = r?.companyName ?? sym;
          const price = r?.price.current;
          const change = r?.price.change;
          return (
            <div key={sym} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9]">
              {loading ? (
                <div className="w-10 h-10 flex items-center justify-center"><RefreshCw className="h-4 w-4 text-[#94A3B8] animate-spin" /></div>
              ) : (
                <MiniScoreRing score={score} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-[#1E293B]">{sym}</span>
                  <span className="text-[10px] text-[#64748B] truncate">{name !== sym ? name : ""}</span>
                </div>
                {price !== null && price !== undefined && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-semibold tabular-nums text-[#1E293B]">
                      ₹{price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    {change !== null && change !== undefined && (
                      <span className={`text-[10px] font-semibold tabular-nums ${change >= 0 ? "text-[#16A34A]" : "text-[#EF4444]"}`}>
                        {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => productNavigate("scanner")}
                className="text-[10px] font-semibold text-[#2962FF] hover:underline shrink-0"
              >
                Research →
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[9px] text-[#94A3B8] text-center">For educational purposes only. Not investment advice.</p>
    </div>
  );
}

/** @deprecated Use RealScoresPanel */
export function MarketIntelligenceVisual(): JSX.Element {
  const leaders = [["TCS", 84, "EXCELLENT"], ["HDFCBANK", 78, "HEALTHY"], ["RELIANCE", 72, "HEALTHY"]] as const;
  return <div data-testid="market-intelligence-visual" className="min-h-[320px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-blue-context)] md:min-h-[340px] md:p-6">
    <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Nifty 50 Today</p><p className="mt-2 text-2xl font-bold text-slate-950">24,856.50</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">+0.62%</span></div>
    <div className="mt-5 space-y-2.5">{leaders.map(([symbol, score, classification]) => <button key={symbol} type="button" onClick={() => productNavigate("stock", symbol)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"><ScoreRing score={score} size="sm" /><span className="min-w-0 flex-1"><strong className="block font-mono text-sm text-slate-950">{symbol}</strong><small className="text-slate-500">Top scanner score</small></span><ClassificationBadge classification={classification} /></button>)}</div>
    <button type="button" onClick={() => productNavigate("scanner")} className="mt-5 text-sm font-bold text-blue-600">View all →</button>
  </div>;
}

export const PublicLandingPage: React.FC = () => {
  return (
    <ProductShell>
      <SebiDisclaimer variant="banner" />
      <ProductPage>
        <ProductHero
          eyebrow="AI research for Indian equities"
          title="Understand the stock before you invest."
          body="For Indian equity investors who want clearer research. Search companies, review scores, compare peers, track your thesis, then continue through your broker. StockStory is the AI research layer between you and the market."
          actions={(
            <>
              <ProductAction id="hero-cta-start" onClick={() => productNavigate("scanner")}>Start research</ProductAction>
              <ProductAction id="hero-cta-rankings" variant="secondary" onClick={() => productNavigate("scanner")}>View scanner</ProductAction>
              <ProductAction id="hero-cta-rankings-public" variant="secondary" onClick={() => productNavigate("scanner")}>View public rankings →</ProductAction>
              <ProductAction id="hero-cta-methodology" variant="secondary" onClick={() => productNavigate("methodology")}>Methodology</ProductAction>
              <ProductAction id="hero-cta-public-rankings" variant="secondary" onClick={() => productNavigate("rankings")}>View public rankings</ProductAction>
            </>
          )}
          aside={<RealScoresPanel />}
        />

        <SebiDisclaimer variant="banner" />

        <ProductSection>
          <div className="relative mb-5 overflow-hidden rounded-[22px] border border-blue-100/80 bg-[linear-gradient(120deg,rgba(239,246,255,.9),rgba(255,255,255,.82))] p-5 shadow-[0_16px_38px_rgba(30,64,175,.07)]">
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-[22px]" style={{ backgroundColor: "#2962FF" }} />
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)]">Who it is for:</strong> Indian equity investors who want structured, transparent research before making a decision. Not a broker, not a trading terminal, not a portfolio manager — a research tool.
            </p>
          </div>
        </ProductSection>

        <ProductSection>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">How StockStory works</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Five steps from discovery to execution.</p>
            </div>
            <ProductIntegrityRow />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 [perspective:1200px]">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <ProductPanel key={title} className="group relative min-h-[190px] overflow-hidden rounded-[22px] p-5 shadow-[0_16px_36px_rgba(15,23,42,.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(30,64,175,.13)]">
                <span className="absolute right-4 top-4 font-mono text-[10px] font-semibold text-[#94A3B8]">0{i + 1}</span>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600 shadow-[inset_0_0_0_1px_rgba(41,98,255,.08)]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <h3 className="mt-5 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">{body}</p>
              </ProductPanel>
            ))}
          </div>
        </ProductSection>

        <ProductSection>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Key differentiators</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">What makes StockStory different.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {differentiators.map(({ icon: Icon, title, body }) => (
              <ProductPanel key={title} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(41,98,255,0.1)]">
                    <Icon className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">{body}</p>
                  </div>
                </div>
              </ProductPanel>
            ))}
          </div>
        </ProductSection>

        <ProductSection>
          <ProductPanel className="p-5 md:p-6">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Research Standards &amp; Methodology</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                  We evaluate Indian equities using a consistent multi-factor framework. Every score is derived from public data with transparent rationale. No black boxes, no fabricated metrics.
                </p>
              </div>
              <ProductAction id="onboarding-cta-about" variant="ghost" onClick={() => productNavigate("about")}>
                About StockStory
              </ProductAction>
              <ProductAction id="methodology-cta" variant="secondary" onClick={() => productNavigate("methodology")}>
                Read the methodology
              </ProductAction>
            </div>
          </ProductPanel>
        </ProductSection>

        <ProductSection>
          <EarlyAccessPanel />
        </ProductSection>

        <footer className="mt-8 border-t border-[rgba(148,163,184,0.12)] py-6">
          <SebiDisclaimer variant="footer" className="!border-0 !bg-transparent !p-0" />
          <div className="mt-3 flex gap-4 text-xs">
            <button type="button" onClick={() => productNavigate("terms")} className="text-[#64748B] hover:text-[#9AA7B5] transition-colors underline underline-offset-2">Terms & Disclosures</button>
            <button type="button" onClick={() => productNavigate("methodology")} className="text-[#64748B] hover:text-[#9AA7B5] transition-colors underline underline-offset-2">Research Standards</button>
          </div>
          <div className="mt-4">
            <SebiDisclaimer variant="inline" />
          </div>
        </footer>
      </ProductPage>
    </ProductShell>
  );
};

export default PublicLandingPage;
