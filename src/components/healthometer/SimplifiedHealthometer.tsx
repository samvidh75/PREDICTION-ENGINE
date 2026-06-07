import React, { useMemo } from "react";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import { toHealthUxState, type HealthUxState } from "./healthometerUxStateMapping";

type Props = {
  synthesis: NeuralMarketSynthesis;
  theme: ConfidenceTheme;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function healthSummary(health: HealthUxState): string {
  switch (health) {
    case "Very Healthy":
      return "Strong overall performance.";
    case "Healthy":
      return "Good fundamentals with stable momentum.";
    case "Stable":
      return "Steady posture with balanced interpretation.";
    case "Weakening":
      return "Signals are softening—momentum is fading.";
    case "Unhealthy":
    default:
      return "Under pressure—performance is deteriorating.";
  }
}

function healthGlow(health: HealthUxState, theme: ConfidenceTheme): string {
  switch (health) {
    case "Very Healthy":
    case "Healthy":
      return theme.cyanGlow;
    case "Stable":
      return theme.deepBlueGlow;
    case "Weakening":
      return theme.warningGlow;
    case "Unhealthy":
    default:
      return theme.magentaGlow;
  }
}

export default function SimplifiedHealthometer({ synthesis, theme }: Props): JSX.Element {
  const { health, percent, glow, summary } = useMemo(() => {
    const healthUx = toHealthUxState(synthesis.healthometer.state);
    const rawScore = synthesis.healthometer.categoryEvaluation?.overallScore01 ?? 0.7;
    const pct = clamp(Math.round(rawScore * 100), 0, 100);

    return {
      health: healthUx,
      percent: pct,
      glow: healthGlow(healthUx, theme),
      summary: healthSummary(healthUx),
    };
  }, [synthesis.healthometer.categoryEvaluation?.overallScore01, synthesis.healthometer.state, theme]);

  const r = 46;
  const cx = 60;
  const cy = 60;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - percent / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="ss-ty-card-label" style={{ ["--ss-ty-card-label-color" as never]: "rgba(255,255,255,0.65)" }}>
        STOCK HEALTH
      </div>

      <div className="mt-5 relative flex items-center justify-center" style={{ width: 164, height: 164 }}>
        <svg width="164" height="164" viewBox="0 0 120 120" aria-label={`Stock health ${health} at ${percent}%`}>
          <defs>
            <filter id="ss-health-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={glow} floodOpacity="0.45" />
            </filter>
          </defs>

          <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.10)" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={glow}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ filter: "url(#ss-health-glow)" }}
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center">
          <div
            className="ss-ty-metric-value"
            style={{
              fontSize: 30,
              lineHeight: 1.0,
              color: "rgba(255,255,255,0.96)",
              textShadow: "0 0 24px rgba(0,255,210,0.08)",
            }}
          >
            {percent}%
          </div>
        </div>
      </div>

      <div className="mt-4 text-[14px] font-semibold text-white/92">{health}</div>
      <div className="mt-1 text-[13px] leading-[1.7] text-white/80 text-center">{summary}</div>

      {/* small glow line to mimic reference “engineered” finish */}
      <div className="mt-5 h-[1px] w-[160px]" style={{ background: "rgba(255,255,255,0.08)", boxShadow: `0 0 40px ${glow}` }} />
    </div>
  );
}
