import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";
import type { FinancialConceptKey } from "./HolographicFinancialConceptExplainer";

export type ConceptVisualPayload =
  | {
      kind: "range";
      pos01: number; // 0..1
      lowLabel: string;
      currentLabel: string;
      highLabel: string;
    }
  | {
      kind: "gauge";
      pos01: number; // 0..1
      currentLabel: string;
      leftLabel?: string;
      rightLabel?: string;
    }
  | {
      kind: "single";
      currentLabel: string;
    };

export type HolographicConceptVisualProps = {
  concept: FinancialConceptKey;
  confidenceState: ConfidenceState;
  toneGlow: string;
  toneEdgeGlow: string;
  beginner?: boolean;
  payload?: ConceptVisualPayload;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function confidenceMotionMultiplier(state: ConfidenceState): number {
  // Keep motion calm + premium. Elevated risk adds a little “pulse amplitude”,
  // momentum weakening adds a little jitter, but still non-chaotic.
  switch (state) {
    case "ELEVATED_RISK":
      return 1.15;
    case "MOMENTUM_WEAKENING":
      return 1.08;
    case "CONFIDENCE_RISING":
      return 1.0;
    case "NEUTRAL_ENVIRONMENT":
      return 0.95;
    case "STABLE_CONVICTION":
    default:
      return 0.9;
  }
}

export default function HolographicConceptVisual({
  concept,
  confidenceState,
  toneGlow,
  toneEdgeGlow,
  beginner,
  payload,
}: HolographicConceptVisualProps): JSX.Element {
  const beginnerMode = beginner === true;
  const prefersReducedMotion = useReducedMotion();
  const m = useMemo(() => confidenceMotionMultiplier(confidenceState), [confidenceState]);

  const pos01 = useMemo(() => {
    if (!payload) return 0.5;
    if (payload.kind === "range" || payload.kind === "gauge") return clamp01(payload.pos01);
    return 0.5;
  }, [payload]);

  const visualization = useMemo(() => {
    if (concept === "marketCap" && payload?.kind === "range") {
      const { lowLabel, currentLabel, highLabel } = payload;
      const leftPct = payload.pos01 * 100;

      return (
        <div className="w-full">
          <div className="relative h-[62px] rounded-[18px] border border-white/10 bg-black/20 overflow-hidden">
            <div className="absolute inset-0" style={{ boxShadow: `0 0 70px rgba(0,0,0,0.35)` }} aria-hidden="true" />
            {/* base rail */}
            <div className="absolute left-[14px] right-[14px] top-1/2 -translate-y-1/2 h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            {/* glow fill */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full"
              style={{
                left: 14,
                width: `calc(${Math.max(0, leftPct)}% - 28px)`,
                background: toneGlow,
                opacity: 0.55,
              }}
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      opacity: [0.45, 0.75, 0.5],
                    }
              }
              transition={prefersReducedMotion ? undefined : { duration: Math.max(1.2, 1.65 * m), ease: "easeInOut", repeat: Infinity }}
            />
            {/* low marker */}
            <div className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full" style={{ left: 14 - 5, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.10)" }} />
            {/* current marker */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full"
              style={{
                left: `calc(${leftPct}% + 14px - 6px)`,
                background: toneEdgeGlow,
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: `0 0 60px ${toneGlow}`,
              }}
              animate={prefersReducedMotion ? undefined : { scale: [0.96, 1.18, 1.03], opacity: [0.72, 1, 0.8] }}
              transition={prefersReducedMotion ? undefined : { duration: Math.max(1.0, 1.35 * m), ease: "easeInOut", repeat: Infinity }}
            />
            {/* high marker */}
            <div className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full" style={{ right: 14 - 5, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.10)" }} />
          </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0" style={{ visibility: beginnerMode ? "hidden" : "visible" }}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">52-week low</div>
                <div className="mt-1 text-[12px] text-white/80 truncate" title={lowLabel}>
                  {lowLabel}
                </div>
              </div>
              <div className="text-right min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">current</div>
                <div className="mt-1 text-[12px] text-white/92 truncate" title={currentLabel}>
                  {currentLabel}
                </div>
              </div>
              <div className="text-right min-w-0" style={{ visibility: beginnerMode ? "hidden" : "visible" }}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">52-week high</div>
                <div className="mt-1 text-[12px] text-white/75 truncate" title={highLabel}>
                  {highLabel}
                </div>
              </div>
            </div>
        </div>
      );
    }

    if ((concept === "pe" || concept === "debtRatio") && (payload?.kind === "gauge" || payload?.kind === "single")) {
      const currentLabel = payload?.kind === "gauge" ? payload.currentLabel : payload?.kind === "single" ? payload.currentLabel : "";
      const leftLabel = payload?.kind === "gauge" ? payload.leftLabel : undefined;
      const rightLabel = payload?.kind === "gauge" ? payload.rightLabel : undefined;

      return (
        <div className="w-full">
          <div className="rounded-[18px] border border-white/10 bg-black/20 overflow-hidden p-4">
            <div className="relative h-[22px] rounded-full">
              <div className="absolute inset-y-0 left-2 right-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} aria-hidden="true" />
              <motion.div
                className="absolute inset-y-0 left-2 rounded-full"
                style={{
                  width: `calc(${pos01 * 100}% - 4px)`,
                  background: toneGlow,
                  opacity: 0.55,
                }}
                animate={prefersReducedMotion ? undefined : { opacity: [0.35, 0.72, 0.45] }}
                transition={prefersReducedMotion ? undefined : { duration: Math.max(1.1, 1.6 * m), ease: "easeInOut", repeat: Infinity }}
              />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full"
                style={{
                  left: `calc(${pos01 * 100}% + 2px - 6px)`,
                  background: toneEdgeGlow,
                  boxShadow: `0 0 60px ${toneGlow}`,
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
                animate={prefersReducedMotion ? undefined : { scale: [0.96, 1.2, 1.03], opacity: [0.7, 1, 0.85] }}
                transition={prefersReducedMotion ? undefined : { duration: Math.max(1.0, 1.35 * m), ease: "easeInOut", repeat: Infinity }}
              />
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="text-[10px] uppercase tracking-[0.18em] text-white/45"
                  style={{ visibility: beginnerMode || !leftLabel ? "hidden" : "visible" }}
                >
                  {leftLabel ?? "—"}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">current</div>
                <div className="mt-1 text-[12px] text-white/92 truncate" title={currentLabel}>
                  {currentLabel}
                </div>
              </div>

              <div className="text-right min-w-0">
                <div
                  className="text-[10px] uppercase tracking-[0.18em] text-white/45"
                  style={{ visibility: beginnerMode || !rightLabel ? "hidden" : "visible" }}
                >
                  {rightLabel ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (concept === "volatility") {
      return (
        <div className="w-full">
          <div className="relative h-[78px] rounded-[18px] border border-white/10 bg-black/20 overflow-hidden">
            <div className="absolute inset-0" style={{ boxShadow: `0 0 80px rgba(0,0,0,0.35)` }} aria-hidden="true" />
            {/* pulse rings */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.div
                className="absolute rounded-full border"
                style={{ width: 26, height: 26, borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}
                animate={prefersReducedMotion ? undefined : { scale: [1, 1.65], opacity: [0.9, 0.05] }}
                transition={prefersReducedMotion ? undefined : { duration: Math.max(1.1, 1.5 * m), repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{ width: 16, height: 16, background: toneEdgeGlow, left: "50%", top: "50%", transform: "translate(-50%,-50%)", boxShadow: `0 0 55px ${toneGlow}` }}
                animate={prefersReducedMotion ? undefined : { scale: [0.95, 1.14, 1.02], opacity: [0.65, 1, 0.85] }}
                transition={prefersReducedMotion ? undefined : { duration: Math.max(1.0, 1.25 * m), repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* calm wave band */}
            <div
              className="absolute left-0 right-0 bottom-0"
              style={{
                height: 22,
                background: "rgba(255,255,255,0.03)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
              aria-hidden="true"
            />

            <div className="absolute left-5 top-4 text-[11px] uppercase tracking-[0.18em] text-white/55">laser pulse</div>
            <div className="absolute right-5 top-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
              {beginnerMode
                ? "sensitivity field"
                : confidenceState === "ELEVATED_RISK"
                  ? "expanded sensitivity"
                  : confidenceState === "MOMENTUM_WEAKENING"
                    ? "selective rhythm"
                    : "calm continuity"}
            </div>
          </div>
        </div>
      );
    }

    if (concept === "liquidity") {
      return (
        <div className="w-full">
          <div className="relative h-[78px] rounded-[18px] border border-white/10 bg-black/20 overflow-hidden">
            <div className="absolute inset-0" style={{ boxShadow: `0 0 80px rgba(0,0,0,0.35)` }} aria-hidden="true" />
            {/* stream tubes */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-end gap-3">
              {[0, 1].map((i) => {
                const isRight = i === 1;
                const height = confidenceState === "ELEVATED_RISK" ? (isRight ? 38 : 26) : confidenceState === "MOMENTUM_WEAKENING" ? (isRight ? 34 : 30) : (isRight ? 42 : 40);
                const opacity = confidenceState === "ELEVATED_RISK" ? 0.55 : 0.45;
                const delay = i * 0.12;

                return (
                  <div key={i} className="relative w-[22px] h-[52px] rounded-[16px] border border-white/10 bg-black/25 overflow-hidden">
                    <motion.div
                      className="absolute left-0 right-0 bottom-0"
                      style={{
                        height,
                        background: toneGlow,
                        opacity,
                        boxShadow: `0 0 50px ${toneGlow}`,
                      }}
                      animate={prefersReducedMotion ? undefined : { translateY: [6, 0, 5] }}
                      transition={prefersReducedMotion ? undefined : { duration: Math.max(1.1, 1.6 * m), repeat: Infinity, ease: "easeInOut", delay }}
                    />
                    <motion.div
                      className="absolute left-1/2 -translate-x-1/2 top-2 h-[10px] w-[6px] rounded-full"
                      style={{ background: toneEdgeGlow, opacity: 0.75, boxShadow: `0 0 50px ${toneEdgeGlow}` }}
                      animate={prefersReducedMotion ? undefined : { opacity: [0.2, 1, 0.35] }}
                      transition={prefersReducedMotion ? undefined : { duration: Math.max(0.9, 1.25 * m), repeat: Infinity, ease: "easeInOut", delay }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="absolute left-5 top-4 text-[11px] uppercase tracking-[0.18em] text-white/55">capital flow</div>
            <div className="absolute right-5 top-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
              {beginnerMode
                ? "flow texture"
                : confidenceState === "ELEVATED_RISK"
                  ? "pacing becomes selective"
                  : confidenceState === "MOMENTUM_WEAKENING"
                    ? "depth stays usable"
                    : "transmission stays calm"}
            </div>
          </div>
        </div>
      );
    }

    if (concept === "debtRatio") {
      return (
        <div className="w-full">
          <div className="rounded-[18px] border border-white/10 bg-black/20 overflow-hidden p-4">
            <div className="flex items-end gap-2 h-[44px]">
              {Array.from({ length: 7 }).map((_, i) => {
                const t = i / 6; // 0..1
                const active = t <= pos01;

                return (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-[12px] border border-white/10"
                    style={{
                      height: 10 + t * 28,
                      background: active ? toneGlow : "rgba(255,255,255,0.04)",
                      boxShadow: active ? `0 0 55px ${toneGlow}` : "none",
                      opacity: active ? 0.9 : 0.6,
                    }}
                    animate={prefersReducedMotion ? undefined : active ? { y: [0, -2, 0] } : undefined}
                    transition={prefersReducedMotion ? undefined : { duration: 1.5 * m, repeat: active ? Infinity : 0, ease: "easeInOut" }}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">structural tension lattice</div>
          </div>
        </div>
      );
    }

    // fallback single
    return (
      <div className="rounded-[18px] border border-white/10 bg-black/20 p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">holographic precision</div>
        <div className="mt-3 text-[13px] leading-[1.6] text-white/80">Concept visualization will refine as the learning lens expands.</div>
      </div>
    );
  }, [concept, payload, confidenceState, prefersReducedMotion, toneGlow, toneEdgeGlow, beginnerMode, m, pos01]);

  return (
    <div className="w-full" aria-hidden="false">
      {visualization}
    </div>
  );
}
