import React, { useMemo } from "react";
import type { NeuralMarketSynthesis, NeuralHealthometerState } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import OpportunityDiscoveryMatrix from "../scanner/OpportunityDiscoveryMatrix";

type Props = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
};

function labelForHealth(state: NeuralHealthometerState): string {
  return state;
}

function seiSafeLine(): string {
  return "SEBI-safe • educational probabilistic lens • no recommendations • no certainty claims • no trade execution framing";
}

export default function HealthometerEcosystem({
  synthesis,
  confidenceState,
  theme,
  beginner = false,
}: Props): JSX.Element {
  const glows = useMemo(
    () => ({
      cyanGlow: theme.cyanGlow,
      warningGlow: theme.warningGlow,
      magentaGlow: theme.magentaGlow,
      deepBlueGlow: theme.deepBlueGlow,
    }),
    [theme],
  );

  const showDense = !beginner;

  const system1Structural: React.ReactNode = (
    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Structural Health Core</div>
      <div className="mt-3 text-[28px] font-semibold leading-[1.1] text-white/92">{labelForHealth(synthesis.healthometer.state)}</div>
      <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{synthesis.healthometer.rationale}</div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Confidence boundary</div>
        <div className="mt-2 text-[14px] leading-[1.7] text-white/85">{synthesis.healthometer.confidenceMarginText}</div>
        <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">probabilistic tone • no certainty claims</div>
      </div>
    </div>
  );

  const system2ProbabilisticEngine: React.ReactNode = (
    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Probabilistic Intelligence Engine</div>
      <div className="mt-3 text-[20px] font-medium text-white/92">{synthesis.narrative.editorialHeadline}</div>
      <div className="mt-3 text-[14px] leading-[1.9] text-white/80">{synthesis.narrative.cinematicBody}</div>
      <div className="mt-3 text-[12px] uppercase tracking-[0.18em] text-white/45">{synthesis.narrative.conditionsNote}</div>
    </div>
  );

  const system3Matrix: React.ReactNode = (
    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Multi-Parameter Evaluation Matrix</div>
      <div className="mt-3 text-[14px] leading-[1.9] text-white/80">
        150+ structural cues are interpreted into calm context lenses (not predictions).
      </div>
      <div className="mt-5">
        <OpportunityDiscoveryMatrix synthesis={synthesis} confidenceState={confidenceState} glows={glows} />
      </div>
    </div>
  );

  const system4Institutional: React.ReactNode = (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Institutional Confidence Layer</div>
      <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{synthesis.institutionalBehaviour}</div>
    </div>
  );

  const system5Macro: React.ReactNode = (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Macro Resilience System</div>
      <div className="mt-3 text-[14px] font-semibold text-white/92">{synthesis.macroGeopolitical.headline}</div>
      <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{synthesis.macroGeopolitical.body}</div>
    </div>
  );

  const system6VolatilityMatrix: React.ReactNode = (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Volatility & Stability Matrix</div>
      <div className="mt-3 text-[13px] leading-[1.8] text-white/80">
        Healthometer state and confidence boundary describe stability/volatility posture as a learning tone.
        {` `}Margin stays bounded and educational: {synthesis.healthometer.confidenceMarginText}
      </div>
    </div>
  );

  const system7SectorPositioning: React.ReactNode = (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Sector Positioning Intelligence</div>
      <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{synthesis.sectorRotationMatrix}</div>
    </div>
  );

  const system8FutureProbability: React.ReactNode = (
    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Future Probability Environment</div>
      <div className="mt-3 text-[14px] leading-[1.9] text-white/85">{synthesis.futureProbabilityFramework}</div>
      <div className="mt-4 text-[12px] uppercase tracking-[0.18em] text-white/45">NOT a forecast • interpreted as sensitivity tone</div>
    </div>
  );

  const system9CinematicRendering: React.ReactNode = (
    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Cinematic Health Rendering Engine</div>
      <div className="mt-3 text-[14px] leading-[1.9] text-white/80">
        The visuals breathe with the confidence lens, keeping emotional tone calm and computational.
      </div>
      <div className="mt-4 text-[12px] uppercase tracking-[0.18em] text-white/45">
        state={synthesis.healthometer.state} • confidence={confidenceState}
      </div>
    </div>
  );

  const system10SEBI: React.ReactNode = (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">SEBI-Safe Intelligence Framework</div>
      <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{seiSafeLine()}</div>
    </div>
  );

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Healthometer ecosystem</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Probabilistic business-health intelligence (educational)</div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{beginner ? "Beginner mode • simplified lens" : "Full ecosystem • deep context"}</div>
        </div>

        <div className="space-y-6">
          {system1Structural}
          {system2ProbabilisticEngine}
          {showDense && system3Matrix}

          {showDense && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {system4Institutional}
              {system5Macro}
              {system6VolatilityMatrix}
              {system7SectorPositioning}
            </div>
          )}

          {system8FutureProbability}
          {system9CinematicRendering}
          {system10SEBI}
        </div>
      </div>
    </section>
  );
}
