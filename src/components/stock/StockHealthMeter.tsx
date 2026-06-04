import React, { useMemo } from "react";
import type { CompanyHealthState } from "../../types/CompanyUniverse";
import type { ConfidenceTheme } from "../intelligence/ConfidenceEngine";

type HealthUxState = "Very Healthy" | "Healthy" | "Stable" | "Weakening" | "Unhealthy";

type Props = {
  healthState: CompanyHealthState;
  theme: ConfidenceTheme;
  percent?: number; // optional override (otherwise deterministic from state)
  compact?: boolean;
};

function mapToUxState(state: CompanyHealthState): HealthUxState {
  switch (state) {
    case "STRUCTURALLY_HEALTHY":
      return "Very Healthy";
    case "STABLE_EXPANSION":
      return "Healthy";
    case "CONFIDENCE_IMPROVING":
      return "Stable";
    case "LIQUIDITY_FRAGILE":
      return "Weakening";
    case "VOLATILITY_SENSITIVE":
      return "Weakening";
    case "STRUCTURALLY_WEAKENING":
    default:
      return "Unhealthy";
  }
}

function summaryForUxState(state: HealthUxState): string {
  switch (state) {
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

function glowForUxState(state: HealthUxState, theme: ConfidenceTheme): string {
  switch (state) {
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

function percentForUxState(state: HealthUxState): number {
  switch (state) {
    case "Very Healthy":
      return 78;
    case "Healthy":
      return 65;
    case "Stable":
      return 55;
    case "Weakening":
      return 40;
    case "Unhealthy":
    default:
      return 25;
  }
}

export default function StockHealthMeter({ healthState, theme, percent, compact = false }: Props): JSX.Element {
  const ux = useMemo(() => mapToUxState(healthState), [healthState]);
  const glow = useMemo(() => glowForUxState(ux, theme), [ux, theme]);
  const summary = useMemo(() => summaryForUxState(ux), [ux]);
  const pct = percent ?? percentForUxState(ux);

  const [animatedPct, setAnimatedPct] = React.useState(0);

  React.useEffect(() => {
    // Cinematic 900ms load animation trigger
    const id = window.setTimeout(() => setAnimatedPct(pct), 50);
    return () => window.clearTimeout(id);
  }, [pct]);

  // Section 41 geometry:
  // Desktop: diameter 160px, ring thickness 12px
  // Mobile/Compact: diameter 120px, ring thickness 12px
  const diameter = compact ? 120 : 160;
  const strokeWidth = 12;

  // Center points & radii fitting perfectly within box bounds
  const cx = diameter / 2;
  const cy = diameter / 2;
  const r = (diameter - strokeWidth) / 2;

  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - animatedPct / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="ss-ty-card-label" style={{ ["--ss-ty-card-label-color" as never]: "rgba(255,255,255,0.65)" }}>
        STOCK HEALTH
      </div>

      <div className="mt-4 relative flex items-center justify-center" style={{ width: diameter, height: diameter }}>
        <svg
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
          aria-label={`Stock health ${ux} at ${pct}%`}
        >
          <defs>
            <filter id="ss-health-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={glow} floodOpacity="0.45" />
            </filter>
          </defs>

          <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
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
            style={{
              filter: "url(#ss-health-glow)",
              transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center">
          <div
            className="ss-ty-metric-value"
            style={{
              fontSize: compact ? 22 : 28,
              lineHeight: 1.0,
              color: "rgba(255,255,255,0.96)",
              textShadow: "0 0 24px rgba(0,255,210,0.08)",
            }}
          >
            {pct}%
          </div>
        </div>
      </div>

      <div className="mt-3 text-[16px] font-semibold text-white/92">{ux}</div>
      <div className="mt-1 text-[13px] leading-[1.7] text-white/80 text-center max-w-[240px]">{summary}</div>

      <div className="mt-4 h-[1px] w-[160px]" style={{ background: "rgba(255,255,255,0.08)", boxShadow: `0 0 40px ${glow}` }} />
    </div>
  );
}
