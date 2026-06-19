import React from "react";
import { ArrowRight, BookOpen, Eye, FileSearch, GitCompare, Scale, Search, ShieldCheck, Target, Users } from "lucide-react";
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

export const PublicLandingPage: React.FC = () => {
  return (
    <ProductShell>
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
          aside={(
            <ProductPanel className="flex min-h-[180px] flex-col justify-between p-5 md:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-[rgba(148,163,184,0.12)] pb-4">
                <span className="text-sm font-semibold text-[#E6EDF3]">Research standards</span>
              </div>
              <div className="mt-4 grid gap-2">
                {[
                  { label: "Approach", value: "Research-driven" },
                  { label: "Framework", value: "Multi-factor" },
                  { label: "Universe", value: "Indian equities" },
                  { label: "Status", value: "Research, not advice" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-3 py-2">
                    <span className="text-[11px] font-medium text-[#64748B]">{item.label}</span>
                    <span className="text-xs font-semibold text-[#E6EDF3]">{item.value}</span>
                  </div>
                ))}
              </div>
            </ProductPanel>
          )}
        />

        <ProductSection>
          <div className="mb-5 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(41,98,255,0.04)] p-4">
            <p className="text-xs leading-relaxed text-[#9AA7B5]">
              <strong className="text-[#E6EDF3]">Who it is for:</strong> Indian equity investors who want structured, transparent research before making a decision. Not a broker, not a trading terminal, not a portfolio manager — a research tool.
            </p>
          </div>
        </ProductSection>

        <ProductSection>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#E6EDF3]">How StockStory works</h2>
              <p className="mt-1 text-sm text-[#9AA7B5]">Five steps from discovery to execution.</p>
            </div>
            <ProductIntegrityRow />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <ProductPanel key={title} className="relative p-4">
                <span className="absolute right-3 top-3 text-[10px] font-medium text-[#64748B]">{i + 1}</span>
                <Icon className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#9AA7B5]">{body}</p>
              </ProductPanel>
            ))}
          </div>
        </ProductSection>

        <ProductSection>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#E6EDF3]">Key differentiators</h2>
            <p className="mt-1 text-sm text-[#9AA7B5]">What makes StockStory different.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {differentiators.map(({ icon: Icon, title, body }) => (
              <ProductPanel key={title} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(41,98,255,0.1)]">
                    <Icon className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[#E6EDF3]">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[#9AA7B5]">{body}</p>
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
            StockStory provides research and analysis for informational purposes only. It is not financial advice, a recommendation, or a solicitation of any kind. Past performance does not indicate future results. Always do your own research and consult a licensed financial advisor before making investment decisions. StockStory does not execute trades, custody funds, or have any affiliation with any broker. Information may contain errors or omissions.
          </p>
        </footer>
      </ProductPage>
    </ProductShell>
  );
};

export default PublicLandingPage;
