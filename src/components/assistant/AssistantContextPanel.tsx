import React, { useMemo, useState } from "react";
import { useConfidenceEngine, type ConfidenceState, type ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import type { SectorId } from "../../services/portfolio/portfolioIntelligenceEngine";
import type { MarketState } from "../../services/intelligence/marketState";
import HolographicFinancialConceptExplainer, { type FinancialConceptKey } from "../explanations/HolographicFinancialConceptExplainer";

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
      return "Elevated Risk";
  }
}

function volatilityLabelFromMarketState(marketState: MarketState): string {
  switch (marketState) {
    case "Elevated Volatility":
      return "Volatility: elevated sensitivity";
    case "Broad Weakness":
    case "Momentum Fragmentation":
      return "Volatility: active but interpretively selective";
    default:
      return "Volatility: comparatively restrained";
  }
}

function breadthLabelFromMarketState(marketState: MarketState): string {
  // We keep this educational; no numeric claims.
  switch (marketState) {
    case "Broad Weakness":
    case "Momentum Fragmentation":
      return "Breadth: narrower participation (context becomes more selective)";
    case "Liquidity Compression":
      return "Breadth: supportive but liquidity-conditioned (sector themes stand out more)";
    default:
      return "Breadth: supportive participation (narratives stay continuity-first)";
  }
}

function toneLabelFromMarketState(marketState: MarketState): string {
  switch (marketState) {
    case "Institutional Accumulation":
      return "Institutional posture: constructive alignment";
    case "Defensive Rotation":
      return "Institutional posture: composed with protective framing";
    case "Liquidity Compression":
      return "Institutional posture: steady but pacing-aware";
    case "Elevated Volatility":
    case "Momentum Fragmentation":
      return "Institutional posture: selective (timing boundaries matter more)";
    default:
      return "Institutional posture: supportive stability";
  }
}

function Pill({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="rounded-full border border-white/10 bg-black/25 px-[12px] py-[6px] text-[11px] uppercase tracking-[0.18em] text-white/65">
      {children}
    </div>
  );
}

function envGlowShadow(confidenceState: ConfidenceState, theme: ConfidenceTheme): string {
  const g =
    confidenceState === "ELEVATED_RISK"
      ? theme.warningGlow
      : confidenceState === "MOMENTUM_WEAKENING"
        ? theme.magentaGlow
        : theme.cyanGlow;

  return `0 0 120px ${g}`;
}

export default function AssistantContextPanel(props: {
  preferredSectors?: SectorId[];
  portfolioEnvironmentLabel?: string;
}): JSX.Element {
  const { state, theme, marketState } = useConfidenceEngine();

  const [openConcept, setOpenConcept] = useState<FinancialConceptKey | null>(null);
  const closeExplainer = () => setOpenConcept(null);

  const preferred = props.preferredSectors ?? [];

  const relevantSectors = useMemo(() => {
    const fallback: SectorId[] = ["Banking", "IT", "Energy"];
    const list = preferred.length ? preferred.slice(0, 3) : fallback;
    return list;
  }, [preferred]);

  const envLabel = confidenceLabel(state);

  const volatilityLabel = volatilityLabelFromMarketState(marketState);
  const breadthLabel = breadthLabelFromMarketState(marketState);
  const toneLabel = toneLabelFromMarketState(marketState);

  return (
    <>
      <aside
      className="w-[340px] max-w-[340px] rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
      style={{ boxShadow: envGlowShadow(state, theme) }}
    >
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Adaptive intelligence context</div>

      <div className="mt-3 text-[20px] font-semibold text-white/92">{envLabel}</div>

      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Market environment</div>
        <div className="mt-2 text-[13px] leading-[1.6] text-white/85">{volatilityLabel}</div>
        <div className="mt-1 text-[13px] leading-[1.6] text-white/70">{breadthLabel}</div>
        <div className="mt-3 text-[13px] leading-[1.6] text-white/80">{toneLabel}</div>
        <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">Mode: {marketState}</div>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Relevant sectors</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {relevantSectors.map((s) => (
            <Pill key={s}>{s}</Pill>
          ))}
        </div>

        {props.portfolioEnvironmentLabel && (
          <div className="mt-4 text-[13px] leading-[1.7] text-white/80">
            Portfolio environment: {props.portfolioEnvironmentLabel}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Tap to learn</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpenConcept("liquidity")}
            className="rounded-full border border-white/10 bg-black/25 px-[12px] py-[6px] text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/90 hover:border-white/20 transition"
          >
            Liquidity
          </button>
          <button
            type="button"
            onClick={() => setOpenConcept("volatility")}
            className="rounded-full border border-white/10 bg-black/25 px-[12px] py-[6px] text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/90 hover:border-white/20 transition"
          >
            Volatility
          </button>
        </div>

        <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Calm concept explanation • non-intrusive
        </div>
      </div>

      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
        Educational framing • no certainty claims • no execution
      </div>
    </aside>

      {openConcept !== null && (
        <HolographicFinancialConceptExplainer concept={openConcept} open={true} onClose={closeExplainer} />
      )}
      </>
    );
}
