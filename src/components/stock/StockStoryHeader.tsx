import React, { useMemo } from "react";
import type { CompanyHealthState } from "../../types/CompanyUniverse";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import useCompanyLiveTelemetry, { formatINRPrice } from "../companyUniverse/useCompanyLiveTelemetry";

type Props = {
  companyName: string;
  ticker: string;
  sector: string;
  exchangeLabel: string; // use "—" if unknown
  confidenceState: ConfidenceState;
  confidenceTheme: ConfidenceTheme;
  companyHealthState: CompanyHealthState;
};

function labelForConfidence(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Increased sector rotation";
    case "STABLE_CONVICTION":
      return "Stable market conditions";
    case "NEUTRAL_ENVIRONMENT":
      return "Liquidity improving";
    case "MOMENTUM_WEAKENING":
      return "Elevated sector drift";
    case "ELEVATED_RISK":
      return "Elevated volatility";
  }
}

function pillForMove(pct: number, theme: ConfidenceTheme): { fg: string; glow: string } {
  if (!Number.isFinite(pct)) return { fg: "rgba(255,255,255,0.85)", glow: theme.deepBlueGlow };
  if (pct > 0.01) return { fg: "rgba(0,255,210,0.95)", glow: theme.cyanGlow };
  if (pct < -0.01) return { fg: "rgba(209,107,165,0.95)", glow: theme.magentaGlow };
  return { fg: "rgba(200,215,255,0.85)", glow: theme.deepBlueGlow };
}

function formatSignedPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export default function StockStoryHeader({
  companyName,
  ticker,
  sector,
  exchangeLabel,
  confidenceState,
  confidenceTheme,
  companyHealthState,
}: Props): JSX.Element {
  const snap = useCompanyLiveTelemetry({
    ticker,
    confidenceState,
    companyHealthState,
    enabled: true,
    tickMs: 1200,
  });

  const moveTone = useMemo(() => pillForMove(snap.dailyChangePct, confidenceTheme), [snap.dailyChangePct, confidenceTheme]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-4 lg:p-6 shadow-[0_0_50px_rgba(0,0,0,0.35)] h-[220px] lg:h-[320px] flex flex-col justify-between overflow-hidden">
      <div className="flex flex-col justify-between h-full w-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="ss-ty-micro-label">
              {sector} • {exchangeLabel}
            </div>
            <div className="ss-ty-hero-title mt-1" style={{ marginTop: 0 }}>
              {companyName}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="ss-ty-micro-label">{ticker}</div>
              <div
                className="h-[6px] w-[6px] rounded-full"
                style={{
                  background: moveTone.glow,
                  boxShadow: `0 0 18px ${moveTone.glow}`,
                }}
              />
              <div className="ss-ty-nav-label" style={{ ["--ss-ty-nav-label-color" as never]: "rgba(255,255,255,0.65)" }}>
                {labelForConfidence(confidenceState)}
              </div>
            </div>
          </div>

          <div
            className="rounded-full border border-white/10 bg-black/30 px-[14px] py-[10px] shrink-0"
            style={{ boxShadow: `0 0 22px ${moveTone.glow}` }}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Live Price</div>
            <div className="mt-1 text-[18px] font-semibold" style={{ color: moveTone.fg }}>
              {formatINRPrice(snap.price)}
            </div>
            <div className="mt-1 text-[12px] uppercase tracking-[0.18em] text-white/45">{formatSignedPct(snap.dailyChangePct)} today</div>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-3 gap-3 mt-auto">
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Market Activity</div>
            <div className="mt-2 text-[15px] font-semibold text-white/92">{Math.round(snap.liquidityParticipation * 100)}%</div>
            <div className="mt-2 text-[12px] leading-[1.7] text-white/75">
              {snap.liquidityParticipation >= 0.62
                ? "Strong depth supporting stable trends."
                : snap.liquidityParticipation >= 0.48
                  ? "Moderate activity levels."
                  : "Lower activity—pacing increases."}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Market Outlook</div>
            <div className="mt-2 text-[15px] font-semibold text-white/92">{Math.round(snap.volatilityEnvironment * 100)}%</div>
            <div className="mt-2 text-[12px] leading-[1.7] text-white/75">
              {snap.volatilityEnvironment >= 0.72
                ? "Elevated movement—observe stability signs."
                : snap.volatilityEnvironment >= 0.55
                  ? "Moderate movement."
                  : "Calm and steady movement."}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Volume</div>
            <div className="mt-2 text-[15px] font-semibold text-white/92">{snap.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="mt-2 text-[12px] leading-[1.7] text-white/75">Volume measures total shares traded during the active session.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
