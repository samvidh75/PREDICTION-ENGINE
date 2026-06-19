import React from "react";
import { Database, FileSearch, Scale, ShieldCheck, Workflow, XCircle, ArrowRight, BookOpen, Eye, GitCompare, Search, Target, Users } from "lucide-react";
import {
  ProductAction,
  ProductHero,
  ProductPage,
  ProductPanel,
  ProductSection,
  ProductShell,
  ProductStatusPill,
  productNavigate,
} from "../components/product/ProductUI";

export const PublicAboutPage: React.FC = () => (
  <ProductShell>
    <ProductPage>
      <ProductHero
        eyebrow="About StockStory"
        title="AI research intelligence for Indian equity investors."
        body="StockStory India is a research workspace designed for investors who want structured, transparent analysis before making decisions. We are not a broker, not a trading terminal, and not a portfolio manager — we are the AI research layer between you and the market."
        actions={(
          <>
            <ProductAction onClick={() => productNavigate("signup")}>Start research</ProductAction>
            <ProductAction variant="secondary" onClick={() => productNavigate("methodology")}>Read research standards</ProductAction>
          </>
        )}
        aside={(
          <ProductPanel className="flex min-h-[240px] flex-col justify-between p-5 md:p-6">
            <div>
              <Scale className="h-5 w-5 text-[#2962FF]" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-[#E6EDF3]">Research-only operating principles</h2>
              <div className="mt-5 space-y-2">
                {[
                  "No buy, sell, hold, or trading advice.",
                  "No fabricated metrics, rankings, or signals.",
                  "No hiding what we don't know.",
                  "No broker execution or paywall-first product framing.",
                ].map((item) => (
                  <div key={item} className="flex gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-xs leading-5 text-[#9AA7B5]">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F59E0B]" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 pt-4">
              <ProductStatusPill tone="verified">Research only</ProductStatusPill>
            </div>
          </ProductPanel>
        )}
      />

      <ProductSection>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">What is StockStory?</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            StockStory is an AI-powered research assistant for Indian equity investors. It helps you discover, research, compare, and track companies — so you can make informed investment decisions through your broker with confidence.
          </p>
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">Why does it exist?</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            Indian investors are underserved by research tools. Existing options are either broker-specific (tied to execution), too academic (inaccessible), or too noisy (trading calls and tips). StockStory fills the gap: structured, transparent, research-first analysis that respects your intelligence.
          </p>
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">Who is it for?</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            Indian equity investors who want structured, transparent research before making a decision. Whether you are a DIY investor, a student of markets, or someone who wants to track a thesis over time — StockStory is built for you.
          </p>
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">User workflow</h2>
          <p className="mt-1 text-sm text-[#9AA7B5]">The core loop from discovery to execution.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            { icon: Search, title: "Discover", body: "Screen and scan Indian equities that match your investment criteria." },
            { icon: FileSearch, title: "Research", body: "Open any company page for scores, conviction context, and fundamental analysis." },
            { icon: GitCompare, title: "Compare", body: "Side-by-side peer comparison shows which stock fits your thesis better." },
            { icon: Eye, title: "Track", body: "Save companies to your watchlist and monitor score changes that affect your thesis." },
            { icon: ArrowRight, title: "Execute", body: "Take your research and invest through your broker — StockStory never handles your money." },
          ].map(({ icon: Icon, title, body }, i) => (
            <ProductPanel key={title} className="p-4">
              <span className="text-[10px] font-medium text-[#64748B]">{i + 1}.</span>
              <Icon className="mt-1 h-4 w-4 text-[#2962FF]" aria-hidden="true" />
              <h3 className="mt-2 text-sm font-semibold text-[#E6EDF3]">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">{body}</p>
            </ProductPanel>
          ))}
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">What unlocks after sign-in</h2>
          <p className="mt-1 text-sm text-[#9AA7B5]">Full research workspace access.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { title: "Full company research", body: "Scores, fundamentals, thesis, and risk factors for every researched company." },
            { title: "Rankings & scanner", body: "Browse and filter companies by strategy, sector, score, and fundamentals." },
            { title: "Watchlist & portfolio", body: "Track companies and monitor thesis changes over time." },
            { title: "Compare tool", body: "See factor-level comparisons between companies to decide which deserves more research." },
            { title: "Alerts & thesis tracking", body: "Get notified when a company's research signals change." },
            { title: "Invest context", body: "Review what the research engine knows before you continue to your broker." },
          ].map(({ title, body }) => (
            <ProductPanel key={title} className="p-4">
              <h3 className="text-sm font-semibold text-[#E6EDF3]">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">{body}</p>
            </ProductPanel>
          ))}
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">Broker-neutral execution model</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            StockStory does not execute trades, hold custody of funds, or have any affiliation with any broker. Our role ends when you decide to act. You take your research — scores, thesis, comparison context — and execute through your preferred broker. We never receive commissions, referral fees, or order flow.
          </p>
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">Research standards</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            Every score and signal in StockStory is derived from a consistent multi-factor framework using public data. We cite rationales, flag data limitations, and never fabricate metrics. Read the full <button onClick={() => productNavigate("methodology")} className="text-[#2962FF] hover:underline">Research Standards</button> for details on how scores are constructed and interpreted.
          </p>
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">What StockStory does not do</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            "Provide investment advice or recommendations to buy, sell, or hold securities.",
            "Fabricate data, scores, rankings, or any research output.",
            "Execute trades, hold custody, or handle your money in any way.",
            "Receive kickbacks, referral fees, or order flow from any broker.",
            "Provide real-time market data or act as a trading terminal.",
            "Guarantee outcomes or predict future stock performance.",
          ].map((item) => (
            <div key={item} className="flex gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-xs leading-5 text-[#9AA7B5]">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden="true" />
              {item}
            </div>
          ))}
        </div>
      </ProductSection>

      <ProductSection>
        <ProductPanel className="p-5 md:p-6">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#E6EDF3]">Ready to start researching?</h2>
              <p className="mt-1 text-sm text-[#9AA7B5]">Create an account to access the full StockStory research workspace.</p>
            </div>
            <ProductAction onClick={() => productNavigate("signup")}>
              Start research
            </ProductAction>
          </div>
        </ProductPanel>
      </ProductSection>
    </ProductPage>
  </ProductShell>
);

export default PublicAboutPage;
