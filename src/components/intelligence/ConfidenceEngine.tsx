import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  computeMarketState,
  confidenceFromMarketState,
  themeForMarketState,
  type MarketInputs,
  type MarketState,
} from "../../services/intelligence/marketState";

export type ConfidenceState =
  | "CONFIDENCE_RISING"
  | "STABLE_CONVICTION"
  | "NEUTRAL_ENVIRONMENT"
  | "MOMENTUM_WEAKENING"
  | "ELEVATED_RISK";

export type ConfidenceTheme = {
  label: string;

  orbBreathSeconds: number;
  orbBreathMaxScale: number;

  risingParticleBias: number; // -1..1

  ringsSpeed: number; // seconds per full rotation
  pulseSpeed: number; // seconds per pulse cycle

  cyanGlow: string; // rgba string
  magentaGlow: string; // rgba string
  deepBlueGlow: string; // rgba string
  warningGlow: string; // rgba string
};

type ConfidenceContextValue = {
  state: ConfidenceState;
  marketState: MarketState;
  theme: ConfidenceTheme;

  // Drives editorial narrative content refresh + gentle continuity.
  narrativeVariant: number; // parity used by narrative cards
  narrativeKey: number; // increments on each recalibration
};

const ConfidenceContext = createContext<ConfidenceContextValue | null>(null);

export function useConfidenceEngine(): ConfidenceContextValue {
  const ctx = useContext(ConfidenceContext);
  if (!ctx) {
    throw new Error("useConfidenceEngine must be used within <ConfidenceEngine />");
  }
  return ctx;
}

const DEFAULT_INPUTS: MarketInputs = {
  trendConsistency: 0.62,
  volatilityStability: 0.66,
  institutionalParticipation: 0.58,
  liquidityBreadth: 0.60,
  sentimentAlignment: 0.56,
  sectorMomentum: 0.57,
  earningsQuality: 0.60,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function randn(): number {
  // Box–Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function deriveLabel(marketState: MarketState): string {
  switch (marketState) {
    case "Stable Expansion":
      return "Stable Market Conditions";
    case "Selective Strength":
      return "Increased Sector Rotation";
    case "Broad Weakness":
      return "Broad Weakness";
    case "Elevated Volatility":
      return "Elevated Volatility";
    case "Defensive Rotation":
      return "Liquidity Strength Improving";
    case "Institutional Accumulation":
      return "Institutional Accumulation";
    case "Liquidity Compression":
      return "Liquidity Strength Improving";
    case "Momentum Fragmentation":
      return "Elevated Sector Drift";
  }
}

function deriveTheme(marketState: MarketState): ConfidenceTheme {
  const raw = themeForMarketState(marketState);
  return {
    label: deriveLabel(marketState),
    orbBreathSeconds: raw.orbBreathSeconds,
    orbBreathMaxScale: raw.orbBreathMaxScale,
    risingParticleBias: raw.risingParticleBias,
    ringsSpeed: raw.ringsSpeed,
    pulseSpeed: raw.pulseSpeed,
    cyanGlow: raw.cyanGlow,
    magentaGlow: raw.magentaGlow,
    deepBlueGlow: raw.deepBlueGlow,
    warningGlow: raw.warningGlow,
  };
}

function deriveFromInputs(inputs: MarketInputs): {
  marketState: MarketState;
  confidence: ConfidenceState;
  theme: ConfidenceTheme;
} {
  const marketState = computeMarketState(inputs);
  const confidence = confidenceFromMarketState(marketState);
  const theme = deriveTheme(marketState);
  return { marketState, confidence, theme };
}

export default function ConfidenceEngine({
  children,
  initialInputs,
  inputsOverride,
  paused = false,
}: {
  children: React.ReactNode;
  initialInputs?: MarketInputs;
  inputsOverride?: MarketInputs | null;
  paused?: boolean;
}): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  const inputsRef = useRef<MarketInputs>(initialInputs ?? DEFAULT_INPUTS);

  const initialDerived = useMemo(() => deriveFromInputs(initialInputs ?? DEFAULT_INPUTS), [initialInputs]);

  const [marketState, setMarketState] = useState<MarketState>(initialDerived.marketState);
  const [state, setState] = useState<ConfidenceState>(initialDerived.confidence);
  const [narrativeKey, setNarrativeKey] = useState<number>(0);

  const [theme, setTheme] = useState<ConfidenceTheme>(initialDerived.theme);

  // Parity drives narrative variant selection without hard prediction claims.
  const narrativeVariant = narrativeKey % 2;

  // Synchronize theme/state whenever onboarding overrides inputs.
  useEffect(() => {
    if (!inputsOverride) return;

    inputsRef.current = inputsOverride;
    const next = deriveFromInputs(inputsOverride);

    setMarketState(next.marketState);
    setState(next.confidence);
    setTheme(next.theme);
    setNarrativeKey((k) => k + 1);
  }, [inputsOverride]);

  useEffect(() => {
    if (paused) return;
    if (prefersReducedMotion) return;

    let cancelled = false;
    let timeoutId: number | null = null;

    const tick = () => {
      if (cancelled) return;

      const prev = inputsRef.current;

      // Very small drift to avoid “attention seeking” UI churn.
      const volatilityVol = prev.volatilityStability;
      const driftStrength = 0.04 + (1 - volatilityVol) * 0.03;

      const nextInputs: MarketInputs = {
        trendConsistency: clamp01(prev.trendConsistency + randn() * driftStrength),
        volatilityStability: clamp01(prev.volatilityStability + randn() * (driftStrength + 0.01)),
        institutionalParticipation: clamp01(prev.institutionalParticipation + randn() * driftStrength),
        liquidityBreadth: clamp01(prev.liquidityBreadth + randn() * driftStrength),
        sentimentAlignment: clamp01(prev.sentimentAlignment + randn() * driftStrength),
        sectorMomentum: clamp01(prev.sectorMomentum + randn() * driftStrength),
        earningsQuality: clamp01(prev.earningsQuality + randn() * (driftStrength * 0.45)),
      };

      // Occasional larger recalibration to ensure the market state adapts.
      if (Math.random() < 0.16) {
        nextInputs.volatilityStability = clamp01(nextInputs.volatilityStability + (randn() * 0.12 - 0.02));
        nextInputs.liquidityBreadth = clamp01(nextInputs.liquidityBreadth + randn() * 0.10);
      }

      inputsRef.current = nextInputs;

      const next = deriveFromInputs(nextInputs);

      setMarketState(next.marketState);
      setState(next.confidence);
      setTheme(next.theme);
      setNarrativeKey((k) => k + 1);

      // Narrative refresh cadence: 15–45 seconds depending on volatility intensity.
      // Higher volatility => lower stability => shorter interval.
      const intervalMs = Math.round(15000 + nextInputs.volatilityStability * 30000);

      timeoutId = window.setTimeout(tick, intervalMs);
    };

    // Kick immediately for presence.
    timeoutId = window.setTimeout(tick, 900);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [paused, prefersReducedMotion]);

  const value = useMemo<ConfidenceContextValue>(
    () => ({
      state,
      marketState,
      theme,
      narrativeVariant,
      narrativeKey,
    }),
    [state, marketState, theme, narrativeVariant, narrativeKey],
  );

  return <ConfidenceContext.Provider value={value}>{children}</ConfidenceContext.Provider>;
}
