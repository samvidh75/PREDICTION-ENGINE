import React, { useMemo } from "react";
import type { NeuralMarketSynthesis, NeuralHealthometerState } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";

type Props = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  marketStateLabel: string;
  beginner?: boolean;
};

function labelForVolatility(conf: ConfidenceState): string {
  switch (conf) {
    case "ELEVATED_RISK":
      return "Volatility active • interpretive margins tighten";
    case "MOMENTUM_WEAKENING":
      return "Momentum selective • confirmation cycles lengthen";
    case "CONFIDENCE_RISING":
      return "Stability with constructive bias";
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return "Contained conditions • structured clarity";
  }
}

function labelForHealth(state: NeuralHealthometerState): string {
  switch (state) {
    case "Structurally Healthy":
      return "Structurally Healthy";
    case "Stable Expansion":
      return "Stable Expansion";
    case "Confidence Improving":
      return "Confidence Improving";
    case "Volatility Sensitive":
      return "Volatility Sensitive";
    case "Liquidity Fragile":
      return "Liquidity Fragile";
    case "Structurally Weakening":
    default:
      return "Structurally Weakening";
  }
}

function glowForState(conf: ConfidenceState, theme: ConfidenceTheme): string {
  if (conf === "ELEVATED_RISK") return theme.warningGlow;
  if (conf === "MOMENTUM_WEAKENING") return theme.magentaGlow;
  if (conf === "CONFIDENCE_RISING") return theme.cyanGlow;
  return theme.deepBlueGlow;
}

export default function CentralIntelligenceCore({
  synthesis,
  confidenceState,
  theme,
  marketStateLabel,
  beginner = false,
}: Props): JSX.Element {
  const glow = useMemo(() => glowForState(confidenceState, theme), [confidenceState, theme]);

  const volatilityLabel = useMemo(() => labelForVolatility(confidenceState), [confidenceState]);

  const cards = useMemo(() => {
    const health = synthesis.healthometer;

    const items: Array<{ title: string; body: string; glow: string }> = [
      {
        title: "Overall market conditions",
        body: `${synthesis.confidenceEnvironmentLabel} • ${marketStateLabel.replaceAll("_", " ")}`,
        glow: theme.cyanGlow,
      },
      {
        title: "Market health",
        body: `${labelForHealth(health.state)} — ${health.rationale}`,
        glow: glow,
      },
      {
        title: "Liquidity atmosphere",
        body: `${synthesis.liquidityIntelligenceCore}`,
        glow: theme.deepBlueGlow,
      },
      {
        title: "Volatility state",
        body: `${volatilityLabel}`,
        glow: confidenceState === "ELEVATED_RISK" ? theme.warningGlow : theme.magentaGlow,
      },
      {
        title: "Institutional participation",
        body: `${synthesis.institutionalBehaviour}`,
        glow: theme.cyanGlow,
      },
      {
        title: "Macro pressure",
        body: `${synthesis.macroGeopolitical.headline}. ${synthesis.macroGeopolitical.body}`,
        glow: theme.deepBlueGlow,
      },
    ];

    // Beginner mode: keep only 4 cards (reduce density, preserve the “centrepiece” feel).
    if (beginner) return [items[0], items[1], items[2], items[4]];

    return items;
  }, [
    beginner,
    confidenceState,
    glow,
    marketStateLabel,
    synthesis.confidenceEnvironmentLabel,
    synthesis.healthometer,
    synthesis.institutionalBehaviour,
    synthesis.liquidityIntelligenceCore,
    synthesis.macroGeopolitical.body,
    synthesis.macroGeopolitical.headline,
    theme.cyanGlow,
    theme.deepBlueGlow,
    theme.magentaGlow,
    theme.warningGlow,
    volatilityLabel,
  ]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-12">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Central Intelligence Core</div>
            <div className="mt-3 text-[26px] font-medium text-white/92 leading-[1.1]">
              Holographic neural condition nucleus (educational)
            </div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/80 max-w-[90ch]">
              A calm, probabilistic orchestration of market health, liquidity texture, volatility posture, and macro pressure.
              No certainty claims. No recommendations.
            </div>
          </div>

          <div
            className="relative shrink-0 rounded-[999px] border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[10px] inline-flex items-center gap-3"
            style={{
              boxShadow: `0 0 70px rgba(0,0,0,0.25), 0 0 120px ${glow}`,
            }}
          >
            <div
              className="h-[10px] w-[10px] rounded-full"
              style={{
                background: glow,
                boxShadow: `0 0 18px ${glow}`,
              }}
              aria-hidden="true"
            />
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/65">confidence boundary</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              {synthesis.healthometer.confidenceMarginText}
            </div>
          </div>
        </div>

        <div
          className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]"
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 0 120px ${glow}` }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.title}
                className="rounded-[22px] border border-white/10 bg-black/25 p-5"
                style={{
                  boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 70px rgba(0,0,0,0), 0 0 50px ${c.glow}`,
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">{c.title}</div>
                <div className="mt-2 text-[14px] leading-[1.8] text-white/85">{c.body}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
            probabilistic intelligence only • educational framing • no trade execution
          </div>
        </div>
      </div>
    </section>
  );
}
