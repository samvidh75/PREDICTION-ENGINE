import React from "react";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import SimplifiedHealthometer from "../healthometer/SimplifiedHealthometer";

type Props = {
  synthesis: NeuralMarketSynthesis;
  theme: ConfidenceTheme;
  confidenceState: ConfidenceState;
  beginner?: boolean;
};

export default function MarketHealthEnvironment({ synthesis, theme }: Props): JSX.Element {
  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Stock Health</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Simple, readable performance state</div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Beginner-friendly / 5 states</div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
          <SimplifiedHealthometer synthesis={synthesis} theme={theme} />
          <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
            Calm summary / no jargon
          </div>
        </div>
      </div>
    </section>
  );
}
