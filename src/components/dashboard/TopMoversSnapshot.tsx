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

function noteForConfidence(conf: ConfidenceState): string {
  switch (conf) {
    case "ELEVATED_RISK":
      return "Leadership stays structured while volatility pressure conditions the tape.";
    case "MOMENTUM_WEAKENING":
      return "Leadership becomes selective; follow-through softens in a calm, controlled way.";
    case "CONFIDENCE_RISING":
      return "Leadership remains constructive; participation is supportive and disciplined.";
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return "Leadership holds steady; breadth and institutional tone remain composed.";
  }
}

function toneForFiiDii(tone: number): string {
  if (tone >= 0.6) return "Institutional lead";
  if (tone >= 0.1) return "Institutional support";
  if (tone <= -0.6) return "Caution tone";
  if (tone <= -0.1) return "Filtered caution";
  return "Balanced tone";
}

export default function TopMoversSnapshot({
  marketSnapshot,
  connectionStatus,
  confidenceState,
  theme,
}: Props): JSX.Element {
  const { marketState } = marketSnapshot;

  const tone = useMemo(() => toneForFiiDii(marketState.fiiDiiTone), [marketState.fiiDiiTone]);

  const glow = useMemo(() => {
    if (confidenceState === "ELEVATED_RISK") return theme.warningGlow;
    if (confidenceState === "MOMENTUM_WEAKENING") return theme.magentaGlow;
    if (confidenceState === "CONFIDENCE_RISING") return theme.cyanGlow;
    return theme.deepBlueGlow;
  }, [confidenceState, theme]);

  const topLabel = useMemo(() => {
    if (connectionStatus === "connecting" || connectionStatus === "reconnecting") return "Syncing";
    if (connectionStatus === "disconnected") return "Offline snapshot";
    return "Top movers snapshot";
  }, [connectionStatus]);

  const cards = useMemo(() => {
    const nifty = clamp(marketState.nifty, 15000, 40000);
    const sensex = clamp(marketState.sensex, 50000, 120000);
    const bankNifty = clamp(marketState.bankNifty, 25000, 80000);

    return [
      {
        id: "nifty",
        name: "Nifty",
        value: nifty,
        sub:
          confidenceState === "ELEVATED_RISK"
            ? "Structure held • volatility-conditioned"
            : confidenceState === "MOMENTUM_WEAKENING"
              ? "Resilient • momentum selective"
              : confidenceState === "CONFIDENCE_RISING"
                ? "Supported • participation constructive"
                : "Composed • educational alignment",
      },
      {
        id: "sensex",
        name: "Sensex",
        value: sensex,
        sub:
          confidenceState === "ELEVATED_RISK"
            ? "Controlled posture • risk-aware"
            : confidenceState === "MOMENTUM_WEAKENING"
              ? "Stable • follow-through measured"
              : confidenceState === "CONFIDENCE_RISING"
                ? "Steady leadership • calm confidence"
                : "Balanced • continuity-first",
      },
      {
        id: "banknifty",
        name: "Bank Nifty",
        value: bankNifty,
        sub:
          confidenceState === "ELEVATED_RISK"
            ? "Steadiness under tighter uncertainty"
            : confidenceState === "MOMENTUM_WEAKENING"
              ? "Breadth present • caution in pacing"
              : confidenceState === "CONFIDENCE_RISING"
                ? "Strength intact • institutional support"
                : "Guarded but supportive • educational lens",
      },
    ];
  }, [marketState.bankNifty, marketState.nifty, marketState.sensex, confidenceState]);

  return (
    <section className="relative z-[12]">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{topLabel}</div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{tone}</div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div
              key={c.id}
              className="rounded-[24px] border border-white/10 bg-black/25 backdrop-blur-2xl p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
              style={{ boxShadow: `0 0 120px rgba(0,0,0,0.18), 0 0 40px ${glow}` }}
            >
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">{c.name}</div>
              <div className="mt-2 text-[22px] font-semibold text-white/92 leading-[1.1]">{formatIndexValue(c.value)}</div>
              <div className="mt-2 text-[13px] leading-[1.6] text-white/75">{c.sub}</div>
            </div>
          ))}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Context read</div>
              <div className="mt-2 text-[14px] leading-[1.8] text-white/85">{noteForConfidence(confidenceState)}</div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Breadth & volatility</div>
              <div className="mt-2 text-[14px] leading-[1.8] text-white/85">
                {Math.round(marketState.breadthPct)}% breadth • VIX {marketState.vix.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
