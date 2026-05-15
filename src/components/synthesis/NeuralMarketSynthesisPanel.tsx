import React, { useMemo } from "react";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import { useNeuralMarketSynthesisSuperengine } from "../../services/synthesis/useNeuralMarketSynthesisSuperengine";

type PanelProps = {
  compact?: boolean;
};

function pickTop<T>(arr: T[], count: number): T[] {
  return arr.slice(0, Math.max(0, count));
}

function healthometerLabel(state: NeuralMarketSynthesis["healthometer"]["state"]): string {
  return state;
}

export default function NeuralMarketSynthesisPanel({ compact = false }: PanelProps): JSX.Element {
  const { synthesis, connectionStatus } = useNeuralMarketSynthesisSuperengine();

  const quality = synthesis.quality;

  const timeline = useMemo(() => {
    const count = compact ? (quality === "low" ? 2 : 3) : quality === "low" ? 3 : 4;
    return pickTop(synthesis.timeline, count);
  }, [synthesis.timeline, compact, quality]);

  const scanners = useMemo(() => {
    const count = compact ? (quality === "low" ? 2 : 3) : quality === "low" ? 3 : 4;
    return pickTop(synthesis.scannerCards, count);
  }, [synthesis.scannerCards, compact, quality]);

  return (
    <section className="relative">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Neural Market Synthesis</div>
          <div className="mt-3 text-[22px] font-medium text-white/92">
            {compact ? "Probabilistic intelligence core" : "Cinematic probabilistic intelligence core"}
          </div>
        </div>

        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
          {connectionStatus === "connected" ? "live synthesis texture" : connectionStatus === "connecting" ? "connecting signal rail" : "synthesis offline frame"}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        {/* Top row: editorials */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Confidence environment headline</div>
            <div className="mt-2 text-[18px] leading-[1.6] text-white/92 font-semibold">{synthesis.narrative.editorialHeadline}</div>
            <div className="mt-3 text-[14px] leading-[1.8] text-white/80">{synthesis.narrative.cinematicBody}</div>
            <div className="mt-3 text-[12px] uppercase tracking-[0.18em] text-white/45">{synthesis.narrative.conditionsNote}</div>
          </div>

          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Neural Healthometer</div>
            <div className="mt-2 text-[20px] font-semibold text-white/92">{healthometerLabel(synthesis.healthometer.state)}</div>
            <div className="mt-3 text-[13px] leading-[1.7] text-white/80">{synthesis.healthometer.rationale}</div>
            <div className="mt-3 rounded-[18px] border border-white/10 bg-black/25 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Confidence boundary</div>
              <div className="mt-2 text-[13px] leading-[1.6] text-white/85">{synthesis.healthometer.confidenceMarginText}</div>
            </div>
          </div>
        </div>

        {/* Middle: layered interpretations */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Macro-geopolitical engine</div>
            <div className="mt-2 text-[14px] font-semibold text-white/92">{synthesis.macroGeopolitical.headline}</div>
            <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{synthesis.macroGeopolitical.body}</div>
            <div className="mt-3 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="mt-3 text-[13px] leading-[1.8] text-white/80">
              <span className="text-white/70">Liquidity intelligence:</span> {synthesis.liquidityIntelligenceCore}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Institutional + behavioural synthesis</div>
            <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{synthesis.institutionalBehaviour}</div>
            <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{synthesis.behaviouralPsychology}</div>
            <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{synthesis.sectorRotationMatrix}</div>
          </div>
        </div>

        {/* Bottom: timeline + scanners */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 rounded-[22px] border border-white/10 bg-black/25 p-5">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Future probability frame</div>
            <div className="mt-3 text-[13px] leading-[1.8] text-white/85">{synthesis.futureProbabilityFramework}</div>
          </div>

          <div className="lg:col-span-1 rounded-[22px] border border-white/10 bg-black/25 p-5">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Cinematic timeline anchors</div>
            <div className="mt-4 space-y-3">
              {timeline.map((t) => (
                <div key={t.id} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{t.whenLabel}</div>
                  <div className="mt-2 text-[13px] leading-[1.7] text-white/85">{t.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1 rounded-[22px] border border-white/10 bg-black/25 p-5">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">AI scanner architecture</div>
            <div className="mt-4 space-y-3">
              {scanners.map((c) => (
                <div key={c.id} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{c.title}</div>
                  <div className="mt-2 text-[13px] leading-[1.7] text-white/85">{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust line */}
        <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
          probabilistic intelligence only • educational framing • no trade execution • no certainty claims
        </div>
      </div>
    </section>
  );
}
