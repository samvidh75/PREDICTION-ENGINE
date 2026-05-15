import React, { useMemo } from "react";
import { useConfidenceEngine, type ConfidenceState, type ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import type { CompanyHealthState } from "../../types/CompanyUniverse";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import InstitutionalActivityNetwork from "../commandCentre/InstitutionalActivityNetwork";
import { CompanyUniverseCard } from "./CompanyUniverseSectionFrame";

function labelForConfidence(conf: ConfidenceState): string {
  switch (conf) {
    case "ELEVATED_RISK":
      return "Risk-conditioned institutional tone";
    case "MOMENTUM_WEAKENING":
      return "Momentum-selective institutional tone";
    case "CONFIDENCE_RISING":
      return "Constructive institutional confidence tone";
    case "NEUTRAL_ENVIRONMENT":
      return "Observational institutional tone";
    case "STABLE_CONVICTION":
    default:
      return "Stable institutional confidence tone";
  }
}

function miniInstitutionalSummary(args: {
  healthState: CompanyHealthState;
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
}): { headline: string; body: string } {
  const { healthState, synthesis, confidenceState } = args;

  const headline = (() => {
    if (confidenceState === "ELEVATED_RISK") return "Selective participation under volatility sensitivity";
    if (confidenceState === "MOMENTUM_WEAKENING") return "Defensive rotation cues interpreted calmly";
    if (confidenceState === "CONFIDENCE_RISING") return "Confidence improves as participation quality holds";
    if (confidenceState === "NEUTRAL_ENVIRONMENT") return "Institutional behaviour stays observational and steady";
    return "Institutional posture reads stable and continuity-first";
  })();

  const body = (() => {
    const macroLink = synthesis.sectorRotationMatrix;
    const inst = synthesis.institutionalBehaviour;
    const liq = synthesis.liquidityIntelligenceCore;
    const riskNote =
      healthState === "STRUCTURALLY_WEAKENING" || healthState === "LIQUIDITY_FRAGILE"
        ? "In this company context, institutional cues become more context-sensitive and less certainty-driven."
        : healthState === "VOLATILITY_SENSITIVE"
          ? "In this company context, volatility texture tightens interpretive margins while institutional participation remains a stabilizer."
          : "In this company context, institutional behaviour acts as a continuity anchor for learning tone.";

    return `${inst} • ${liq} • Sector attention is interpreted as context lens: ${macroLink}. ${riskNote} (Educational framing only.)`;
  })();

  return { headline, body };
}

export default function CompanyInstitutionalIntelligenceLayer({
  healthState,
  synthesis,
  confidenceState,
  theme,
  beginner = false,
}: {
  healthState: CompanyHealthState;
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
}): JSX.Element {
  const summary = useMemo(
    () => miniInstitutionalSummary({ healthState, synthesis, confidenceState }),
    [healthState, synthesis, confidenceState],
  );

  const glow = useMemo(() => {
    if (confidenceState === "ELEVATED_RISK") return theme.warningGlow;
    if (confidenceState === "MOMENTUM_WEAKENING") return theme.magentaGlow;
    if (confidenceState === "CONFIDENCE_RISING") return theme.cyanGlow;
    if (confidenceState === "NEUTRAL_ENVIRONMENT") return theme.deepBlueGlow;
    return theme.deepBlueGlow;
  }, [confidenceState, theme]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Institutional Intelligence Layer</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Liquidity corridors + participation web (educational)</div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{beginner ? "beginner • simplified" : "full • dense context"}</div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <CompanyUniverseCard className="p-6">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Institutional posture readout</div>
              <div className="mt-3 text-[20px] font-semibold text-white/92">{labelForConfidence(confidenceState)}</div>
              <div className="mt-3 text-[14px] leading-[1.9] text-white/80">{summary.headline}</div>

              <div className="mt-5 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />

              <div className="mt-4 text-[13px] leading-[1.85] text-white/78">{summary.body}</div>

              <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                Educational only • no recommendations • no execution framing
              </div>
            </CompanyUniverseCard>
          </div>

          <div className="lg:col-span-7">
            <CompanyUniverseCard className="p-6">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Participation web visualization</div>
              <div className="mt-2 text-[14px] leading-[1.8] text-white/80">
                Canvas-based institutional network: calm, strategic, and synchronized to market confidence tone.
              </div>

              <div className="mt-5" style={{ boxShadow: `0 0 90px ${glow}` }}>
                <InstitutionalActivityNetwork className="w-full" />
              </div>

              <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                Liquidity corridors • interpretive pulses • no trade flow framing
              </div>
            </CompanyUniverseCard>
          </div>
        </div>
      </div>
    </section>
  );
}
