import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";
import MarketOrb from "../components/intelligence/MarketOrb";
import OrbEffects from "../components/intelligence/OrbEffects";

import { useConfidenceEngine, type ConfidenceState, type ConfidenceTheme } from "../components/intelligence/ConfidenceEngine";
import { useNeuralMarketSynthesisSuperengine } from "../services/synthesis/useNeuralMarketSynthesisSuperengine";
import { useMotionController } from "../components/motion/MotionController";

import CompanyFoundingTimeline from "../components/companyUniverse/CompanyFoundingTimeline";
import FounderLeadershipStoryEngine from "../components/companyUniverse/FounderLeadershipStoryEngine";
import StrategicTransformationLayer from "../components/companyUniverse/StrategicTransformationLayer";
import CompanyDNAAndMissionEngine from "../components/companyUniverse/CompanyDNAAndMissionEngine";
import FutureProbabilityNarrativeSystem from "../components/companyUniverse/FutureProbabilityNarrativeSystem";
import CompanyBrokerRedirectionModal from "../components/companyUniverse/CompanyBrokerRedirectionModal";

import CompanyTelemetryCore from "../components/companyUniverse/CompanyTelemetryCore";
import CompanyHealthometerEnvironment from "../components/companyUniverse/CompanyHealthometerEnvironment";
import CompanyInstitutionalIntelligenceLayer from "../components/companyUniverse/CompanyInstitutionalIntelligenceLayer";

import CompanyFinancialInfographicEcosystem from "../components/companyUniverse/CompanyFinancialInfographicEcosystem";
import CompanyProgressiveFinancialAnalysis from "../components/companyUniverse/CompanyProgressiveFinancialAnalysis";
import CompanyNewsEcosystem from "../components/companyUniverse/CompanyNewsEcosystem";
import CompanyMarketStoryLayer from "../components/companyUniverse/CompanyMarketStoryLayer";
import CompanyMarketEventsLayer from "../components/companyUniverse/CompanyMarketEventsLayer";

import MacroIntelligenceEngine from "../components/macro/MacroIntelligenceEngine";
import StockStoryChartIntegration from "../components/charts/StockStoryChartIntegration";

import CompanyPrimaryActionBar from "../components/companyUniverse/CompanyPrimaryActionBar";
import CompanyCompareModal from "../components/companyUniverse/CompanyCompareModal";
import Company52WeekRangeMini from "../components/companyUniverse/Company52WeekRangeMini";
import { getCompanySectorMapping } from "../components/companyUniverse/getCompanySectorMapping";

import { addTickerToWatchlist, isTickerInWatchlist, removeTickerFromWatchlist } from "../services/portfolio/watchlistStore";
import { navigateToExplore } from "../architecture/navigation/routeCoordinator";

import MasterInfographicEngine from "../components/infographics/MasterInfographicEngine";
import VolumetricFinancialTowers from "../components/infographics/VolumetricFinancialTowers";
import BeginnerFinancialSimplificationRail from "../components/infographics/BeginnerFinancialSimplificationRail";
import BeginnerToExpertEvolutionPathway from "../components/beginner/BeginnerToExpertEvolutionPathway";

import { useCompanyUniverseModel } from "../services/company/useCompanyUniverseModel";
import useCompanyLiveTelemetry, { formatINRPrice } from "../components/companyUniverse/useCompanyLiveTelemetry";
import type { CompanyHealthState } from "../types/CompanyUniverse";
import type { CompanyTelemetrySnapshot } from "../components/companyUniverse/useCompanyLiveTelemetry";

import {
  deriveDeterministicFinance,
  formatMarketCap,
  formatPE,
  hashStringToSeed,
} from "../components/companyUniverse/formatCompanyFinance";

import type { CompanyHealthState as CompanyHealthStateType } from "../types/CompanyUniverse";
import useBeginnerIntelligenceCalibration from "../hooks/useBeginnerIntelligenceCalibration";

function healthLabel(state: CompanyHealthState): string {
  switch (state) {
    case "STRUCTURALLY_HEALTHY":
      return "Strong";
    case "STABLE_EXPANSION":
      return "Stable";
    case "CONFIDENCE_IMPROVING":
      return "Improving";
    case "LIQUIDITY_FRAGILE":
      return "Weakening";
    case "VOLATILITY_SENSITIVE":
    case "STRUCTURALLY_WEAKENING":
    default:
      return "High Risk";
  }
}

function confidenceLabel(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Confidence Rising";
    case "STABLE_CONVICTION":
      return "Stable Conviction";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced Environment";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "ELEVATED_RISK":
    default:
      return "Elevated Risk";
  }
}

function signFmt(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function confidenceToneGlow(state: ConfidenceState, theme: ConfidenceTheme): string {
  switch (state) {
    case "ELEVATED_RISK":
      return theme.warningGlow;
    case "MOMENTUM_WEAKENING":
      return theme.magentaGlow;
    case "CONFIDENCE_RISING":
      return theme.cyanGlow;
    case "NEUTRAL_ENVIRONMENT":
      return theme.deepBlueGlow;
    case "STABLE_CONVICTION":
    default:
      return theme.deepBlueGlow;
  }
}

function useHeroFinance(args: { ticker: string; healthState: CompanyHealthStateType; financialTelemetryLength: number }) {
  const { ticker, healthState, financialTelemetryLength } = args;

  return useMemo(() => {
    const seed = hashStringToSeed(`${ticker}_${healthState}_${financialTelemetryLength}`);
    const base = deriveDeterministicFinance(ticker, seed);
    const mc = formatMarketCap(base.marketCap);
    return {
      marketCapExact: mc.exact,
      marketCapWords: mc.words,
      pe: formatPE(base.pe),
      fiveYearPeAvg: base.fiveYearPeAvg,
      industryPe: base.industryPe,
    };
  }, [ticker, healthState, financialTelemetryLength]);
}

function useHeroTelemetry(args: { ticker: string; companyHealthState: CompanyHealthState; confidenceState: ConfidenceState; enabled: boolean }) {
  const { ticker, companyHealthState, confidenceState, enabled } = args;

  return useCompanyLiveTelemetry({
    ticker,
    companyHealthState,
    confidenceState,
    enabled,
    tickMs: 1000,
  });
}

export default function CompanyUniversePage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  const { isMobile } = useMotionController();
  const [brokerOpen, setBrokerOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTicker, setCompareTicker] = useState<string | null>(null);
  const [watchlistVersion, setWatchlistVersion] = useState<number>(0);
  const chartsSectionRef = useRef<HTMLElement | null>(null);
  const didAutoScrollCompareRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const raw = params.get("broker");
    const shouldOpen = raw === "1" || raw?.toLowerCase() === "true";

    if (!shouldOpen) return;

    setBrokerOpen(true);

    // Clear param so refresh/back doesn't keep re-opening.
    const url = new URL(window.location.href);
    url.searchParams.delete("broker");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const ticker = useMemo(() => {
    if (typeof window === "undefined") return "TTM";
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ticker") ?? "TTM";
    return raw.toUpperCase().trim() || "TTM";
  }, []);

  const model = useCompanyUniverseModel(ticker);

  // Chart compare overlay: URL param driven for persistence.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const raw = params.get("compare") ?? params.get("compareTicker");
    const cleaned = (raw ?? "").toUpperCase().trim();

    if (!cleaned) {
      setCompareTicker(null);
      return;
    }

    const primary = model.ticker.toUpperCase().trim();
    if (cleaned === primary) {
      setCompareTicker(null);
      return;
    }

    setCompareTicker(cleaned);
  }, [model.ticker]);

  const clearCompareOverlay = () => {
    setCompareTicker(null);

    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("compare");
    url.searchParams.delete("compareTicker");
    window.history.replaceState({}, "", url.toString());
  };

  const onCompareOnPage = (nextTicker: string) => {
    const cleaned = (nextTicker ?? "").toUpperCase().trim();
    if (!cleaned) return;

    const primary = model.ticker.toUpperCase().trim();
    if (cleaned === primary) {
      clearCompareOverlay();
      return;
    }

    setCompareTicker(cleaned);

    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("compare", cleaned);
    window.history.replaceState({}, "", url.toString());
  };

  // Auto-scroll once when a compare overlay becomes active, so the chart compare pill is immediately visible.
  useEffect(() => {
    if (!compareTicker) {
      didAutoScrollCompareRef.current = false;
      return;
    }

    if (didAutoScrollCompareRef.current) return;
    didAutoScrollCompareRef.current = true;

    const id = window.setTimeout(() => {
      chartsSectionRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }, 180);

    return () => window.clearTimeout(id);
  }, [compareTicker, prefersReducedMotion]);

  const sectorMapping = useMemo(() => getCompanySectorMapping(model.ticker), [model.ticker]);
  const sectorAvailable = Boolean(sectorMapping.exploreId);

  const watchlistHasTicker = useMemo(() => isTickerInWatchlist(model.ticker), [model.ticker, watchlistVersion]);

  const onToggleWatchlist = () => {
    if (watchlistHasTicker) removeTickerFromWatchlist(model.ticker);
    else addTickerToWatchlist(model.ticker);
    setWatchlistVersion((v) => v + 1);
  };

  const onOpenCharts = () => {
    chartsSectionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const onViewSector = () => {
    const exploreId = sectorMapping.exploreId;
    if (!exploreId) return;

    navigateToExplore("sector", exploreId, { mode: "hard", preserveParamKeys: ["skipOnboarding"] });
  };

  const { state: confidenceState, theme: confidenceTheme } = useConfidenceEngine();
  const { synthesis } = useNeuralMarketSynthesisSuperengine();

  const { experienceLevel } = useBeginnerIntelligenceCalibration();
  const beginner = experienceLevel === "beginner";

  const heroFinance = useHeroFinance({
    ticker: model.ticker,
    healthState: model.healthState,
    financialTelemetryLength: model.financialTelemetry.length,
  });

  const heroTelemetry: CompanyTelemetrySnapshot = useHeroTelemetry({
    ticker: model.ticker,
    companyHealthState: model.healthState,
    confidenceState,
    enabled: !prefersReducedMotion,
  });

  const heroGlow = useMemo(() => confidenceToneGlow(confidenceState, confidenceTheme), [confidenceState, confidenceTheme]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />

      {!prefersReducedMotion && <SentimentFlow />}

      {/* 1) Cinematic Hero Intelligence Layer */}
      <section
        className="relative z-[11]"
        style={{
          height: "90vh",
          paddingTop: isMobile ? 84 : 96,
          paddingBottom: isMobile ? 44 : 64,
          paddingLeft: isMobile ? 20 : 72,
          paddingRight: isMobile ? 20 : 72,
        }}
      >
        <div className="absolute inset-0" />
        <div className="relative h-full">
          {/* Left: identity + emotional doc framing */}
          <div className={isMobile ? "relative w-full" : "absolute left-0 top-0 w-full sm:w-[600px]"}>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">
              {model.ticker} • {model.marketStateLabel}
            </div>

            <div className="mt-3 text-[56px] font-semibold leading-[1.03] tracking-[-0.04em]">{model.companyName}</div>

            <div className="mt-4 text-[16px] leading-[1.9] text-white/85 max-w-[600px]">
              {model.narrative.body}
            </div>

            {/* Live telemetry micro HUD */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[520px]">
              <div className="rounded-[22px] border border-white/10 bg-black/25 backdrop-blur-2xl p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Live price (synthetic)</div>
                <div className="mt-2 text-[22px] font-semibold text-white/92" style={{ textShadow: `0 0 44px ${heroGlow}` }}>
                  {formatINRPrice(heroTelemetry.price)}
                </div>
                <div className="mt-2 text-[12px] leading-[1.6] text-white/75">
                  Daily movement: <span className="text-white/92 font-semibold">{signFmt(heroTelemetry.dailyChangePct)}</span>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-black/25 backdrop-blur-2xl p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Market cap</div>
                <div className="mt-2 text-[18px] font-semibold text-white/92">{heroFinance.marketCapExact}</div>
                <div className="mt-1 text-[12px] leading-[1.6] text-white/75">
                  In words: <span className="text-white/92 font-semibold">{heroFinance.marketCapWords}</span>
                </div>
                <div className="mt-2 text-[12px] leading-[1.6] text-white/75">
                  PE (context): <span className="text-white/92 font-semibold">{heroFinance.pe}x</span>
                </div>
              </div>
            </div>

            {/* Sector + 52-week range (overview essentials) */}
            <div className="mt-5">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/55">
                Sector: <span className="text-white/92 font-semibold">{sectorMapping.label}</span>
              </div>

              <div className="mt-4">
                <Company52WeekRangeMini ticker={model.ticker} confidenceState={confidenceState} />
              </div>
            </div>

            {/* Healthometer pill */}
            <div className="mt-6 inline-flex items-center gap-3 rounded-[999px] border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[10px]">
              <div
                className="h-[8px] w-[8px] rounded-full"
                style={{
                  background: model.healthTheme.glowCyan,
                  boxShadow: `0 0 18px ${model.healthTheme.glowCyan}`,
                }}
              />
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Healthometer</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">{healthLabel(model.healthState)}</div>
            </div>

            <CompanyPrimaryActionBar
              onOpenCharts={onOpenCharts}
              onCompareCompany={() => setCompareOpen(true)}
              watchlistHasTicker={watchlistHasTicker}
              onToggleWatchlist={onToggleWatchlist}
              sectorLabel={sectorMapping.label}
              sectorAvailable={sectorAvailable}
              onViewSector={onViewSector}
              healthState={model.healthState}
              theme={confidenceTheme}
              onContinueViaBroker={() => setBrokerOpen(true)}
              isMobile={isMobile}
            />
            <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
              Educational workspace • no trade execution
            </div>
          </div>

          {/* Center: orb ecosystem */}
          {!isMobile && (
            <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
              <MarketOrb />
              <OrbEffects />
            </div>
          )}

          {/* Right: institutional + macro strategic readouts */}
          {!isMobile && (
            <div className="absolute right-0 top-0 w-[410px]">
              <div
                className="rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]"
                style={{ boxShadow: `0 0 40px rgba(0,0,0,0.35), 0 0 120px ${heroGlow}` }}
              >
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Hero Intelligence Rail</div>

                <div className="mt-4 text-[18px] font-semibold text-white/92">{healthLabel(model.healthState)}</div>

                <div className="mt-3 text-[13px] leading-[1.7] text-white/80">
                  Sector positioning: <span className="text-white/92 font-semibold">{model.positioningRailLabel}</span>
                </div>

                <div className="mt-3 text-[13px] leading-[1.7] text-white/80">
                  Institutional confidence:{" "}
                  <span className="text-white/92 font-semibold">{confidenceLabel(confidenceState)}</span>
                </div>

                <div className="mt-3 text-[13px] leading-[1.7] text-white/80">
                  Macro sensitivity: <span className="text-white/92 font-semibold">{synthesis.macroGeopolitical.headline}</span>
                </div>

                <div className="mt-5 rounded-[20px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Strategic summary (SEBI-safe)</div>
                  <div className="mt-2 text-[14px] leading-[1.6] text-white/85">{model.strategicSummary}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Broker modal */}
      <CompanyBrokerRedirectionModal
        open={brokerOpen}
        onClose={() => setBrokerOpen(false)}
        ticker={model.ticker}
        healthState={model.healthState}
        theme={confidenceTheme}
      />

      {/* Compare modal */}
      <CompanyCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        primaryTicker={model.ticker}
        theme={confidenceTheme}
        onCompareOnPage={onCompareOnPage}
      />

      {/* 2) Live Market Telemetry Core */}
      <CompanyTelemetryCore
        ticker={model.ticker}
        companyHealthState={model.healthState}
        confidenceState={confidenceState}
        theme={confidenceTheme}
        enabled={!prefersReducedMotion}
        isMobile={isMobile}
      />

      {/* 3) Healthometer Intelligence Environment (dominant strategic centerpiece) */}
      <CompanyHealthometerEnvironment
        companyHealthState={model.healthState}
        healthTheme={model.healthTheme}
        strategicSummary={model.strategicSummary}
        positioningRailLabel={model.positioningRailLabel}
        futureCapsules={model.futureProbabilityCapsules}
        synthesis={synthesis}
        confidenceState={confidenceState}
        theme={confidenceTheme}
        beginner={beginner}
        isMobile={isMobile}
      />

      {/* 3.5) Market Story & Narrative Layer */}
      <CompanyMarketStoryLayer
        companyName={model.companyName}
        ticker={model.ticker}
        sectorLabel={sectorMapping.label}
        healthState={model.healthState}
        healthTheme={model.healthTheme}
        founders={model.founders}
        leadership={model.leadership}
        narrativeBody={model.narrative.body}
        strategicSummary={model.strategicSummary}
        positioningRailLabel={model.positioningRailLabel}
        financialTelemetry={model.financialTelemetry}
        futureCapsules={model.futureProbabilityCapsules}
        synthesis={synthesis}
        confidenceState={confidenceState}
        confidenceTheme={confidenceTheme}
        beginner={beginner}
      />

      {/* 4) Company Storytelling Ecosystem */}
      <CompanyFoundingTimeline milestones={model.foundingTimeline} />

      <FounderLeadershipStoryEngine
        companyName={model.companyName}
        healthState={model.healthState}
        founders={model.founders}
        leadership={model.leadership}
      />

      <CompanyDNAAndMissionEngine
        companyName={model.companyName}
        healthState={model.healthState}
        narrativeBody={model.narrative.body}
        strategicSummary={model.strategicSummary}
        founders={model.founders}
        leadership={model.leadership}
      />

      <StrategicTransformationLayer
        ticker={model.ticker}
        healthState={model.healthState}
        strategicSummary={model.strategicSummary}
        financialTelemetry={model.financialTelemetry}
      />

      {/* 5) TradingView-Grade Chart Universe */}
      <section ref={chartsSectionRef} className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">TradingView-Grade Chart Suite</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Narrative-first technical interpretation</div>
              <div className="mt-3 text-[14px] leading-[1.9] text-white/75 max-w-[90ch]">
                Candlestick structure + confidence overlays are educational context. They connect to the macro and institutional learning tone—without giving certainty or trade advice.
              </div>
            </div>

            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              mode: {isMobile ? "mobile-calm" : "calm"} • chart overlays: educational
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-6 shadow-[0_0_50px_rgba(0,0,0,0.35)]">
            <StockStoryChartIntegration
              ticker={model.ticker}
              compareTicker={compareTicker}
              onClearCompare={clearCompareOverlay}
              defaultTimeframe="1M"
            />
          </div>
        </div>
      </section>

      {/* 6) Institutional Intelligence Layer */}
      <CompanyInstitutionalIntelligenceLayer
        healthState={model.healthState}
        synthesis={synthesis}
        confidenceState={confidenceState}
        theme={confidenceTheme}
        beginner={beginner}
      />

      {/* 7) Progressive Financial Analysis System */}
      <MasterInfographicEngine
        enabled={!prefersReducedMotion}
        ticker={model.ticker}
        healthState={model.healthState}
        healthTheme={model.healthTheme}
        financialTelemetry={model.financialTelemetry}
      >
        <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
          <div className="mx-auto max-w-[1680px]">
            <CompanyProgressiveFinancialAnalysis
              ticker={model.ticker}
              points={model.financialTelemetry}
              healthState={model.healthState}
              healthTheme={model.healthTheme}
              confidenceState={confidenceState}
              confidenceTheme={confidenceTheme}
              beginner={beginner}
            />
          </div>
        </section>
      </MasterInfographicEngine>

      {/* 8) Macro Sensitivity Environment */}
      <div className="relative z-[12]">
        <div className="px-6 sm:px-[72px] pb-14">
          <div className="mx-auto max-w-[1680px]">
            <MacroIntelligenceEngine synthesis={synthesis} confidenceState={confidenceState} theme={confidenceTheme} compact={false} />
          </div>
        </div>
      </div>

      {/* 9) Future Probability Intelligence Layer */}
      <FutureProbabilityNarrativeSystem
        healthState={model.healthState}
        healthTheme={model.healthTheme}
        capsules={model.futureProbabilityCapsules}
        companyName={model.companyName}
      />

      {/* Company news intelligence (company-specific developments) */}
      <CompanyNewsEcosystem
        news={model.news}
        companyHealthState={model.healthState}
        confidenceState={confidenceState}
        theme={confidenceTheme}
        beginner={beginner}
      />

      {/* Market-wide context (separate from company news) */}
      <CompanyMarketEventsLayer synthesis={synthesis} confidenceState={confidenceState} theme={confidenceTheme} beginner={beginner} />

      {/* 10) Adaptive Beginner Understanding System */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-24">
        <div className="mx-auto max-w-[1680px]">
          <BeginnerToExpertEvolutionPathway />
        </div>
      </section>

      {/* SEBI-style trust line */}
      <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45 px-6 sm:px-[72px] pb-10">
        Educational corporate intelligence only • No trade execution • No certainty guarantees
      </div>
    </div>
  );
}
