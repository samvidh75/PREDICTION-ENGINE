import React, { useEffect, useMemo, useRef, useState } from "react";
import { animate, useMotionValue, useReducedMotion, useMotionValueEvent } from "framer-motion";
import { useConfidenceEngine } from "../intelligence/ConfidenceEngine";

type PulseCard = {
  id: string;
  name: string;
  value: number;
  unit?: string;
  interpret: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function seededNoise(seed: number): number {
  // Deterministic 0..1 based on seed (no external deps).
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function AnimatedNumber({
  value,
  suffix,
}: {
  value: number;
  suffix?: string;
}): JSX.Element {
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

    // In case value is identical, we still want to avoid unnecessary motion.
    void from;
  }, [mv, prefersReducedMotion, value]);

  return <span>{display}</span>;
}

export default function MarketPulseLayer(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, marketState, narrativeKey } = useConfidenceEngine();

  const cards = useMemo<PulseCard[]>(() => {
    // Seeded values: stable between orchestrator recalibrations.
    const s = narrativeKey + (state.charCodeAt(0) ?? 0);

    const n1 = seededNoise(s + 1);
    const n2 = seededNoise(s + 2);
    const n3 = seededNoise(s + 3);
    const n4 = seededNoise(s + 4);
    const n5 = seededNoise(s + 5);
    const n6 = seededNoise(s + 6);

    const isRisk = state === "ELEVATED_RISK";
    const isWeak = state === "MOMENTUM_WEAKENING";

    const nifty = 22400 + (n1 - 0.5) * 180 + (isRisk ? -(n2 * 40) : n2 * 25);
    const sensex = 73800 + (n3 - 0.5) * 260 + (isWeak ? -(n4 * 70) : n4 * 55);

    const bankNifty = 48900 + (n2 - 0.5) * 320 + (isRisk ? -(n1 * 110) : n1 * 60);
    const vix = isRisk
      ? 15.8 + n5 * 5.6
      : isWeak
        ? 13.9 + n5 * 3.6
        : 12.4 + n5 * 2.8;

    const breadth = clamp(52 + (n6 - 0.5) * 24 + (isWeak ? -6 : 0), 28, 72);
    const fiiDii = clamp((n2 - 0.5) * 2.2 + (n1 - 0.5) * 0.9, -2.6, 2.6);

    const pulseTone = isRisk ? "Elevated Volatility" : isWeak ? "Momentum Weakening" : "Stability";

    const interpretNifty = isRisk
      ? "Nifty is holding structure while volatility remains a conditioning factor."
      : isWeak
        ? "Index levels remain resilient despite selective weakness across breadth."
        : "Nifty remains stable with constructive participation signals.";

    const interpretSensex = isRisk
      ? "Sensex maintains a controlled posture as risk sensitivity rises."
      : isWeak
        ? "Sensex stays resilient while momentum across mid-breadth softens."
        : "Sensex remains supported; leadership is selective and steady.";

    const interpretBank = isRisk
      ? "Bank Nifty shows steadiness despite tighter uncertainty margins."
      : isWeak
        ? "Bank Nifty breadth is present but follow-through is more cautious."
        : "Bank Nifty strength remains intact with measured institutional tone.";

    const interpretVix = isRisk
      ? "India VIX is elevated—volatility conditions remain active but not chaotic."
        : isWeak
          ? "India VIX remains moderate—volatility pressure concentrates in pockets."
          : "India VIX stays contained; volatility conditions are calm and orderly.";

    const interpretBreadth = isRisk
      ? "Sector breadth is selective—participation is disciplined under elevated conditions."
      : isWeak
        ? "Breadth narrows subtly; momentum leadership becomes less broad."
        : "Breadth looks supportive; participation is consistent with stable market health.";

    const interpretFlows = fiiDii >= 0
      ? "Institutional flows show constructive bias; retail tone stays filtered."
      : "Institutional bias softens; liquidity conditions remain the main stabilizer.";

    // FII/DII simplified as educational “flow direction”
    const flowLabel = fiiDii >= 0 ? "Institutional bias" : "Caution bias";

    return [
      {
        id: "p_nifty",
        name: "Nifty",
        value: nifty,
        unit: "",
        interpret: interpretNifty,
      },
      {
        id: "p_sensex",
        name: "Sensex",
        value: sensex,
        unit: "",
        interpret: interpretSensex,
      },
      {
        id: "p_bank",
        name: "Bank Nifty",
        value: bankNifty,
        unit: "",
        interpret: interpretBank,
      },
      {
        id: "p_vix",
        name: "India VIX",
        value: vix,
        unit: "",
        interpret: interpretVix,
      },
      {
        id: "p_breadth",
        name: "Sector breadth",
        value: breadth,
        unit: "%",
        interpret: interpretBreadth,
      },
      {
        id: "p_flows",
        name: "FII/DII flow tone",
        value: Math.round(Math.abs(fiiDii) * 10) / 10,
        unit: "",
        interpret: `${flowLabel}: ${interpretFlows}`,
      },
    ];
  }, [narrativeKey, state, marketState]);

  const toneGlow = useMemo(() => {
    if (state === "ELEVATED_RISK") return "rgba(255,120,120,0.20)";
    if (state === "MOMENTUM_WEAKENING") return "rgba(255,0,140,0.14)";
    if (state === "CONFIDENCE_RISING") return "rgba(0,255,210,0.18)";
    return "rgba(0,120,255,0.16)";
  }, [state]);

  // If reduced motion, keep layout stable.
  void prefersReducedMotion;

  return (
    <section className="relative z-[9]">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">
          Market Pulse Layer
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
          {state === "ELEVATED_RISK"
            ? "Volatility active"
            : state === "MOMENTUM_WEAKENING"
              ? "Momentum selective"
              : "Conditions stable"}
        </div>
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
