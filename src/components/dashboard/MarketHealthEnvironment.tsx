import React, { useMemo } from "react";
import type { NeuralMarketSynthesis, NeuralHealthometerState } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import HealthometerEcosystem from "../healthometer/HealthometerEcosystem";
import { toHealthUxState } from "../healthometer/healthometerUxStateMapping";

type Props = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
};

function labelForHealth(state: NeuralHealthometerState): string {
  return toHealthUxState(state);
}

function glowForConfidence(conf: ConfidenceState, theme: ConfidenceTheme): string {
  if (conf === "ELEVATED_RISK") return theme.warningGlow;
  if (conf === "MOMENTUM_WEAKENING") return theme.magentaGlow;
  if (conf === "CONFIDENCE_RISING") return theme.cyanGlow;
  return theme.deepBlueGlow;
}

export default function MarketHealthEnvironment({ synthesis, confidenceState, theme, beginner = false }: Props): JSX.Element {
  const glow = useMemo(() => glowForConfidence(confidenceState, theme), [confidenceState, theme]);

  const compact = beginner;

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Market Health Environment</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">The emotional centre (educational)</div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            {compact ? "Beginner clarity • simplified" : "Health rendering"}
          </div>
        </div>

        <div
          className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]"
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 0 120px ${glow}` }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Current health state</div>
              <div className="mt-3 text-[28px] font-semibold leading-[1.1] text-white/92">{labelForHealth(synthesis.healthometer.state)}</div>
              <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{synthesis.healthometer.rationale}</div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Confidence boundary</div>
                <div className="mt-2 text-[14px] leading-[1.7] text-white/85">{synthesis.healthometer.confidenceMarginText}</div>
                <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  probabilistic health • no certainty claims
                </div>
              </div>
            </div>

            {!compact && (
              <div className="lg:w-[420px]">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Display states</div>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {(
                    [
                      "Structurally Healthy",
                      "Stable Expansion",
                      "Confidence Improving",
                      "Volatility Sensitive",
                      "Liquidity Fragile",
                      "Structurally Weakening",
                    ] as NeuralHealthometerState[]
                  ).map((hs) => {
                    const active = hs === synthesis.healthometer.state;
                    const bg = active ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0)";
                    const border = active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)";
                    const shadow = active ? glow : "none";
                    return (
                      <div
                        key={hs}
                        className="rounded-[18px] border p-4"
                        style={{
                          background: bg,
                          borderColor: border,
                          boxShadow: shadow === "none" ? undefined : `0 0 40px ${shadow}`,
                        }}
                      >
                        <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{labelForHealth(hs)}</div>
                        <div className="mt-2 text-[13px] leading-[1.7] text-white/80">
                          {hs === "Volatility Sensitive"
                            ? "Volatility texture drives pacing sensitivity (educational)"
                            : hs === "Liquidity Fragile"
                              ? "Liquidity constraints tighten interpretation margins (educational)"
                              : "Structural tone remains guarded (educational)"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

            <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
            no buy/sell framing • educational interpretation only
          </div>

          {!compact && (
            <div className="mt-6">
              <HealthometerEcosystem
                synthesis={synthesis}
                confidenceState={confidenceState}
                theme={theme}
                beginner={compact}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
