import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useMotionValueEvent } from "framer-motion";
import { useMotionController } from "../motion/MotionController";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import { useFocusGuidance } from "../../hooks/useFocusGuidance";
import { FocusContext } from "../../services/focusGuidance/FocusGuidanceTypes";

type AdaptiveFocusGuidanceProps = {
  enabled?: boolean;
};

function getGlowDot(state: ConfidenceState): { dot: string; halo: string } {
  switch (state) {
    case "ELEVATED_RISK":
      return { dot: "rgba(255,80,140,0.92)", halo: "rgba(255,80,140,0.18)" };
    case "MOMENTUM_WEAKENING":
      return { dot: "rgba(255,60,190,0.86)", halo: "rgba(255,60,190,0.16)" };
    case "NEUTRAL_ENVIRONMENT":
      return { dot: "rgba(30,140,255,0.86)", halo: "rgba(30,140,255,0.14)" };
    case "CONFIDENCE_RISING":
      return { dot: "rgba(0,255,210,0.90)", halo: "rgba(0,255,210,0.16)" };
    case "STABLE_CONVICTION":
    default:
      return { dot: "rgba(50,170,255,0.84)", halo: "rgba(50,170,255,0.14)" };
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function getFocusText(pageKey: string, stage: number, state: ConfidenceState): { primary: string; secondary: string } {
  const riskTone = state === "ELEVATED_RISK" ? "tightened" : state === "MOMENTUM_WEAKENING" ? "selective" : "composed";

  if (pageKey === "stock") {
    const items = [
      { primary: "Hero environment", secondary: `Primary lens is ${riskTone}; interpretation stays calm.` },
      { primary: "Institutional layer", secondary: `Participation patterns are treated as context boundaries.` },
      { primary: "Financial intelligence", secondary: `Metric environments support educational reading, not certainty.` },
      { primary: "Behavioural analysis", secondary: `Context shapes interpretation pacing; margins stay guarded.` },
      { primary: "Chart integration system", secondary: `Neural synthesis overlays remain probabilistic and learning-focused.` },
    ];

    return items[Math.min(items.length - 1, stage)] ?? items[0]!;
  }

  // Default: command centre / other pages
  const items = [
    { primary: "Command centre focus", secondary: `Confidence conditions stay ${riskTone} and educational.` },
    { primary: "Live telemetry grid", secondary: `Orb and rail presence communicate pace and environment texture.` },
    { primary: "Sector intelligence matrix", secondary: `Rotation nodes frame context for narrative hierarchy.` },
    { primary: "Institutional network", secondary: `Participation web reads as structure-first context.` },
  ];

  return items[Math.min(items.length - 1, stage)] ?? items[0]!;
}

export default function AdaptiveFocusGuidance({ enabled = true }: AdaptiveFocusGuidanceProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { scrollProgress } = useMotionController();
  const { state: confidenceState, narrativeKey } = useConfidenceEngine();

  const { state: focusGuidanceState, setFocusContext } = useFocusGuidance();

  const dot = useMemo(() => getGlowDot(confidenceState), [confidenceState]);

  const [stage, setStage] = useState<number>(0);

  useMotionValueEvent(scrollProgress, "change", (latest) => {
    const next = Math.floor(clamp01(latest) * 5);
    setStage((prev) => (prev === next ? prev : next));
  });

  const [pageKey, setPageKey] = useState<string>("stock");
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      setPageKey((params.get("page") ?? "stock").toLowerCase().trim());
    } catch {
      setPageKey("stock");
    }
  }, []);

  const focusContext = useMemo(() => {
    if (pageKey === "stock") {
      if (stage <= 1) return FocusContext.STORY_READING;
      if (stage === 2) return FocusContext.CHART_ANALYSIS;
      return FocusContext.SCANNER_USAGE;
    }

    if (pageKey === "dashboard" || pageKey === "market") return FocusContext.SCANNER_USAGE;

    return FocusContext.GENERAL;
  }, [pageKey, stage]);

  useEffect(() => {
    setFocusContext(focusContext);
  }, [focusContext, setFocusContext]);

  const [justRecalibrated, setJustRecalibrated] = useState(false);
  const prevKeyRef = useRef<number>(narrativeKey);

  useEffect(() => {
    if (prevKeyRef.current !== narrativeKey) {
      prevKeyRef.current = narrativeKey;
      setJustRecalibrated(true);
      const t = window.setTimeout(() => setJustRecalibrated(false), 900);
      return () => window.clearTimeout(t);
    }
    return;
  }, [narrativeKey]);

  const focusText = useMemo(
    () => getFocusText(pageKey, stage, confidenceState),
    [pageKey, stage, confidenceState],
  );

  const panelOpacity = focusGuidanceState.adaptiveContrast.panelOpacity;
  const typographyBrightness = focusGuidanceState.adaptiveContrast.typographyBrightness;

  const bgAlpha = 0.22 + (1 - panelOpacity) * 0.25;
  const borderAlpha = 0.09 + (1 - panelOpacity) * 0.04;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[4] w-full px-6 sm:px-[72px]"
      aria-hidden="true"
      style={{ opacity: enabled ? 1 : 0 }}
    >
      <div
        className="mt-[76px] inline-flex max-w-[720px] items-center gap-3 rounded-[999px] border border-white/10 bg-black/0 backdrop-blur-[24px] px-[14px] py-[10px]"
        style={{
          opacity: panelOpacity,
          backgroundColor: `rgba(0,0,0,${bgAlpha})`,
          borderColor: `rgba(255,255,255,${borderAlpha})`,
          filter: `brightness(${0.95 + typographyBrightness * 0.05})`,
        }}
      >
        <motion.span
          className="h-[8px] w-[8px] rounded-full"
          style={{
            background: dot.dot,
            boxShadow: `0 0 18px ${dot.dot}`,
          }}
          animate={
            prefersReducedMotion
              ? undefined
              : justRecalibrated
                ? { scale: [1, 1.25, 1], opacity: [0.8, 1, 0.85] }
                : { opacity: 0.92 }
          }
          transition={{ duration: 0.45, ease: "easeInOut" }}
        />
        <div className="flex flex-col leading-[1.1] min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Focus</div>
          <div
            className="mt-[1px] text-[12px] font-medium text-white/85 whitespace-nowrap overflow-hidden text-ellipsis"
            title={focusText.primary}
          >
            {focusText.primary}
          </div>
        </div>
      </div>
    </div>
  );
}
