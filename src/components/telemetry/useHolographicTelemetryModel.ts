import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import { useMotionController } from "../motion/MotionController";
import type { HolographicTelemetryModel, TelemetryBand, TelemetryPoint, TelemetryReadout, TelemetryRail } from "./telemetryTypes";

function hashStringToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    const r = Math.imul(t ^ (t >>> 15), 1 | t);
    const r2 = r ^ (r + Math.imul(r ^ (r >>> 7), 61 | r));
    return ((r2 ^ (r2 >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function stateToTone(state: ConfidenceState): TelemetryRail["tone"] {
  switch (state) {
    case "ELEVATED_RISK":
      return "warning";
    case "MOMENTUM_WEAKENING":
      return "magenta";
    case "CONFIDENCE_RISING":
      return "cyan";
    case "STABLE_CONVICTION":
    case "NEUTRAL_ENVIRONMENT":
    default:
      return "deepBlue";
  }
}

function toneToValueTitle(kind: TelemetryReadout["kind"], state: ConfidenceState, narrativeKey: number): { title: string; value: string } {
  const k = narrativeKey % 97;

  const jitterPct = (base: number, amp: number) => {
    // deterministic but calm (bounded)
    const signed = ((Math.sin((k + 1) * 1.37 + base) * 0.5 + 0.5) - 0.5) * amp;
    return base + signed;
  };

  switch (kind) {
    case "stock_movement":
      return {
        title: "Stock motion",
        value:
          state === "ELEVATED_RISK"
            ? `Drift ${jitterPct(0.4, 0.55).toFixed(2)}° • volatility-conditioned`
            : state === "MOMENTUM_WEAKENING"
              ? `Drift ${jitterPct(0.2, 0.45).toFixed(2)}° • selective`
              : `Drift ${jitterPct(0.1, 0.35).toFixed(2)}° • calibrated`,
      };
    case "liquidity_behavior":
      return {
        title: "Liquidity behavior",
        value:
          state === "ELEVATED_RISK"
            ? `Depth ${jitterPct(0.48, 0.15).toFixed(2)} • compression sensitivity`
            : state === "MOMENTUM_WEAKENING"
              ? `Depth ${jitterPct(0.56, 0.14).toFixed(2)} • follow-through thinning`
              : `Depth ${jitterPct(0.62, 0.12).toFixed(2)} • calm transmission`,
      };
    case "institutional_participation":
      return {
        title: "Institutional participation",
        value:
          state === "ELEVATED_RISK"
            ? `Participation ${jitterPct(0.58, 0.18).toFixed(2)} • risk-selective`
            : state === "MOMENTUM_WEAKENING"
              ? `Participation ${jitterPct(0.64, 0.14).toFixed(2)} • slower confirmation`
              : `Participation ${jitterPct(0.70, 0.10).toFixed(2)} • disciplined breadth`,
      };
    case "sector_rotation":
      return {
        title: "Sector rotation",
        value:
          state === "MOMENTUM_WEAKENING"
            ? `Rotation ${jitterPct(0.44, 0.20).toFixed(2)} • concentrated`
            : state === "ELEVATED_RISK"
              ? `Rotation ${jitterPct(0.48, 0.22).toFixed(2)} • defensive lens`
              : `Rotation ${jitterPct(0.52, 0.18).toFixed(2)} • constructive read`,
      };
    case "confidence_conditions":
      return {
        title: "Confidence conditions",
        value:
          state === "CONFIDENCE_RISING"
            ? `Pulse ${jitterPct(0.78, 0.14).toFixed(2)} • improving`
            : state === "STABLE_CONVICTION"
              ? `Pulse ${jitterPct(0.70, 0.12).toFixed(2)} • stable`
              : state === "NEUTRAL_ENVIRONMENT"
                ? `Pulse ${jitterPct(0.62, 0.12).toFixed(2)} • observational`
                : state === "MOMENTUM_WEAKENING"
                  ? `Pulse ${jitterPct(0.56, 0.12).toFixed(2)} • thinning`
                  : `Pulse ${jitterPct(0.50, 0.12).toFixed(2)} • tightened margins`,
      };
    case "macro_sensitivity":
    default:
      return {
        title: "Macro sensitivity",
        value:
          state === "ELEVATED_RISK"
            ? `Sensitivity ${jitterPct(0.73, 0.18).toFixed(2)} • stress-active`
            : state === "MOMENTUM_WEAKENING"
              ? `Sensitivity ${jitterPct(0.58, 0.16).toFixed(2)} • selective`
              : `Sensitivity ${jitterPct(0.52, 0.14).toFixed(2)} • contained`,
      };
  }
}

function buildRailSet(args: {
  state: ConfidenceState;
  narrativeKey: number;
  tone: TelemetryRail["tone"];
  rnd: () => number;
  quality: "low" | "balanced" | "high";
}): TelemetryRail[] {
  const { state, narrativeKey, tone, rnd, quality } = args;

  const railCount = quality === "low" ? 3 : quality === "balanced" ? 4 : 5;
  const baseThickness = quality === "low" ? 1.1 : quality === "balanced" ? 1.35 : 1.65;

  const phaseSeed = hashStringToSeed(`tel_phase_${state}_${narrativeKey}`);
  const phaseRnd = mulberry32(phaseSeed);

  const jitter = (m: number) => (rnd() - 0.5) * m;

  const rails: TelemetryRail[] = [];
  for (let i = 0; i < railCount; i += 1) {
    // “engineering-grade” rail topology: left-to-right biased + varied slope
    const bias = i / Math.max(1, railCount - 1);

    const x1 = clamp(lerp(0.08, 0.16, bias) + jitter(0.03), 0.04, 0.24);
    const y1 =
      state === "ELEVATED_RISK"
        ? clamp(lerp(0.35, 0.62, bias) + jitter(0.05), 0.22, 0.78)
        : clamp(lerp(0.28, 0.55, bias) + jitter(0.05), 0.18, 0.74);

    const x2 = clamp(lerp(0.78, 0.93, 1 - bias) + jitter(0.03), 0.70, 0.98);
    const y2 =
      state === "MOMENTUM_WEAKENING"
        ? clamp(lerp(0.42, 0.33, bias) + jitter(0.05), 0.18, 0.78)
        : clamp(lerp(0.44, 0.36, bias) + jitter(0.05), 0.18, 0.78);

    const strengthBase = quality === "low" ? 0.55 : quality === "balanced" ? 0.68 : 0.78;
    const strength = clamp(strengthBase + (rnd() - 0.5) * 0.26, 0.35, 1);

    const alphaBase = quality === "low" ? 0.12 : quality === "balanced" ? 0.16 : 0.19;
    const alpha = clamp(alphaBase + (strength - strengthBase) * 0.08 + (rnd() - 0.5) * 0.03, 0.08, 0.24);

    rails.push({
      id: `tr_${tone}_${state}_${i}_${narrativeKey}`,
      x1,
      y1,
      x2,
      y2,
      thicknessPx: clamp(baseThickness + (rnd() - 0.5) * 0.55, 0.9, 2.4),
      alpha,
      tone,
      phase: phaseRnd() * Math.PI * 2,
      strength,
    });
  }

  return rails;
}

function buildBandSet(args: {
  state: ConfidenceState;
  narrativeKey: number;
  tone: TelemetryBand["tone"];
  rnd: () => number;
  quality: "low" | "balanced" | "high";
}): TelemetryBand[] {
  const { state, tone, rnd, quality } = args;

  const count = quality === "low" ? 2 : 3;
  const bands: TelemetryBand[] = [];

  const baseThick = quality === "low" ? 0.018 : 0.022; // relative to height
  const alphaBase = quality === "low" ? 0.14 : 0.18;

  const centerA =
    state === "ELEVATED_RISK" ? 0.52 : state === "MOMENTUM_WEAKENING" ? 0.48 : state === "CONFIDENCE_RISING" ? 0.40 : 0.44;

  for (let i = 0; i < count; i += 1) {
    const y = clamp(centerA + (i - (count - 1) / 2) * 0.10 + (rnd() - 0.5) * 0.04, 0.18, 0.82);
    const thickness = clamp(baseThick + (rnd() - 0.5) * (quality === "low" ? 0.008 : 0.012), 0.01, 0.04);
    const intensity = clamp(0.55 + (rnd() - 0.5) * 0.40, 0.22, 1);
    const alpha = clamp(alphaBase + (intensity - 0.55) * 0.08, 0.10, 0.26);

    // vary tone slightly by state to feel “alive”
    const bandTone: TelemetryBand["tone"] =
      state === "ELEVATED_RISK"
        ? i === 0
          ? "warning"
          : tone
        : state === "MOMENTUM_WEAKENING"
          ? i === 0
            ? "magenta"
            : tone
          : i === 0
            ? "cyan"
            : tone;

    bands.push({
      id: `tb_${bandTone}_${state}_${i}_${args.narrativeKey}`,
      y,
      thickness,
      tone: bandTone,
      alpha,
      intensity,
    });
  }

  return bands;
}

function buildPointSet(args: {
  state: ConfidenceState;
  narrativeKey: number;
  tone: TelemetryRail["tone"];
  rnd: () => number;
  quality: "low" | "balanced" | "high";
}): TelemetryPoint[] {
  const { state, narrativeKey, rnd, quality } = args;

  const count = quality === "low" ? 9 : quality === "balanced" ? 12 : 16;
  const points: TelemetryPoint[] = [];

  const yBias =
    state === "ELEVATED_RISK"
      ? 0.52
      : state === "MOMENTUM_WEAKENING"
        ? 0.46
        : state === "CONFIDENCE_RISING"
          ? 0.40
          : 0.44;

  for (let i = 0; i < count; i += 1) {
    const x = clamp(0.12 + rnd() * 0.76 + (rnd() - 0.5) * 0.06, 0.05, 0.95);
    const y = clamp(yBias + (rnd() - 0.5) * 0.34, 0.12, 0.88);
    const magnitudeBase = quality === "low" ? 0.45 : 0.6;
    const magnitude = clamp(magnitudeBase + (rnd() - 0.5) * 0.55 + (state === "ELEVATED_RISK" ? (0.1 + rnd() * 0.15) : 0), 0.18, 1);
    points.push({
      id: `tp_${state}_${i}_${narrativeKey}`,
      x,
      y,
      magnitude,
    });
  }

  return points;
}

function buildReadouts(args: {
  state: ConfidenceState;
  narrativeKey: number;
  tone: TelemetryReadout["tone"];
  quality: "low" | "balanced" | "high";
  rnd: () => number;
}): TelemetryReadout[] {
  const { state, narrativeKey, tone, quality, rnd } = args;

  const kinds: TelemetryReadout["kind"][] = [
    "stock_movement",
    "liquidity_behavior",
    "institutional_participation",
    "sector_rotation",
    "confidence_conditions",
    "macro_sensitivity",
  ];

  const count = quality === "low" ? 4 : 6;
  const readouts: TelemetryReadout[] = [];

  const leftBias = state === "ELEVATED_RISK" ? 0.22 : state === "MOMENTUM_WEAKENING" ? 0.28 : 0.24;

  for (let i = 0; i < count; i += 1) {
    const kind = kinds[i % kinds.length];
    const t = i / Math.max(1, count - 1);

    const x = clamp(
      i % 2 === 0
        ? leftBias + rnd() * 0.06
        : 0.72 + rnd() * 0.08,
      0.12,
      0.90,
    );

    const y =
      0.24 +
      t * (0.60 - 0.24) +
      (rnd() - 0.5) * (quality === "low" ? 0.05 : 0.07);

    const { title, value } = toneToValueTitle(kind, state, narrativeKey);

    const maxWidthPx = quality === "low" ? 210 : 260;

    readouts.push({
      id: `trd_${kind}_${state}_${i}_${narrativeKey}`,
      kind,
      title,
      valueLabel: value,
      tone:
        state === "ELEVATED_RISK"
          ? "warning"
          : state === "MOMENTUM_WEAKENING"
            ? "magenta"
            : tone,
      x,
      y: clamp(y, 0.14, 0.88),
      maxWidthPx,
    });
  }

  return readouts;
}

export function useHolographicTelemetryModel(): HolographicTelemetryModel {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useMotionController();
  const { state, theme, narrativeKey } = useConfidenceEngine();

  const model = useMemo<HolographicTelemetryModel>(() => {
    const quality: HolographicTelemetryModel["quality"] =
      prefersReducedMotion || isMobile ? "low" : state === "ELEVATED_RISK" ? "balanced" : "high";

    const seed = hashStringToSeed(`holo_tel_${state}_${narrativeKey}`);
    const rnd = mulberry32(seed);

    const tone = stateToTone(state);

    const rails: TelemetryRail[] = buildRailSet({
      state,
      narrativeKey,
      tone,
      rnd,
      quality,
    });

    const bands: TelemetryBand[] = buildBandSet({
      state,
      narrativeKey,
      tone,
      rnd,
      quality,
    });

    const points: TelemetryPoint[] = buildPointSet({
      state,
      narrativeKey,
      tone,
      rnd,
      quality,
    });

    const readouts: TelemetryReadout[] = buildReadouts({
      state,
      narrativeKey,
      tone,
      rnd,
      quality,
    });

    return {
      rails,
      bands,
      points,
      readouts,

      pulseSpeedSec: theme.pulseSpeed,
      orbBreathSec: theme.orbBreathSeconds,

      quality,
      confidenceState: state,
      theme,
    };
  }, [prefersReducedMotion, isMobile, state, theme, narrativeKey]);

  return model;
}
