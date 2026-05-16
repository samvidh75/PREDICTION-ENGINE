import React, { useMemo } from "react";
import type { CompanyHealthState, FinancialTelemetryPoint, LeaderProfile } from "../../types/CompanyUniverse";
import type { HealthTheme } from "../../types/CompanyUniverse";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import ProgressiveDisclosure from "../../designSystem/ProgressiveDisclosure";
import { CompanyUniverseCard, CompanyUniverseSectionHeader } from "./CompanyUniverseSectionFrame";

function healthUXLabel(state: CompanyHealthState): "Strong" | "Stable" | "Improving" | "Weakening" | "High Risk" {
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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hashStringToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || from === 0) return 0;
  return ((to - from) / Math.abs(from)) * 100;
}

function summarizeGrowth(points: FinancialTelemetryPoint[]): { revenuePct: number; profitPct: number; fromLabel: string; toLabel: string } {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return { revenuePct: 0, profitPct: 0, fromLabel: "—", toLabel: "—" };
  }
  return {
    revenuePct: pctChange(first.revenue, last.revenue),
    profitPct: pctChange(first.profit, last.profit),
    fromLabel: first.label,
    toLabel: last.label,
  };
}

function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function pickMarketShareBand(ticker: string, healthState: CompanyHealthState): { low: number; high: number; label: string } {
  const seed = hashStringToSeed(`ms_${ticker}_${healthState}`);
  const base = 6 + (seed % 14); // 6..19
  // riskier states imply more uncertainty about “share” as a stable concept.
  const spread = healthState === "STRUCTURALLY_HEALTHY" || healthState === "STABLE_EXPANSION" ? 2 : 4;
  const low = clamp(base - spread, 1, 28);
  const high = clamp(base + spread, 2, 35);
  const label = healthState === "STRUCTURALLY_HEALTHY" || healthState === "STABLE_EXPANSION" ? "Indicative stability band" : "Indicative uncertainty band";
  return { low, high, label };
}

function leadershipShortCard(profile: LeaderProfile): { name: string; line: string } {
  return {
    name: profile.name,
    line: profile.philosophy,
  };
}

export default function CompanyMarketStoryLayer({
  companyName,
  ticker,
  sectorLabel,
  healthState,
  healthTheme,
  founders,
  leadership,
  narrativeBody,
  strategicSummary,
  positioningRailLabel,
  financialTelemetry,
  futureCapsules,
  synthesis,
  confidenceState,
  confidenceTheme,
  beginner = false,
}: {
  companyName: string;
  ticker: string;
  sectorLabel: string;
  healthState: CompanyHealthState;
  healthTheme: HealthTheme;
  founders: LeaderProfile[];
  leadership: LeaderProfile[];
  narrativeBody: string;
  strategicSummary: string;
  positioningRailLabel: string;
  financialTelemetry: FinancialTelemetryPoint[];
  futureCapsules: { id: string; body: string }[];
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  confidenceTheme: ConfidenceTheme;
  beginner?: boolean;
}): JSX.Element {
  const glow = useMemo(() => {
    // calm: use health theme glows, subtly.
    if (healthState === "STRUCTURALLY_HEALTHY" || healthState === "STABLE_EXPANSION" || healthState === "CONFIDENCE_IMPROVING") return healthTheme.glowCyan;
    if (healthState === "LIQUIDITY_FRAGILE") return healthTheme.glowAmber;
    return healthTheme.glowWarning;
  }, [healthState, healthTheme]);

  const growth = useMemo(() => summarizeGrowth(financialTelemetry), [financialTelemetry]);
  const marketShare = useMemo(() => pickMarketShareBand(ticker, healthState), [ticker, healthState]);

  const topFounders = useMemo(() => founders.slice(0, beginner ? 1 : 2), [founders, beginner]);
  const topLeadership = useMemo(() => leadership.slice(0, beginner ? 1 : 2), [leadership, beginner]);

  const longTermDirection = futureCapsules[0]?.body ?? "Long-term direction is interpreted through a probabilistic documentary lens (not certainty).";

  const modelEssentials = useMemo(() => {
    const companyDoes = narrativeBody;
    const whyMattersNow = `Current positioning: ${positioningRailLabel}. Sector lens: ${sectorLabel}. Market tone anchor: ${synthesis.narrative.editorialHeadline}.`;

    const learningTone = `Healthometer UX state: ${healthUXLabel(healthState)}. Educational strategic summary: ${strategicSummary}`;

    return { companyDoes, whyMattersNow, learningTone };
  }, [narrativeBody, positioningRailLabel, sectorLabel, synthesis.narrative.editorialHeadline, healthState, strategicSummary]);

  const foundersBlock = useMemo(() => {
    const f0 = topFounders[0];
    const f1 = topFounders[1];
    if (!f0) return "Founders: leadership intent is model-derived in this demo set.";
    if (!f1) return `${f0.name}: ${f0.philosophy}`;
    return `${f0.name}: ${f0.philosophy} • ${f1.name}: ${f1.philosophy}`;
  }, [topFounders]);

  const leadershipBlock = useMemo(() => {
    const l0 = topLeadership[0];
    const l1 = topLeadership[1];
    if (!l0) return "Leadership: leadership tone is model-derived in this demo set.";
    if (!l1) return `${l0.name}: ${l0.philosophy}`;
    return `${l0.name}: ${l0.philosophy} • ${l1.name}: ${l1.philosophy}`;
  }, [topLeadership]);

  const businessModelBlock = useMemo(() => {
    const healthTone =
      healthState === "STRUCTURALLY_HEALTHY" || healthState === "STABLE_EXPANSION" || healthState === "CONFIDENCE_IMPROVING"
        ? "operational rhythm tends to read as coherent"
        : healthState === "LIQUIDITY_FRAGILE"
          ? "liquidity quality becomes a dominant pacing constraint"
          : "governance and resilience reading increases interpretive caution";
    return `Business model readout (educational): ${healthTone}. Strategic texture: ${synthesis.institutionalBehaviour}.`;
  }, [healthState, synthesis.institutionalBehaviour]);

  const growthJourneyBlock = useMemo(() => {
    return `Growth journey (bounded): from ${growth.fromLabel} to ${growth.toLabel}, revenue is ${formatPct(growth.revenuePct)} and profit is ${formatPct(growth.profitPct)}. Interpretation focuses on structure and execution cadence—no forecasts, no certainty framing.`;
  }, [growth.fromLabel, growth.toLabel, growth.revenuePct, growth.profitPct]);

  const industryRelevanceBlock = useMemo(() => {
    const confTone =
      confidenceState === "ELEVATED_RISK"
        ? "risk intensity rises, so sector learnings are treated as selective"
        : confidenceState === "MOMENTUM_WEAKENING"
          ? "momentum softens, so sector relevance is interpreted cautiously"
          : "sector relevance is read as a stable learning lens";
    return `Industry relevance: ${sectorLabel}. ${confTone}.`;
  }, [sectorLabel, confidenceState]);

  const marketShareBlock = useMemo(() => {
    return `${marketShare.label}: ~${marketShare.low}–${marketShare.high}%. Educational context only—market share is treated as a learning texture, not a certainty engine.`;
  }, [marketShare]);

  const longTermBlock = useMemo(() => {
    return `Long-term direction (probabilistic documentary): ${longTermDirection} This is educational framing, not trade advice or outcome promise.`;
  }, [longTermDirection]);

  const front = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CompanyUniverseCard className="p-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Company background</div>
            <div className="mt-3 text-[18px] font-semibold text-white/92 leading-[1.25]">
              What the company does, explained as a calm narrative
            </div>
            <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{modelEssentials.companyDoes}</div>
            <div className="mt-5 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Educational corporate intelligence • no recommendations</div>
          </CompanyUniverseCard>
        </div>

        <div className="lg:col-span-5">
          <CompanyUniverseCard className="p-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Why it matters now</div>
            <div className="mt-3 text-[18px] font-semibold text-white/92 leading-[1.25]">
              Positioning + sector lens in the current market tone
            </div>
            <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{modelEssentials.whyMattersNow}</div>

            <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4" style={{ boxShadow: `0 0 90px ${glow}` }}>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Simplified learning state</div>
              <div className="mt-2 text-[14px] leading-[1.7] text-white/85">
                {healthUXLabel(healthState)} • confidence context: {confidenceTheme.label ? confidenceTheme.label : confidenceState}
              </div>
            </div>

            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">SEBI-safe • educational probabilistic lens</div>
          </CompanyUniverseCard>
        </div>
      </div>

      <CompanyUniverseCard className="p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Current learning tone</div>
            <div className="mt-3 text-[18px] font-semibold text-white/92 leading-[1.25]">How to interpret the company today</div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">calm • bounded • non-hype</div>
        </div>
        <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{modelEssentials.learningTone}</div>
      </CompanyUniverseCard>
    </div>
  );

  const expanded = (
    <div className="space-y-6">
      <CompanyUniverseCard className="p-6">
        <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Founders & leadership</div>
        <div className="mt-3 text-[16px] font-semibold text-white/92 leading-[1.35]">
          Founding voice → leadership craft → operating rhythm
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Founders</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/85">{foundersBlock}</div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">no outcomes promised • bounded interpretation</div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Leadership</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/85">{leadershipBlock}</div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">educational only • no trade execution</div>
          </div>
        </div>
      </CompanyUniverseCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <CompanyUniverseCard className="p-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Business model</div>
            <div className="mt-3 text-[16px] font-semibold text-white/92 leading-[1.35]">How capabilities are translated into market texture</div>
            <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{businessModelBlock}</div>
          </CompanyUniverseCard>
        </div>

        <div className="lg:col-span-6">
          <CompanyUniverseCard className="p-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Growth journey</div>
            <div className="mt-3 text-[16px] font-semibold text-white/92 leading-[1.35]">Execution cadence, read through time slices</div>
            <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{growthJourneyBlock}</div>
          </CompanyUniverseCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <CompanyUniverseCard className="p-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Current positioning</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/80">{positioningRailLabel}</div>
            <div className="mt-4 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">context lane • not an execution directive</div>
          </CompanyUniverseCard>
        </div>

        <div className="lg:col-span-4">
          <CompanyUniverseCard className="p-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Industry relevance</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/80">{industryRelevanceBlock}</div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">educational • calm sector lens</div>
          </CompanyUniverseCard>
        </div>

        <div className="lg:col-span-4">
          <CompanyUniverseCard className="p-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Market share</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/80">{marketShareBlock}</div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">indicative band • not certainty</div>
          </CompanyUniverseCard>
        </div>
      </div>

      {!beginner && (
        <CompanyUniverseCard className="p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Long-term direction</div>
              <div className="mt-3 text-[16px] font-semibold text-white/92 leading-[1.35]">Probabilistic documentary horizon</div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">bounded • educational • SEBI-safe</div>
          </div>
          <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{longTermBlock}</div>
        </CompanyUniverseCard>
      )}
    </div>
  );

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <CompanyUniverseSectionHeader
          kicker="MARKET STORY & NARRATIVE LAYER"
          title="A guided company explanation (market-research style)"
          subtitle="Clear structure for what the company does, why it matters, and how to interpret it calmly—no hype, no certainty promises."
        />

        <ProgressiveDisclosure
          front={front}
          steps={[
            {
              id: "expanded_story",
              label: beginner ? "Deeper company narrative" : "Expanded company narrative",
              content: expanded,
            },
          ]}
          collapsedCtaLabel="Expand company story"
          collapseCtaLabel="Collapse"
          initialOpen={false}
          initialStepIndex={0}
          debugLabel="company_market_story_layer"
        />
      </div>
    </section>
  );
}
