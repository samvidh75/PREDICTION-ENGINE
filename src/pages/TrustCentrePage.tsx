import React from "react";
import { Search, BarChart3, BookOpen, Shield, ArrowRightLeft, Scale } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductStatusPill, productNavigate } from "../components/product/ProductUI";

const sections = [
  {
    icon: Search,
    title: "How StockStory Evaluates Companies",
    body: "StockStory applies a structured, multi-factor research framework to evaluate publicly traded companies. Each company is assessed across five core dimensions — Quality, Growth, Valuation, Momentum, and Risk — using a consistent methodology. The goal is to surface a balanced, repeatable view of a company's fundamentals and market position. Every score is derived from available data with known provenance. Where information is insufficient to form a judgment, the score reflects that limitation rather than manufacturing an estimate."
  },
  {
    icon: BarChart3,
    title: "What the Scores Mean",
    body: null,
    subsections: [
      { label: "Quality", detail: "Measures how efficiently a company generates returns on its capital. Considers profitability, margins, and asset efficiency." },
      { label: "Growth", detail: "Evaluates revenue, earnings, and cash flow trajectory over time. Captures both historical trends and forward-looking signals." },
      { label: "Valuation", detail: "Reviews pricing relative to earnings, book value, and cash yields. Contextualised against industry peers." },
      { label: "Momentum", detail: "Assesses price trend strength and relative market performance using a structured signal framework." },
      { label: "Risk", detail: "Monitors financial leverage, cash buffers, accounting consistency, and price volatility to flag potential concerns." },
      { label: "Confidence", detail: "Reflects the breadth and consistency of data behind the overall thesis. Higher confidence means more dimensions were evaluated with reliable information." },
    ]
  },
  {
    icon: BookOpen,
    title: "How to Use This Research",
    body: "Research scores are designed to help you understand, compare, and review companies more systematically. Use them as a starting point for your own analysis — a structured lens, not a verdict. Scores are not predictions of future price movements. They reflect a snapshot of available information evaluated against a consistent standard. Always conduct your own due diligence before making any investment decision."
  },
  {
    icon: Shield,
    title: "Research Standards",
    body: "StockStory is committed to research integrity. Scores are computed from observable data through transparent, documented methodology. No fabricated values are introduced. When data is unavailable or insufficient, the score reflects that honestly rather than imputing artificial numbers. The same evaluation framework is applied uniformly across all companies. This consistency allows for fair comparison and informed review."
  },
  {
    icon: ArrowRightLeft,
    title: "Why Execution Happens Through Brokers",
    body: "StockStory is a research platform, not a brokerage. All trading, order placement, and portfolio execution occur through your registered broker. StockStory provides the research and analysis — the decision and the action remain yours. This separation ensures that the research remains objective and free from execution conflicts."
  },
  {
    icon: Scale,
    title: "Compliance Statement",
    body: "StockStory provides research, analysis, and educational content only. Nothing on this platform constitutes investment advice, a recommendation, or a solicitation to buy or sell securities. All investment decisions should be made with the advice of a qualified financial professional. Past performance and research scores do not guarantee future results."
  }
];

export const TrustCentrePage: React.FC = () => {
  return (
    <ProductShell>
      <ProductPage>
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[#E6EDF3]">Research Standards</h1>
          </div>
          <p className="mt-1 text-xs text-[#9AA7B5]">Methodology, scoring framework, and how to use StockStory research.</p>
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
            <ProductStatusPill tone="verified">Research only</ProductStatusPill>
            <ProductStatusPill tone="verified">Transparent methodology</ProductStatusPill>
            <ProductStatusPill tone="verified">No fabricated data</ProductStatusPill>
            <ProductStatusPill tone="blue">Compare systematically</ProductStatusPill>
          </div>
        </ProductPanel>

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
