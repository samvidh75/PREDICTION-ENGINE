import React, { useMemo } from "react";
import type { CompanyHealthState, FinancialTelemetryPoint, HealthTheme } from "../../types/CompanyUniverse";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import ProgressiveDisclosure from "../../designSystem/ProgressiveDisclosure";
import { CompanyUniverseCard } from "./CompanyUniverseSectionFrame";
import { deriveDeterministicFinance, formatMarketCap, formatPE, hashStringToSeed } from "./formatCompanyFinance";
import CompanyDebtRatioCorridor from "./CompanyDebtRatioCorridor";
import CompanyFinancialInfographicEcosystem from "./CompanyFinancialInfographicEcosystem";
import VolumetricFinancialTowers from "../infographics/VolumetricFinancialTowers";

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

function confidenceTone(state: ConfidenceState, theme: ConfidenceTheme): string {
  switch (state) {
    case "ELEVATED_RISK":
      return theme.warningGlow;
    case "MOMENTUM_WEAKENING":
      return theme.magentaGlow;
    case "CONFIDENCE_RISING":
      return theme.cyanGlow;
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return theme.deepBlueGlow;
  }
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || from === 0) return 0;
  return ((to - from) / Math.abs(from)) * 100;
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export default function CompanyProgressiveFinancialAnalysis({
  ticker,
  points,
  healthState,
  healthTheme,
  confidenceState,
  confidenceTheme,
  beginner = false,
}: {
  ticker: string;
  points: FinancialTelemetryPoint[];
  healthState: CompanyHealthState;
  healthTheme: HealthTheme;
  confidenceState: ConfidenceState;
  confidenceTheme: ConfidenceTheme;
  beginner?: boolean;
}): JSX.Element {
  const finance = useMemo(() => {
    const seed = hashStringToSeed(`${ticker}_${healthState}_${points.length}`);
    const base = deriveDeterministicFinance(ticker, seed);
    const mc = formatMarketCap(base.marketCap);
    return {
      marketCapExact: mc.exact,
      peFormatted: formatPE(base.pe),
      industryPe: base.industryPe,
      fiveYearPeAvg: base.fiveYearPeAvg,
    };
  }, [ticker, healthState, points.length]);

  const snapshot = useMemo(() => {
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) {
      return { revenue: 0, profit: 0, ebitda: 0 };
    }

    return {
      revenue: pctChange(first.revenue, last.revenue),
      profit: pctChange(first.profit, last.profit),
      ebitda: pctChange(first.ebitda, last.ebitda),
    };
  }, [points]);

  const glow = confidenceTone(confidenceState, confidenceTheme);

  const front = (
    <CompanyUniverseCard className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Progressive financial analysis</div>
          <div className="mt-3 text-[20px] font-semibold text-white/92">Start calm. Reveal structure.</div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">SEBI-safe • educational lens</div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Simplified Healthometer</div>
          <div className="mt-2 text-[16px] font-semibold text-white/92" style={{ textShadow: `0 0 50px ${glow}` }}>
            {healthLabel(healthState)}
          </div>
          <div className="mt-2 text-[12px] uppercase tracking-[0.18em] text-white/45">bounded interpretation</div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Valuation texture</div>
          <div className="mt-2 text-[14px] leading-[1.6] text-white/85">
            Market cap: <span className="text-white/92 font-semibold">{finance.marketCapExact}</span>
          </div>
          <div className="mt-2 text-[14px] leading-[1.6] text-white/85">
            PE (context): <span className="text-white/92 font-semibold">{finance.peFormatted}x</span>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Growth snapshot</div>
          <div className="mt-3 space-y-2 text-[13px] text-white/80">
            <div>
              Revenue: <span className="text-white/92 font-semibold">{formatPct(snapshot.revenue)}</span>
            </div>
            <div>
              Profit: <span className="text-white/92 font-semibold">{formatPct(snapshot.profit)}</span>
            </div>
            <div>
              EBITDA: <span className="text-white/92 font-semibold">{formatPct(snapshot.ebitda)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/15 p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Revenue + profit trends (simplified)</div>
        <div className="mt-3">
          <CompanyFinancialInfographicEcosystem
            points={points}
            beginner={true}
            healthState={healthState}
            healthTheme={healthTheme}
          />
        </div>
      </div>

      <div className="mt-4 text-[12px] uppercase tracking-[0.18em] text-white/45">
        Complexity stays layered • no forecasting • no execution framing
      </div>
    </CompanyUniverseCard>
  );

  const expandedContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <VolumetricFinancialTowers points={points} />
        </div>

        <div className="lg:col-span-7">
          <CompanyFinancialInfographicEcosystem
            points={points}
            beginner={false}
            healthState={healthState}
            healthTheme={healthTheme}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <CompanyDebtRatioCorridor points={points} healthState={healthState} healthTheme={healthTheme} beginner={beginner} />
        </div>

        <div className="lg:col-span-6">
          <CompanyUniverseCard className="p-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Advanced valuation context (educational)</div>
            <div className="mt-3 text-[16px] font-semibold text-white/92" style={{ textShadow: `0 0 50px ${glow}` }}>
              PE corridor + industry baseline
            </div>
            <div className="mt-4 text-[14px] leading-[1.9] text-white/80">
              Current PE (context): <span className="text-white/92 font-semibold">{finance.peFormatted}x</span>
              <br />
              Industry PE: <span className="text-white/92 font-semibold">{finance.industryPe.toFixed(1)}x</span>
              <br />
              5Y avg PE (bounded): <span className="text-white/92 font-semibold">{finance.fiveYearPeAvg.toFixed(1)}x</span>
            </div>

            <div className="mt-5 text-[12px] uppercase tracking-[0.18em] text-white/45">
              valuation is treated as a learning texture • not a certainty engine
            </div>
          </CompanyUniverseCard>
        </div>
      </div>

      <div className="text-[12px] uppercase tracking-[0.18em] text-white/45">
        Expanded layer reveals depth, but keeps interpretation manageable • educational only
      </div>
    </div>
  );

  return (
    <ProgressiveDisclosure
      front={front}
      steps={[
        {
          id: "expanded",
          label: "Expanded analysis",
          content: expandedContent,
        },
      ]}
      collapsedCtaLabel="Expand financial analysis"
      collapseCtaLabel="Collapse"
      initialOpen={false}
      initialStepIndex={0}
      debugLabel="company_progressive_financial_analysis"
    />
  );
}
