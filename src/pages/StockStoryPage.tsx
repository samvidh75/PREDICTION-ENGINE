import React, { useMemo } from "react";
import { useConfidenceEngine, type ConfidenceState } from "../components/intelligence/ConfidenceEngine";
import { useMotionController } from "../components/motion/MotionController";

import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";

import StockStoryHeader from "../components/stock/StockStoryHeader";
import StockHealthMeter from "../components/stock/StockHealthMeter";

import StockStoryChartIntegration from "../components/charts/StockStoryChartIntegration";
import NeuralMarketSynthesisPanel from "../components/synthesis/NeuralMarketSynthesisPanel";

import Company52WeekRangeMini from "../components/companyUniverse/Company52WeekRangeMini";
import CompanyFinancialInfographicEcosystem from "../components/companyUniverse/CompanyFinancialInfographicEcosystem";
import CompanyNewsEcosystem from "../components/companyUniverse/CompanyNewsEcosystem";
import CompanyHealthometerEnvironment from "../components/companyUniverse/CompanyHealthometerEnvironment";
import MasterInfographicEngine from "../components/infographics/MasterInfographicEngine";

import { resolveExchangeAndTicker, type ExchangeVenue } from "../services/market/exchangeResolver";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { useCompanyUniverseModel } from "../services/company/useCompanyUniverseModel";
import { useNeuralMarketSynthesisSuperengine } from "../services/synthesis/useNeuralMarketSynthesisSuperengine";
import type { CompanyHealthState } from "../types/CompanyUniverse";

type StockProfile = {
  company: string;
  ticker: string;
  sector: string;
  exchange: ExchangeVenue;
};

function profileFromUrl(): StockProfile {
  if (typeof window === "undefined") {
    return { company: "RELIANCE INDUSTRIES", ticker: "RELIANCE", sector: "Energy & Retail", exchange: "NSE" };
  }

  const params = new URLSearchParams(window.location.search);
  const rawTicker = (params.get("id") ?? params.get("ticker") ?? "RELIANCE").toUpperCase().trim();

  const stock = StockRegistry.getStock(rawTicker);
  if (stock) {
    return {
      company: stock.companyName,
      ticker: stock.symbol,
      sector: stock.sector,
      exchange: stock.exchange,
    };
  }

  return {
    company: rawTicker,
    ticker: rawTicker,
    sector: "Multi-sector",
    exchange: "NSE",
  };
}

function exchangeLabel(exchange: ExchangeVenue): string {
  return exchange === "UNKNOWN" ? "—" : exchange;
}

function beginnerBiasFromConfidence(state: ConfidenceState): boolean {
  // Keep right-panel density calm when risk tightens.
  return state === "ELEVATED_RISK" || state === "MOMENTUM_WEAKENING";
}

export default function StockStoryPage(): JSX.Element {
  const { state, theme } = useConfidenceEngine();
  const { isMobile } = useMotionController();

  const stock = useMemo(() => profileFromUrl(), []);

  const company = useCompanyUniverseModel(stock.ticker);

  const companyHealthState = company.healthState as CompanyHealthState;
  const beginner = beginnerBiasFromConfidence(state);

  const { synthesis } = useNeuralMarketSynthesisSuperengine();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020304]">
      <HiddenGridOverlay />
      <AmbientBackground />
      <SentimentFlow />

      <div className={isMobile ? "" : "lg:ml-[230px]"}>
        <div className="pt-24 pb-24">
          <div className="mx-auto max-w-[1600px] w-full px-4 md:px-8 lg:px-12">
            <StockStoryHeader
              companyName={company.companyName}
              ticker={stock.ticker}
              sector={stock.sector}
              exchangeLabel={exchangeLabel(stock.exchange)}
              confidenceState={state}
              confidenceTheme={theme}
              companyHealthState={companyHealthState}
            />

            <div className="mt-6 lg:mt-10 grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-4 lg:space-y-6">
                <StockStoryChartIntegration ticker={stock.ticker} defaultTimeframe="1M" />
                <NeuralMarketSynthesisPanel compact />
              </div>

              <div className="lg:col-span-4 space-y-4 lg:space-y-6">
                <StockHealthMeter healthState={companyHealthState} theme={theme} compact={false} />

                <Company52WeekRangeMini ticker={stock.ticker} confidenceState={state} timeframe="1Y" miniWidthPx={170} />

                <MasterInfographicEngine
                  enabled={true}
                  ticker={company.ticker}
                  healthState={companyHealthState}
                  healthTheme={company.healthTheme}
                  financialTelemetry={company.financialTelemetry}
                >
                  <CompanyFinancialInfographicEcosystem
                    points={company.financialTelemetry}
                    healthState={companyHealthState}
                    healthTheme={company.healthTheme}
                    beginner={beginner}
                  />
                </MasterInfographicEngine>

                <CompanyNewsEcosystem
                  news={company.news}
                  companyHealthState={companyHealthState}
                  confidenceState={state}
                  theme={theme}
                  beginner={beginner}
                />
              </div>
            </div>

            {/* Section Gap: 24px mobile (mt-6), 40px desktop (mt-10) */}
            <div className="mt-6 lg:mt-10">
              <CompanyHealthometerEnvironment
                companyHealthState={companyHealthState}
                healthTheme={company.healthTheme}
                strategicSummary={company.strategicSummary}
                positioningRailLabel={company.positioningRailLabel}
                futureCapsules={company.futureProbabilityCapsules}
                synthesis={synthesis}
                confidenceState={state}
                theme={theme}
                beginner={beginner}
                isMobile={isMobile}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
