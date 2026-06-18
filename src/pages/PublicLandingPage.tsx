import React, { useEffect, useState } from "react";
import { Activity, Database, FileSearch, Search, ShieldCheck } from "lucide-react";
import { api } from "../services/api/client";
import {
  ProductAction,
  ProductHero,
  ProductIntegrityRow,
  ProductLoadingLine,
  ProductPage,
  ProductPanel,
  ProductSection,
  ProductShell,
  ProductStatusPill,
  productNavigate,
} from "../components/product/ProductUI";

const steps = [
  { icon: Search, title: "Find a company", body: "Search by symbol, company, or sector and open the research workspace." },
  { icon: FileSearch, title: "Inspect evidence", body: "Review scores with freshness, confidence, and unavailable inputs kept visible." },
  { icon: ShieldCheck, title: "Check trust", body: "Use the Trust Centre to inspect provider domains and data limitations." },
];

export const PublicLandingPage: React.FC = () => {
  const [coverage, setCoverage] = useState<{ symbols: number | null; scored: number | null; updated: string | null; registryRows: number | null; loading: boolean }>({
    symbols: null,
    scored: null,
    updated: null,
    registryRows: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    api.getDataCoverage()
      .then((cov) => {
        if (!alive) return;
        setCoverage({
          symbols: cov.coverage?.symbols?.count ?? null,
          scored: cov.coverage?.predictionRegistry?.symbolCount ?? null,
          updated: cov.coverage?.predictionRegistry?.latestPredictionDate ?? cov.generatedAt ?? null,
          registryRows: cov.coverage?.predictionRegistry?.rowCount ?? null,
          loading: false,
        });
      })
      .catch(() => {
        if (alive) setCoverage((prev) => ({ ...prev, loading: false }));
      });
    return () => { alive = false; };
  }, []);

  const metrics = [
    { label: "Universe", value: coverage.symbols, suffix: "companies" },
    { label: "Scored", value: coverage.scored, suffix: "symbols" },
    { label: "Registry", value: coverage.registryRows, suffix: "rows" },
  ];

  return (
    <ProductShell>
      <ProductPage>
        <ProductHero
          eyebrow="Source-backed Indian equity research"
          title="AI-native research intelligence for Indian equities."
          body="StockStory India helps you search companies, inspect model inputs, compare coverage, and verify source trust. It does not issue trading calls or hide missing data."
          actions={(
            <>
              <ProductAction id="hero-cta-start" onClick={() => productNavigate("signup")}>Start research</ProductAction>
              <ProductAction id="hero-cta-rankings" variant="secondary" onClick={() => productNavigate("rankings")}>View rankings</ProductAction>
              <ProductAction id="hero-cta-methodology" variant="secondary" onClick={() => productNavigate("trust")}>Check Trust Centre</ProductAction>
            </>
          )}
          aside={(
            <ProductPanel className="flex min-h-[360px] flex-col justify-between p-5 md:p-6">
              <div>
                <div className="flex items-center justify-between gap-3 border-b border-[rgba(148,163,184,0.12)] pb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                    <span className="text-sm font-semibold text-[#E6EDF3]">Research state</span>
                  </div>
                  <ProductStatusPill tone="blue">Research only</ProductStatusPill>
                </div>
                <div className="mt-5 grid gap-3">
                  {coverage.loading ? (
                    <ProductLoadingLine />
                  ) : metrics.map((metric) => (
                    <div key={metric.label} className="flex items-center justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-3 py-3">
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#64748B]">{metric.label}</div>
                        <div className="mt-1 text-xs text-[#9AA7B5]">{metric.value === null ? "Unavailable from verified coverage API" : metric.suffix}</div>
                      </div>
                      <div className="font-mono text-lg font-semibold text-[#E6EDF3]">
                        {metric.value === null ? "Unavailable" : metric.value.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 border-t border-[rgba(148,163,184,0.12)] pt-4">
                <div className="flex items-center gap-2 text-xs text-[#9AA7B5]">
                  <Database className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />
                  {coverage.updated ? `Latest verified coverage: ${coverage.updated}` : "Latest coverage timestamp unavailable"}
                </div>
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
