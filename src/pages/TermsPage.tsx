import React from "react";
import { Scale, ArrowRight } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductSection, productNavigate } from "../components/product/ProductUI";

export const TermsPage: React.FC = () => (
  <ProductShell>
    <ProductPage>
      <div className="mb-6">
        <Scale className="h-5 w-5 text-[#2A6AFF]" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#E8EDF2]">Terms & Disclosures</h1>
        <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">Last updated: June 2026</p>
      </div>

      <ProductSection>
        <ProductPanel className="p-5 md:p-6">
          <h2 className="text-base font-semibold text-[#E8EDF2]">Informational Research Tool</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            StockStory India provides informational research tools for Indian equity investors. Scores, rankings, signals, thesis statements, and all other outputs are model-based assessments of publicly available data. They are not guaranteed to be accurate, complete, or timely.
          </p>
        </ProductPanel>
      </ProductSection>

      <ProductSection>
        <ProductPanel className="p-5 md:p-6">
          <h2 className="text-base font-semibold text-[#E8EDF2]">No Investment Advice</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            Nothing on StockStory constitutes investment advice, a recommendation, or an offer to buy or sell any security. All users must make their own independent research decisions. StockStory does not provide personalised investment advice, portfolio management, or trading recommendations.
          </p>
        </ProductPanel>
      </ProductSection>

      <ProductSection>
        <ProductPanel className="p-5 md:p-6">
          <h2 className="text-base font-semibold text-[#E8EDF2]">No Order Execution</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            StockStory does not execute trades, hold custody of funds, or send orders to any broker. The invest review flow prepares your research context for your own decision-making. Any final order must be placed directly with your broker outside StockStory.
          </p>
        </ProductPanel>
      </ProductSection>

      <ProductSection>
        <ProductPanel className="p-5 md:p-6">
          <h2 className="text-base font-semibold text-[#E8EDF2]">No Broker Credential Storage</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            StockStory does not request, store, or transmit broker login credentials or trading tokens. No broker connection is established through StockStory.
          </p>
        </ProductPanel>
      </ProductSection>

      <ProductSection>
        <ProductPanel className="p-5 md:p-6">
          <h2 className="text-base font-semibold text-[#E8EDF2]">No Guaranteed Outcomes</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            Past research signals, score patterns, or ranking history do not guarantee future results. StockStory does not predict stock prices, returns, or market movements. All research outputs are for informational and educational purposes only.
          </p>
        </ProductPanel>
      </ProductSection>

      <ProductSection>
        <ProductPanel className="p-5 md:p-6">
          <h2 className="text-base font-semibold text-[#E8EDF2]">Data Sources & Limitations</h2>
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
            Research data may be incomplete, delayed, or unavailable for certain securities. Scores and signals are derived from quantitative models applied to fundamental and market data. Users should verify critical data points independently before making any investment decision.
          </p>
        </ProductPanel>
      </ProductSection>

      <ProductSection>
        <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[#0C1119] p-4 text-xs leading-5 text-[#64748B]">
          Questions or concerns? Contact us through the project repository or settings page.
        </div>
      </ProductSection>
    </ProductPage>
  </ProductShell>
);

export default TermsPage;
