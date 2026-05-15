import React, { useEffect, useMemo, useRef, useState } from "react";
import { animate, useMotionValue, useReducedMotion, useMotionValueEvent } from "framer-motion";

import { useConfidenceEngine } from "../intelligence/ConfidenceEngine";
import type { MarketComposite, MarketConnectionStatus } from "../../services/market/marketService";

type PulseCard = {
  id: string;
  name: string;
  value: number;
  unit?: string;
  interpret: string;
};

type Props = {
  marketSnapshot: MarketComposite;
  connectionStatus: MarketConnectionStatus;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function AnimatedNumber({ value }: { value: number }): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState<string>(formatNumber(value));

  useMotionValueEvent(mv, "change", (latest) => {
    setDisplay(formatNumber(latest));
  });

  const lastRef = useRef(value);
  useEffect(() => {
    const from = lastRef.current;
    lastRef.current = value;

    if (prefersReducedMotion) {
      mv.set(value);
      return;
    }

    // Calm, 600ms interpolation (per spec)
    animate(mv, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    });

    void from;
  }, [mv, prefersReducedMotion, value]);

  return <span>{display}</span>;
}

function isElevatedRisk(state: string): boolean {
  return state === "ELEVATED_RISK";
}

function isMomentumWeakening(state: string): boolean {
  return state === "MOMENTUM_WEAKENING";
}

export default function MarketPulseLayer({ marketSnapshot, connectionStatus }: Props): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, marketState } = useConfidenceEngine();

  const streamMarketState = marketSnapshot.marketState;

  const cards = useMemo<PulseCard[]>(() => {
    const nifty = streamMarketState.nifty;
    const sensex = streamMarketState.sensex;
    const bankNifty = streamMarketState.bankNifty;
    const vix = streamMarketState.vix;
    const breadthPct = streamMarketState.breadthPct;
    const fiiDiiTone = streamMarketState.fiiDiiTone;

    const isRisk = isElevatedRisk(state);
    const isWeak = isMomentumWeakening(state);

    const breadthTone =
      breadthPct <= 44
        ? "Breadth narrows, so participation becomes more sensitive."
        : breadthPct <= 52
          ? "Breadth remains moderate; interpretation stays structured."
          : "Breadth looks supportive; confidence remains calmer.";

    const flowLabel = fiiDiiTone >= 0 ? "Institutional bias" : "Caution bias";
    const interpretFlows =
      fiiDiiTone >= 0
        ? "Institutional flows show constructive bias; retail tone stays filtered."
        : "Institutional bias softens; liquidity conditions become the main stabilizer.";

    const interpretVix =
      vix >= 15
        ? "India VIX is elevated—volatility conditions remain active but not chaotic."
        : vix >= 13
          ? "India VIX is moderate—volatility pressure concentrates in pockets."
          : "India VIX stays contained—volatility conditions are calm and orderly.";

    const interpretNifty = isRisk
      ? "Nifty holds structure while volatility remains a conditioning factor."
      : isWeak
        ? "Index levels remain resilient despite selective weakness across breadth."
        : "Nifty remains supported with constructive participation signals.";

    const interpretSensex = isRisk
      ? "Sensex maintains a controlled posture as risk sensitivity rises."
      : isWeak
        ? "Sensex stays resilient while momentum across mid-breadth softens."
        : "Sensex remains steady; leadership is selective and supportive.";

    const interpretBank = isRisk
      ? "Bank Nifty shows steadiness despite tighter uncertainty margins."
      : isWeak
        ? "Bank Nifty breadth is present but follow-through becomes more cautious."
        : "Bank Nifty strength remains intact with measured institutional tone.";

    const interpretBreadth = isRisk
      ? "Sector breadth is selective—participation becomes disciplined under elevated conditions."
      : isWeak
        ? "Breadth narrows subtly; momentum leadership becomes less broad."
        : "Breadth looks supportive; participation remains consistent with stable market health.";

    const interpretBreadthUnified = (() => {
      const confLine = interpretBreadth;
      return `${confLine} ${breadthTone}`;
    })();

    const safeNifty = clamp(nifty, 15000, 40000);
    const safeSensex = clamp(sensex, 50000, 120000);
    const safeBankNifty = clamp(bankNifty, 25000, 80000);
    const safeVix = clamp(vix, 8, 30);
    const safeBreadth = clamp(breadthPct, 25, 85);
    const safeFii = clamp(fiiDiiTone, -2, 2);

    return [
      {
        id: "p_nifty",
        name: "Nifty",
        value: safeNifty,
        interpret: interpretNifty,
      },
      {
        id: "p_sensex",
        name: "Sensex",
        value: safeSensex,
        interpret: interpretSensex,
      },
      {
        id: "p_bank",
        name: "Bank Nifty",
        value: safeBankNifty,
        interpret: interpretBank,
      },
      {
        id: "p_vix",
        name: "India VIX",
        value: safeVix,
        unit: "",
        interpret: interpretVix,
      },
      {
        id: "p_breadth",
        name: "Sector breadth",
        value: safeBreadth,
        unit: "%",
        interpret: interpretBreadthUnified,
      },
      {
        id: "p_flows",
        name: "FII/DII flow tone",
        value: Math.round(Math.abs(safeFii) * 10) / 10,
        interpret: `${flowLabel}: ${interpretFlows}`,
      },
    ];
  }, [marketSnapshot, state, streamMarketState]);

  const toneGlow = useMemo(() => {
    if (isElevatedRisk(state)) return "rgba(255,120,120,0.20)";
    if (isMomentumWeakening(state)) return "rgba(255,0,140,0.14)";
    if (state === "CONFIDENCE_RISING") return "rgba(0,255,210,0.18)";
    return "rgba(0,120,255,0.16)";
  }, [state]);

  void prefersReducedMotion;

  const topLabel = useMemo(() => {
    if (connectionStatus === "connecting" || connectionStatus === "reconnecting") return "Reconnecting…";
    if (connectionStatus === "disconnected") return "Telemetry offline";
    return state === "ELEVATED_RISK" ? "Volatility active" : state === "MOMENTUM_WEAKENING" ? "Momentum selective" : "Conditions stable";
  }, [connectionStatus, state]);

  return (
    <section className="relative z-[9]">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Market Pulse Layer</div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{topLabel}</div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.id}
            className="h-[120px] w-full rounded-[24px] border border-white/10 bg-black/25 backdrop-blur-2xl p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
            style={{
              boxShadow: `0 0 120px rgba(0,0,0,0.22), 0 0 40px ${toneGlow}`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">{c.name}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{marketState.replaceAll("_", " ")}</div>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <div className="text-[22px] leading-[1] font-semibold text-white/92">
                <AnimatedNumber value={c.value} />
              </div>
              {c.unit && <div className="pb-1 text-[12px] text-white/50">{c.unit}</div>}
            </div>

            <div className="mt-2 text-[13px] leading-[1.5] text-white/75">{c.interpret}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
