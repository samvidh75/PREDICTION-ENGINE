import React from "react";
import { ArrowRight, BookOpen, Eye, FileSearch, GitCompare, Scale, Search, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
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
import FeatureWelcomeTour from "../components/onboarding/FeatureWelcomeTour";

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

export function MarketIntelligenceVisual(): JSX.Element {
  return <div data-testid="market-intelligence-visual" className="relative min-h-[320px] overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(145deg,rgba(255,255,255,.94),rgba(238,244,255,.76))] p-5 shadow-[var(--shadow-blue-context)] backdrop-blur-[18px] md:min-h-[340px] md:p-6">
    <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#8B5CF6]/10 blur-3xl" /><div className="absolute -bottom-14 -left-12 h-48 w-48 rounded-full bg-[#2962FF]/10 blur-3xl" /><div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(41,98,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(41,98,255,.06)_1px,transparent_1px)] [background-size:28px_28px]" />
    <div className="relative flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Research intelligence</p><h2 className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">A clearer market picture</h2></div><span className="rounded-full border border-[#2962FF]/15 bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-[#2962FF] shadow-sm">Structured context</span></div>
    <div className="relative mx-auto mt-8 max-w-[390px]"><div className="absolute inset-x-7 top-4 h-[188px] rotate-3 rounded-[24px] border border-[#8B5CF6]/15 bg-white/55 shadow-lg" /><div className="absolute inset-x-3 top-2 h-[194px] -rotate-2 rounded-[24px] border border-[#2962FF]/15 bg-white/70 shadow-lg" /><div className="relative rounded-[24px] border border-white bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,.14)]"><div className="flex items-start justify-between"><div><p className="font-mono text-xs font-semibold tracking-[0.12em] text-[var(--color-text-secondary)]">COMPANY LENS</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">Quality · risk · valuation</p></div><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2962FF]/10"><Sparkles className="h-5 w-5 text-[#2962FF]" /></div></div><svg className="mt-5 h-16 w-full" viewBox="0 0 320 64" role="img" aria-label="Abstract research signal line"><defs><linearGradient id="signal" x1="0" x2="1"><stop stopColor="#2962FF"/><stop offset="1" stopColor="#8B5CF6"/></linearGradient></defs><path d="M2 49 C32 47 42 35 67 38 S105 50 130 29 S168 14 190 25 S230 45 254 25 S288 18 318 7" fill="none" stroke="url(#signal)" strokeWidth="3" strokeLinecap="round"/><path d="M2 49 C32 47 42 35 67 38 S105 50 130 29 S168 14 190 25 S230 45 254 25 S288 18 318 7 L318 64 L2 64Z" fill="url(#signal)" opacity=".08"/></svg><div className="mt-3 grid grid-cols-3 gap-2">{["Research", "Track", "Compare"].map((item) => <div key={item} className="rounded-xl border border-[var(--color-border)] bg-slate-50/75 px-2 py-2 text-center text-[10px] font-semibold text-[var(--color-text-secondary)]">{item}</div>)}</div></div><div className="absolute -bottom-5 -right-2 rounded-2xl border border-emerald-200/70 bg-white/95 px-3 py-2 shadow-[var(--shadow-green-context)]"><p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700">Thesis context</p><p className="mt-1 text-xs font-semibold text-[var(--color-text-primary)]">Evidence, organized</p></div></div>
  </div>;
}

export const PublicLandingPage: React.FC = () => {
  return (
    <ProductShell>
      <FeatureWelcomeTour />
      <ProductPage>
        <ProductHero
          eyebrow="AI research for Indian equities"
          title="Understand the stock before you invest."
          body="For Indian equity investors who want clearer research. Search companies, review scores, compare peers, track your thesis, then continue through your broker. StockStory is the AI research layer between you and the market."
          actions={(
            <>
              <ProductAction id="hero-cta-start" onClick={() => productNavigate("signup")}>Start research</ProductAction>
              <ProductAction id="hero-cta-rankings" variant="secondary" onClick={() => productNavigate("scanner")}>View scanner</ProductAction>
              <ProductAction id="hero-cta-methodology" variant="secondary" onClick={() => productNavigate("methodology")}>Methodology</ProductAction>
            </>
          )}
          aside={<MarketIntelligenceVisual />}
        />

        <ProductSection>
          <div className="relative mb-5 overflow-hidden rounded-[22px] border border-blue-100/80 bg-[linear-gradient(120deg,rgba(239,246,255,.9),rgba(255,255,255,.82))] p-5 shadow-[0_16px_38px_rgba(30,64,175,.07)]">
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-violet-500" />
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
                <h2 className="text-lg font-semibold text-[#E6EDF3]">Research Standards &amp; Methodology</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#9AA7B5]">
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
          <p className="text-xs leading-5 text-[#64748B]">
            StockStory provides research and analysis for informational purposes only. It is not financial advice, a recommendation, or a solicitation of any kind. Always do your own research before making investment decisions. StockStory does not execute trades, custody funds, or have any affiliation with any broker.
          </p>
          <div className="mt-3 flex gap-4 text-xs">
            <button type="button" onClick={() => productNavigate("terms")} className="text-[#64748B] hover:text-[#9AA7B5] transition-colors underline underline-offset-2">Terms & Disclosures</button>
            <button type="button" onClick={() => productNavigate("methodology")} className="text-[#64748B] hover:text-[#9AA7B5] transition-colors underline underline-offset-2">Research Standards</button>
          </div>
        </footer>
      </ProductPage>
    </ProductShell>
  );
};

export default PublicLandingPage;
