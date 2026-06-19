import React from "react";
import { Search, BarChart3, BookOpen, Shield, ArrowRightLeft, Scale } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductStatusPill, productNavigate } from "../components/product/ProductUI";
import { EarlyAccessPanel } from "../components/share/EarlyAccessPanel";

const sections = [
  {
    icon: Search,
    title: "Research workflow",
    body: "StockStory applies a structured, multi-factor research framework to evaluate publicly traded companies. Each company is assessed across five core dimensions — Financial strength, Growth, Valuation context, Momentum, and Risk — using a consistent methodology. The goal is to surface a balanced, repeatable view of a company's fundamentals and market position."
  },
  {
    icon: BarChart3,
    title: "Conviction and research dimensions",
    body: "Each company is assigned an overall Research Score from 0 to 100 based on factors across our core dimensions:",
    subsections: [
      { label: "Financial strength", detail: "How efficiently the company generates returns on capital. Considers profitability, margins, and asset efficiency." },
      { label: "Growth", detail: "Revenue, earnings, and cash flow trajectory over time. Captures both historical trends and forward signals." },
      { label: "Valuation context", detail: "Pricing relative to earnings, book value, and cash yields. Contextualised against industry peers." },
      { label: "Momentum", detail: "Price trend strength and relative market performance." },
      { label: "Risk context", detail: "Leverage, cash buffers, accounting consistency, and price volatility that may affect the thesis." },
      { label: "Conviction", detail: "Reflects the breadth and consistency of information behind the overall thesis. Higher conviction means more dimensions were evaluated." },
    ]
  },
  {
    icon: Shield,
    title: "Research is not a recommendation",
    body: "StockStory is a research-only workspace. We do not provide Buy, Sell, or Hold recommendations, nor do we suggest target prices or guaranteed returns. Investment decisions require personal context, risk tolerance, and individual financial goals. Our mission is to equip you with objective, multi-factor analysis and clear risk tracking, so that you can make your own informed decisions."
  },
  {
    icon: BookOpen,
    title: "What thesis tracking means",
    body: "Tracking a thesis means saving a company to your watchlist so you can monitor changes over time. StockStory helps you identify when scores move, risk factors change, or valuation context shifts — so you know when it is time to review your reasoning. Thesis tracking is a research aid, not a portfolio management system."
  },
  {
    icon: ArrowRightLeft,
    title: "Why compare matters",
    body: "Compare allows you to look at peer companies side-by-side on the exact same multi-factor dimensions, helping you see where one business excels or poses a higher relative risk. This neutral, standardised comparison helps remove emotional bias from your research and focuses your attention on verified metrics."
  },
  {
    icon: Shield,
    title: "Handling of partial information",
    body: "When certain financial fields are not available or not applicable, StockStory omits them quietly to present a clean, un-fabricated view rather than using generic filler text. The overall score adjusts automatically to represent the information available."
  },
  {
    icon: ArrowRightLeft,
    title: "Broker handoff philosophy",
    body: "StockStory is a research platform, not a brokerage. All order placement and execution occur through your registered broker. StockStory never stores, processes, or accesses your broker credentials. The Invest handoff prepares your research summary, but the final decision and action remain yours. This separation keeps research objective and free from execution conflicts."
  },
  {
    icon: Scale,
    title: "Compliance statement",
    body: "StockStory provides research, analysis, and educational content. Nothing on this platform constitutes investment advice, a recommendation, or solicitation to buy or sell securities. All investment decisions should be made with the advice of a qualified financial professional."
  }
];

export const TrustCentrePage: React.FC = () => {
  return (
    <ProductShell>
      <ProductPage>
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[#E6EDF3]">How StockStory Thinks</h1>
          </div>
          <p className="mt-1 text-xs text-[#9AA7B5]">Research methodology — how we evaluate businesses and how to use the product responsibly.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ProductAction onClick={() => productNavigate("rankings")}>View rankings</ProductAction>
            <ProductAction onClick={() => productNavigate("about")} variant="secondary">Read mission</ProductAction>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {sections.map((section) => (
            <ProductPanel key={section.title} className="p-5 md:p-6" as="section">
              <div className="flex items-start gap-3">
                <section.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2962FF]" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">{section.title}</h2>
                  {section.body && (
                    <p className="mt-2 text-xs leading-relaxed text-[#9AA7B5]">{section.body}</p>
                  )}
                  {section.subsections && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {section.subsections.map((sub) => (
                        <div key={sub.label} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                          <h3 className="text-xs font-semibold text-[#E6EDF3]">{sub.label}</h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#9AA7B5]">{sub.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ProductPanel>
          ))}
        </div>

        <ProductPanel className="mt-4 p-5 md:p-6" as="section">
          <div className="flex flex-wrap gap-2">
            <ProductStatusPill tone="blue">Research workspace</ProductStatusPill>
            <ProductStatusPill tone="verified">Transparent methodology</ProductStatusPill>
            <ProductStatusPill tone="blue">Structured factor view</ProductStatusPill>
            <ProductStatusPill tone="blue">Compare systematically</ProductStatusPill>
          </div>
        </ProductPanel>

        <div className="mt-8 space-y-4">
          <EarlyAccessPanel />
        </div>

        <div className="mt-8 border-t border-[rgba(148,163,184,0.16)] pt-6">
          <p className="text-[10px] leading-relaxed text-[#64748B]">
            StockStory provides research, analysis, and educational content. This is not investment advice.
          </p>
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default TrustCentrePage;
