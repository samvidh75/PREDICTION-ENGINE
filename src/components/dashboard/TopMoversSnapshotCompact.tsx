import React, { useMemo } from "react";
import type { MarketComposite, MarketConnectionStatus } from "../../services/market/marketService";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";

type Props = {
  marketSnapshot: MarketComposite;
  connectionStatus: MarketConnectionStatus;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatIndexValue(n: number): string {
  // Calm formatting: no heavy precision
  if (Math.abs(n) >= 100000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function toneForConfidence(conf: ConfidenceState): { label: string; glow: string } {
  switch (conf) {
    case "ELEVATED_RISK":
      return { label: "Elevated-volatility lens", glow: "warning" };
    case "MOMENTUM_WEAKENING":
      return { label: "Momentum-selective lens", glow: "magenta" };
    case "CONFIDENCE_RISING":
      return { label: "Constructive-confidence lens", glow: "cyan" };
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return { label: "Continuity-first lens", glow: "deep" };
  }
}

function sublabel(conf: ConfidenceState): { nifty: string; sensex: string; bank: string } {
  switch (conf) {
    case "ELEVATED_RISK":
      return {
        nifty: "Structure holds • volatility conditioning",
        sensex: "Controlled posture • risk-aware leadership",
        bank: "Steadiness • uncertainty margins tighten",
      };
    case "MOMENTUM_WEAKENING":
      return {
        nifty: "Resilient • momentum-selective breadth",
        sensex: "Stable • follow-through measured",
        bank: "Breadth present • caution in pacing",
      };
    case "CONFIDENCE_RISING":
      return {
        nifty: "Supported • participation constructive",
        sensex: "Steady leadership • calm confidence",
        bank: "Strength intact • institutional support",
      };
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return {
        nifty: "Composed • educational alignment",
        sensex: "Balanced • continuity-first",
        bank: "Guarded but supportive • educational lens",
      };
  }
}

function glowFor(conf: ConfidenceState, theme: ConfidenceTheme): string {
  if (conf === "ELEVATED_RISK") return theme.warningGlow;
  if (conf === "MOMENTUM_WEAKENING") return theme.magentaGlow;
  if (conf === "CONFIDENCE_RISING") return theme.cyanGlow;
  return theme.deepBlueGlow;
}

export default function TopMoversSnapshotCompact({
  marketSnapshot,
  connectionStatus,
  confidenceState,
  theme,
}: Props): JSX.Element {
  const { marketState } = marketSnapshot;

  const topLabel = useMemo(() => {
    if (connectionStatus === "connecting" || connectionStatus === "reconnecting") return "Syncing index cues";
    if (connectionStatus === "disconnected") return "Offline snapshot";
    return "Important market movement";
  }, [connectionStatus]);

  const glow = useMemo(() => glowFor(confidenceState, theme), [confidenceState, theme]);
  const subs = useMemo(() => sublabel(confidenceState), [confidenceState]);

  const cards = useMemo(() => {
    const nifty = clamp(marketState.nifty, 15000, 40000);
    const sensex = clamp(marketState.sensex, 50000, 120000);
    const bankNifty = clamp(marketState.bankNifty, 25000, 80000);

    return [
      { id: "nifty", label: "Nifty", value: nifty, sub: subs.nifty },
      { id: "sensex", label: "Sensex", value: sensex, sub: subs.sensex },
      { id: "banknifty", label: "Bank Nifty", value: bankNifty, sub: subs.bank },
    ];
  }, [marketState.bankNifty, marketState.nifty, marketState.sensex, subs.bank, subs.nifty, subs.sensex]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/35 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{topLabel}</div>
          <div className="mt-2 text-[16px] font-semibold text-white/92">Index cues (educational)</div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45" style={{ boxShadow: `0 0 70px ${glow}` }}>
          tone: {toneForConfidence(confidenceState).label}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c, idx) => (
          <div
            key={c.id}
            className="rounded-[22px] border border-white/10 bg-black/25 p-4"
            style={{
              boxShadow: `0 0 120px rgba(0,0,0,0.18), 0 0 40px ${idx % 2 === 0 ? glow : "rgba(0,120,255,0.14)"}`,
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">{c.label}</div>
            <div className="mt-2 text-[18px] font-semibold text-white/92 leading-[1.1]">{formatIndexValue(c.value)}</div>
            <div className="mt-2 text-[13px] leading-[1.6] text-white/75">{c.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
