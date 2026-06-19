import React from "react";
import { FileSearch, Search, ShieldCheck } from "lucide-react";
import {
  ProductAction,
  ProductHero,
  ProductIntegrityRow,
  ProductPage,
  ProductPanel,
  ProductSection,
  ProductShell,
  ProductStatusPill,
  productNavigate,
} from "../components/product/ProductUI";

const steps = [
  { icon: Search, title: "Find a company", body: "Search by symbol, company, or sector and open the research workspace." },
  { icon: FileSearch, title: "Research depth", body: "Review scores, conviction, and the basis for each assessment." },
  { icon: ShieldCheck, title: "Understand methodology", body: "How StockStory evaluates businesses and what each score means." },
];

const insights = [
  { label: "Approach", value: "Research-driven" },
  { label: "Methodology", value: "Multi-factor framework" },
  { label: "Coverage", value: "Public Indian equities" },
  { label: "Status", value: "Research, not advice" },
];

export const PublicLandingPage: React.FC = () => {
  return (
    <ProductShell>
      <ProductPage>
        <ProductHero
          eyebrow="AI research for Indian equities"
          title="Understand the stock before you invest."
          body="Search companies, review scores, compare peers, and track your thesis. StockStory is the AI research layer between you and your broker."
          actions={(
            <>
              <ProductAction id="hero-cta-start" onClick={() => productNavigate("signup")}>Start research</ProductAction>
              <ProductAction id="hero-cta-rankings" variant="secondary" onClick={() => productNavigate("rankings")}>View rankings</ProductAction>
              <ProductAction id="hero-cta-methodology" variant="secondary" onClick={() => productNavigate("methodology")}>Methodology</ProductAction>
            </>
          )}
          aside={(
            <ProductPanel className="flex min-h-[180px] flex-col justify-between p-5 md:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-[rgba(148,163,184,0.12)] pb-4">
                <span className="text-sm font-semibold text-[#E6EDF3]">Research overview</span>
                <ProductStatusPill tone="blue">Research only</ProductStatusPill>
              </div>
              <div className="mt-4 grid gap-2">
                {insights.map((item) => (
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
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#E6EDF3]">Research flow</h2>
              <p className="mt-1 text-sm text-[#9AA7B5]">Three steps, no decorative filler.</p>
            </div>
            <ProductIntegrityRow />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }) => (
              <ProductPanel key={title} className="p-4">
                <Icon className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#9AA7B5]">{body}</p>
              </ProductPanel>
            ))}
          </div>
          <div className="mt-4">
            <ProductAction id="onboarding-cta-about" variant="ghost" onClick={() => productNavigate("about")}>Read about StockStory India</ProductAction>
          </div>
        </ProductSection>
      </ProductPage>
    </ProductShell>
  );
};

export default PublicLandingPage;
