import React, { useMemo } from "react";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";

type Props = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  marketStateLabel: string;
  beginner?: boolean;
  maxCards?: 1 | 2;
};

function trendSummary(conf: ConfidenceState): string {
  switch (conf) {
    case "ELEVATED_RISK":
      return "Market pressure remains elevated with cautious movement.";

    case "MOMENTUM_WEAKENING":
      return "Momentum has slowed after recent market strength.";

    case "CONFIDENCE_RISING":
      return "Market confidence continues improving gradually.";

    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return "Market conditions remain stable overall.";
  }
}

function glowForState(conf: ConfidenceState, theme: ConfidenceTheme): string {
  if (conf === "ELEVATED_RISK") return theme.warningGlow;
  if (conf === "MOMENTUM_WEAKENING") return theme.magentaGlow;
  if (conf === "CONFIDENCE_RISING") return theme.cyanGlow;
  return theme.deepBlueGlow;
}

export default function DashboardKeyIntelligenceCards({
  synthesis,
  confidenceState,
  theme,
  marketStateLabel,
  beginner = false,
  maxCards = 2,
}: Props): JSX.Element {
  const glow = useMemo(() => glowForState(confidenceState, theme), [confidenceState, theme]);

  const cards = useMemo(() => {
    const c1 = {
      title: "Market Trend",
      body: `${synthesis.confidenceEnvironmentLabel} • ${marketStateLabel.replaceAll("_", " ")}`,
      glow: theme.cyanGlow,
    };

    const c2 = {
      title: "Healthometer",
      body: `${synthesis.healthometer.rationale}`,
      glow,
    };

    const c3 = {
      title: "Market Outlook",
      body: `${trendSummary(confidenceState)}`,
      glow:
        confidenceState === "ELEVATED_RISK"
          ? theme.warningGlow
          : theme.magentaGlow,
    };

    const list = [c1, c2, c3];

    if (beginner) {
      return list.slice(0, Math.min(2, maxCards));
    }

    return list.slice(0, Math.min(3, maxCards));
  }, [
    beginner,
    confidenceState,
    glow,
    marketStateLabel,
    synthesis.confidenceEnvironmentLabel,
    synthesis.healthometer.rationale,
    theme.cyanGlow,
    theme.deepBlueGlow,
    theme.magentaGlow,
    theme.warningGlow,
    maxCards,
  ]);

  return (
    <section className="relative z-[12]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.2em] text-cyan-200/70">
            Key Insights
          </div>

          <div className="mt-2 text-[18px] font-medium text-white/92">
            Simplified market overview
          </div>
        </div>

        <div className="whitespace-nowrap text-[11px] uppercase tracking-[0.18em] text-white/42">
          Clear insights • cleaner readability
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-black/20 p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <div
          className={
            cards.length === 1
              ? "grid grid-cols-1 gap-5"
              : "grid grid-cols-1 gap-5 sm:grid-cols-2"
          }
        >
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-[24px] border border-white/10 bg-black/25 p-5"
              style={{
                boxShadow: `0 0 70px rgba(0,0,0,0), 0 0 45px ${c.glow}`,
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/65">
                {c.title}
              </div>

              <div className="mt-3 text-[14px] leading-[1.9] text-white/82">
                {c.body}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/40">
          Premium market intelligence
        </div>
      </div>
    </section>
  );
}
