import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { FinancialTelemetryPoint } from "../../types/CompanyUniverse";
import { useMasterInfographics } from "./MasterInfographicEngine";
import { CompanyUniverseCard } from "../companyUniverse/CompanyUniverseSectionFrame";

type LayerHeights = {
  revenue: number;
  ebitda: number;
  freeCashFlow: number;
  profit: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function tierHeight(value: number, max: number, towerPx: number): number {
  if (!Number.isFinite(max) || max <= 0) return 0;
  const r = value / max;
  return clamp(r, 0, 1) * towerPx;
}

function formatCompactINR(n: number): string {
  const abs = Math.abs(n);
  if (!Number.isFinite(n)) return "—";
  if (abs >= 1e12) return `₹${(n / 1e12).toFixed(2)} lakh cr`;
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} lakh`;
  return `₹${Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function computeLayerHeights(points: FinancialTelemetryPoint[], towerPx: number): LayerHeights[] {
  const maxRevenue = Math.max(...points.map((p) => p.revenue));
  const maxEbitda = Math.max(...points.map((p) => p.ebitda));
  const maxFcf = Math.max(...points.map((p) => p.freeCashFlow));
  const maxProfit = Math.max(...points.map((p) => p.profit));

  return points.map((p) => ({
    revenue: tierHeight(p.revenue, maxRevenue, towerPx),
    ebitda: tierHeight(p.ebitda, maxEbitda, towerPx),
    freeCashFlow: tierHeight(p.freeCashFlow, maxFcf, towerPx),
    profit: tierHeight(p.profit, maxProfit, towerPx),
  }));
}

export default function VolumetricFinancialTowers({
  points,
  towerPx = 220,
}: {
  points: FinancialTelemetryPoint[];
  towerPx?: number;
}): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { tempo, toneGlow, toneEdgeGlow } = useMasterInfographics();

  const safe = useMemo(() => points.slice(0, 6), [points]);

  const layerHeights = useMemo(() => computeLayerHeights(safe, towerPx), [safe, towerPx]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (safe.length <= 1) return;

    let i = 0;
    setActiveIndex(0);

    const ms = Math.max(1200, tempo.stepSec * 1000);
    const id = window.setInterval(() => {
      i = (i + 1) % safe.length;
      setActiveIndex(i);
    }, ms);

    return () => window.clearInterval(id);
  }, [prefersReducedMotion, safe.length, tempo.stepSec]);

  const transition = useMemo(() => {
    if (prefersReducedMotion) return { duration: 0.001 };
    return { duration: Math.max(0.12, tempo.transitionMs / 1000), ease: [0.22, 1, 0.36, 1] as const };
  }, [prefersReducedMotion, tempo.transitionMs]);

  return (
    <CompanyUniverseCard className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Volumetric Financial Towers</div>
          <div className="mt-3 text-[22px] font-medium text-white/92">structural revenue + strength pillars</div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">calm evolution • clarity-first</div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        {safe.map((p, idx) => {
          const active = idx === activeIndex;
          const lh = layerHeights[idx] ?? { revenue: 0, ebitda: 0, freeCashFlow: 0, profit: 0 };

          const dim = active ? 1 : 0.28;
          const scale = active ? 1 : 0.92;

          // Stack layout: revenue base, ebitda mid, FCF upper, profit as “cap”.
          const baseH = lh.revenue * dim;
          const midH = lh.ebitda * dim;
          const topH = lh.freeCashFlow * dim;
          const capH = lh.profit * dim;

          const profitPulse = active && !prefersReducedMotion;

          return (
            <motion.div
              key={p.id}
              className="relative flex-1 min-w-[0px] flex flex-col items-center justify-end"
              style={{ transformOrigin: "50% 100%" }}
              initial={false}
              animate={{ scale }}
              transition={transition}
            >
              <div
                className="relative w-full rounded-[20px] border border-white/10 bg-black/20"
                style={{
                  boxShadow: active ? `0 0 80px ${toneEdgeGlow}, 0 0 40px rgba(0,0,0,0.35)` : "0 0 40px rgba(0,0,0,0.25)",
                  height: towerPx,
                }}
              >
                {/* Profit cap (top) */}
                <motion.div
                  className="absolute left-2 right-2 rounded-[12px]"
                  style={{
                    bottom: 8,
                    height: capH,
                    background: `rgba(255,185,90,0.10)`,
                    boxShadow: `0 0 50px rgba(255,185,90,0.08)`,
                    opacity: 0.95,
                  }}
                  animate={
                    profitPulse
                      ? {
                          opacity: [0.55, 1, 0.65],
                        }
                      : { opacity: active ? 0.9 : 0.55 }
                  }
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : profitPulse
                        ? { duration: Math.max(1.2, tempo.stepSec * 0.55), repeat: Infinity, ease: "easeInOut" }
                        : transition
                  }
                />

                {/* Upper pillar (FCF) */}
                <motion.div
                  className="absolute left-2 right-2 rounded-[12px]"
                  style={{
                    bottom: 8 + capH,
                    height: topH,
                    background: `rgba(0,255,210,0.08)`,
                    boxShadow: `0 0 60px ${toneGlow}`,
                    opacity: 0.85,
                  }}
                  animate={{ height: topH }}
                  transition={transition}
                />

                {/* Mid pillar (EBITDA) */}
                <motion.div
                  className="absolute left-2 right-2 rounded-[12px]"
                  style={{
                    bottom: 8 + capH + topH,
                    height: midH,
                    background: `rgba(91,167,255,0.06)`,
                    opacity: 0.8,
                  }}
                  animate={{ height: midH }}
                  transition={transition}
                />

                {/* Base pillar (Revenue) */}
                <motion.div
                  className="absolute left-2 right-2 rounded-[12px]"
                  style={{
                    bottom: 8 + capH + topH + midH,
                    height: baseH,
                    background: `rgba(0,255,210,0.10)`,
                    opacity: 0.92,
                  }}
                  animate={{ height: baseH }}
                  transition={transition}
                />

                {/* Side “laser edge” */}
                <div
                  className="absolute top-2 bottom-2 left-2 w-[2px] rounded-full"
                  style={{
                    background: active ? toneGlow : "rgba(255,255,255,0.08)",
                    boxShadow: active ? `0 0 60px ${toneGlow}` : "none",
                    opacity: 0.9,
                  }}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-3 text-center">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{p.label}</div>
                <div className="mt-2 text-[12px] text-white/80">
                  {active ? formatCompactINR(p.revenue) : `${formatCompactINR(p.revenue).slice(0, 10)}…`}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
        revenue • ebitda • cash-flow • profit density (educational visualization only)
      </div>
    </CompanyUniverseCard>
  );
}
