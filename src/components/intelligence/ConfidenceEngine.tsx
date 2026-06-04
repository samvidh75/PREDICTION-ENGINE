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

// Neutral starting point - replaced by live API data immediately
const NEUTRAL_INPUTS: MarketInputs = {
  trendConsistency: 0.50,
  volatilityStability: 0.50,
  institutionalParticipation: 0.50,
  liquidityBreadth: 0.50,
  sentimentAlignment: 0.50,
  sectorMomentum: 0.50,
  earningsQuality: 0.50,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
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

/**
 * Fetches live market intelligence data from the API endpoint.
 * The API returns computed MarketInputs derived from actual market data
 * (database factor snapshots, sector breadth, volatility readings, etc.).
 */
async function fetchLiveMarketInputs(): Promise<MarketInputs | null> {
  try {
    const response = await fetch("/api/intelligence/market", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data) return null;

    // Map API response to MarketInputs shape
    // The API returns computed metrics; we normalize them to 0-1 range
    return {
      trendConsistency: clamp01((data.trendConsistency ?? data.trend_strength ?? 50) / 100),
      volatilityStability: clamp01((data.volatilityStability ?? data.volatility_stability ?? 50) / 100),
      institutionalParticipation: clamp01((data.institutionalParticipation ?? data.institutional_participation ?? 50) / 100),
      liquidityBreadth: clamp01((data.liquidityBreadth ?? data.liquidity_breadth ?? 50) / 100),
      sentimentAlignment: clamp01((data.sentimentAlignment ?? data.sentiment_alignment ?? 50) / 100),
      sectorMomentum: clamp01((data.sectorMomentum ?? data.sector_momentum ?? 50) / 100),
      earningsQuality: clamp01((data.earningsQuality ?? data.earnings_quality ?? 50) / 100),
    };
  } catch {
    return null;
  }
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

  const inputsRef = useRef<MarketInputs>(initialInputs ?? NEUTRAL_INPUTS);
  const lastPolledRef = useRef<number>(0);

  const initialDerived = useMemo(() => deriveFromInputs(initialInputs ?? NEUTRAL_INPUTS), [initialInputs]);

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

  // Poll live market intelligence API periodically to drive the confidence state
  // from actual data instead of random drift
  useEffect(() => {
    if (paused) return;
    if (prefersReducedMotion) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) return;

      const liveInputs = await fetchLiveMarketInputs();

      if (cancelled) return;

      if (liveInputs) {
        inputsRef.current = liveInputs;
        const next = deriveFromInputs(liveInputs);

        setMarketState(next.marketState);
        setState(next.confidence);
        setTheme(next.theme);
        setNarrativeKey((k) => k + 1);
        lastPolledRef.current = Date.now();
      }

      // Poll every 30 seconds
      timeoutId = setTimeout(poll, 30_000);
    };

    // Kick immediately for presence.
    timeoutId = setTimeout(poll, 500);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
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
