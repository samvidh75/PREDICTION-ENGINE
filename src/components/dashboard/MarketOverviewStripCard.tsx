import React, { useMemo } from "react";
import type { MarketComposite, MarketConnectionStatus } from "../../services/market/marketService";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";

type Props = {
  marketSnapshot: MarketComposite;
  connectionStatus: MarketConnectionStatus;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
};

type StripItem = {
  id: string;
  label: string;
  valueText: string;
  interpret: string;
  glowKey: "cyan" | "magenta" | "warning" | "deep";
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function flowToneLabel(tone: number): string {
  if (tone >= 0.4) return "Institutional bias";
  if (tone >= 0.1) return "Institutional support";
  if (tone <= -0.4) return "Caution tone";
  if (tone <= -0.1) return "Filtered caution";
  return "Balanced institutional posture";
}

function interpretForBreadth(breadthPct: number, conf: ConfidenceState): string {
  const isRisk = conf === "ELEVATED_RISK";
  const isWeak = conf === "MOMENTUM_WEAKENING";

  if (isRisk) return "Breadth narrows → participation becomes sensitive.";
  if (isWeak) return "Breadth moderates → interpretation stays structured.";
  if (breadthPct <= 52) return "Breadth remains moderate → confidence tone stays calm.";
  return "Breadth supportive → context stays orderly.";
}

export default function MarketOverviewStripCard({
  marketSnapshot,
  connectionStatus,
  confidenceState,
  theme,
  beginner = false,
}: Props): JSX.Element {
  const { marketState } = marketSnapshot;

  const items = useMemo<StripItem[]>(() => {
    const nifty = clamp(marketState.nifty, 15000, 40000);
    const sensex = clamp(marketState.sensex, 50000, 120000);
    const bankNifty = clamp(marketState.bankNifty, 25000, 80000);
    const vix = clamp(marketState.vix, 8, 30);
    const breadthPct = clamp(marketState.breadthPct, 25, 85);
    const fiiDiiTone = clamp(marketState.fiiDiiTone, -2, 2);

    const isRisk = confidenceState === "ELEVATED_RISK";
    const isWeak = confidenceState === "MOMENTUM_WEAKENING";

    const breadthInterpret = interpretForBreadth(breadthPct, confidenceState);

    const vixInterpret =
      vix >= 15
        ? "India VIX is elevated—volatility conditions remain active but not chaotic."
        : vix >= 13
          ? "India VIX is moderate—volatility pressure concentrates in pockets."
          : "India VIX stays contained—volatility conditions are calm and orderly.";

    const flowLabel = flowToneLabel(fiiDiiTone);
    const flowInterpret =
      fiiDiiTone >= 0
        ? "Institutional flows show constructive bias; retail tone stays filtered."
        : "Institutional bias softens; liquidity conditions become the main stabilizer.";

    const glowKey: StripItem["glowKey"] = isRisk ? "warning" : isWeak ? "magenta" : confidenceState === "CONFIDENCE_RISING" ? "cyan" : "deep";

    return [
      {
        id: "strip_nifty",
        label: "Nifty",
        valueText: nifty.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        interpret: isRisk ? "Nifty holds structure while volatility remains a conditioning factor." : isWeak ? "Index levels remain resilient despite selective weakness across breadth." : "Nifty remains supported with constructive participation signals.",
        glowKey,
      },
      {
        id: "strip_sensex",
        label: "Sensex",
        valueText: sensex.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        interpret: isRisk ? "Sensex maintains a controlled posture as risk sensitivity rises." : isWeak ? "Sensex stays resilient while momentum across mid-breadth softens." : "Sensex remains steady; leadership is selective and supportive.",
        glowKey,
      },
      {
        id: "strip_bank",
        label: "Bank Nifty",
        valueText: bankNifty.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        interpret: isRisk ? "Bank Nifty shows steadiness despite tighter uncertainty margins." : isWeak ? "Bank Nifty breadth is present but follow-through becomes more cautious." : "Bank Nifty strength remains intact with measured institutional tone.",
        glowKey,
      },
      {
        id: "strip_vix",
        label: "India VIX",
        valueText: vix.toFixed(1),
        interpret: vixInterpret,
        glowKey: isRisk ? "warning" : "deep",
      },
      {
        id: "strip_breadth",
        label: "Sector breadth",
        valueText: `${Math.round(breadthPct)}%`,
        interpret: breadthInterpret,
        glowKey: isWeak ? "magenta" : isRisk ? "warning" : "cyan",
      },
      {
        id: "strip_flows",
        label: "FII/DII tone",
        valueText: `${Math.round(fiiDiiTone * 10) / 10}`,
        interpret: `${flowLabel}: ${flowInterpret}`,
        glowKey: fiiDiiTone >= 0 ? "cyan" : "magenta",
      },
    ];
  }, [marketState, confidenceState]);

  const toneGlow = (key: StripItem["glowKey"]): string => {
    switch (key) {
      case "warning":
        return theme.warningGlow;
      case "magenta":
        return theme.magentaGlow;
      case "cyan":
        return theme.cyanGlow;
      case "deep":
      default:
        return theme.deepBlueGlow;
    }
  };

  const topLabel =
    connectionStatus === "connecting" || connectionStatus === "reconnecting"
      ? "Syncing market summary"
      : connectionStatus === "disconnected"
        ? "Telemetry offline"
        : beginner
          ? "Market summary (simplified, educational)"
          : "Market summary (educational)";

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Market summary</div>
          <div className="mt-2 text-[18px] font-semibold text-white/92 leading-[1.2]">{topLabel}</div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 whitespace-nowrap">context-first • no trade execution</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <div
            key={it.id}
            className="rounded-[22px] border border-white/10 bg-black/25 p-4 shadow-[0_0_40px_rgba(0,0,0,0.25)]"
            style={{
              boxShadow: `0 0 90px rgba(0,0,0,0.22), 0 0 40px ${toneGlow(it.glowKey)}`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">{it.label}</div>
                <div className="mt-2 text-[18px] font-semibold text-white/92 leading-[1.2]">{it.valueText}</div>
              </div>
              <div
                className="h-[10px] w-[10px] rounded-full shrink-0 mt-1"
                style={{
                  background: toneGlow(it.glowKey),
                  boxShadow: `0 0 18px ${toneGlow(it.glowKey)}`,
                  opacity: 0.9,
                }}
                aria-hidden="true"
              />
            </div>

            <div className="mt-3 text-[13px] leading-[1.6] text-white/75">{it.interpret}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
