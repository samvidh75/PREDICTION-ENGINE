import React from "react";
import { Search, FileSearch, GitCompare, Eye, ArrowRight, BarChart3, Bell, Bookmark, Shield } from "lucide-react";
import {
  ProductAction,
  ProductPage,
  ProductPanel,
  ProductSection,
  ProductShell,
  productNavigate,
} from "../components/product/ProductUI";

const WORKFLOW_STEPS = [
  { icon: Search, title: "Discover", body: "Screen and scan Indian equities that match your research criteria." },
  { icon: FileSearch, title: "Research", body: "Open company pages for scores, conviction context, and fundamental analysis." },
  { icon: GitCompare, title: "Compare", body: "Side-by-side peer comparison to evaluate which company fits your thesis better." },
  { icon: Eye, title: "Track", body: "Save companies to your watchlist and monitor thesis changes over time." },
  { icon: ArrowRight, title: "Review & decide", body: "Prepare your research summary and continue through your broker when ready." },
];

const FEATURES = [
  { icon: BarChart3, title: "Research rankings", body: "Complete universe of scored equities with multi-factor analysis." },
  { icon: FileSearch, title: "Company research pages", body: "Scores, fundamentals, thesis, and risk factors in one place." },
  { icon: GitCompare, title: "Compare workflows", body: "Factor-level comparison between companies to guide your research." },
  { icon: Bookmark, title: "Watchlist tracking", body: "Track companies and monitor thesis changes with alerts." },
  { icon: Bell, title: "What changed", body: "Get notified when research signals shift or risk factors emerge." },
  { icon: Shield, title: "Invest review", body: "Review all research context before you continue to your broker." },
];

export const PublicAboutPage: React.FC = () => (
  <ProductShell>
    <ProductPage>
      <ProductSection>
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">About StockStory</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#E8EDF2] md:text-4xl">
            The AI research workspace for Indian equities.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#9AA7B5]">
            StockStory India helps you find, research, compare, and track companies — so you can make informed investment decisions with structured analysis instead of scattered tabs.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ProductAction onClick={() => productNavigate("signup")}>Start researching</ProductAction>
            <ProductAction variant="secondary" onClick={() => productNavigate("scanner")}>Open scanner</ProductAction>
          </div>
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#E8EDF2]">How the research workflow works</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {WORKFLOW_STEPS.map(({ icon: Icon, title, body }, i) => (
            <ProductPanel key={title} className="p-4">
              <span className="text-[10px] font-medium text-[#64748B]">{i + 1}.</span>
              <Icon className="mt-2 h-4 w-4 text-[#2A6AFF]" aria-hidden="true" />
              <h3 className="mt-2 text-sm font-semibold text-[#E8EDF2]">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">{body}</p>
            </ProductPanel>
          ))}
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#E8EDF2]">What you get inside</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <ProductPanel key={title} className="p-4">
              <Icon className="h-4 w-4 text-[#2A6AFF]" aria-hidden="true" />
              <h3 className="mt-2 text-sm font-semibold text-[#E8EDF2]">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">{body}</p>
            </ProductPanel>
          ))}
        </div>
      </ProductSection>

      <ProductSection>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#E8EDF2]">Why StockStory is different</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ProductPanel className="p-4 md:p-5">
            <h3 className="text-sm font-semibold text-[#E8EDF2]">One research workspace</h3>
            <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">No switching between tabs, screenshots, and spreadsheets. Everything lives in one place.</p>
          </ProductPanel>
          <ProductPanel className="p-4 md:p-5">
            <h3 className="text-sm font-semibold text-[#E8EDF2]">Structured thesis view</h3>
            <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">Scores, drivers, risks, and comparison context organised for clear decision-making.</p>
          </ProductPanel>
          <ProductPanel className="p-4 md:p-5">
            <h3 className="text-sm font-semibold text-[#E8EDF2]">Change tracking</h3>
            <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">See what shifted in a company's research profile and decide if your thesis still holds.</p>
          </ProductPanel>
          <ProductPanel className="p-4 md:p-5">
            <h3 className="text-sm font-semibold text-[#E8EDF2]">Broker-neutral handoff</h3>
            <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">StockStory prepares your research review. The final decision and order happen with your broker.</p>
          </ProductPanel>
        </div>
      </ProductSection>

      <ProductSection>
        <ProductPanel className="p-5 md:p-6">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#E8EDF2]">Ready to start researching?</h2>
              <p className="mt-1 text-sm text-[#9AA7B5]">Create a free account to access the full StockStory research workspace.</p>
            </div>
            <ProductAction onClick={() => productNavigate("signup")}>
              Create free account
            </ProductAction>
          </div>
        </ProductPanel>
      </ProductSection>

      <div className="border-t border-[rgba(148,163,184,0.08)] pt-6 pb-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#64748B]">
          <span>StockStory provides informational research tools.</span>
          <button type="button" onClick={() => productNavigate("terms")} className="hover:text-[#9AA7B5] transition-colors underline underline-offset-2">Terms & Disclosures</button>
          <button type="button" onClick={() => productNavigate("methodology")} className="hover:text-[#9AA7B5] transition-colors underline underline-offset-2">Research Standards</button>
        </div>
      </div>
    </ProductPage>
  </ProductShell>
);

export default PublicAboutPage;
