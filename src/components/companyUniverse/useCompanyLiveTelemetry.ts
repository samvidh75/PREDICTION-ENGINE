import { useEffect, useMemo, useRef, useState } from "react";
import type { CompanyHealthState } from "../../types/CompanyUniverse";
import type { ConfidenceState } from "../intelligence/ConfidenceEngine";

export type CompanyTelemetrySnapshot = {
  price: number;
  dailyChangePct: number; // -..+
  volume: number;

  bidDepth: number; // 0..1
  askDepth: number; // 0..1

  liquidityParticipation: number; // 0..1
  volatilityEnvironment: number; // 0..1
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

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

function volatilityFromConfidence(conf: ConfidenceState): number {
  switch (conf) {
    case "ELEVATED_RISK":
      return 0.82;
    case "MOMENTUM_WEAKENING":
      return 0.60;
    case "NEUTRAL_ENVIRONMENT":
      return 0.48;
    case "CONFIDENCE_RISING":
      return 0.36;
    case "STABLE_CONVICTION":
    default:
      return 0.26;
  }
}

function liquidityFromHealth(state: CompanyHealthState): number {
  switch (state) {
    case "STRUCTURALLY_HEALTHY":
      return 0.70;
    case "STABLE_EXPANSION":
      return 0.62;
    case "CONFIDENCE_IMPROVING":
      return 0.58;
    case "LIQUIDITY_FRAGILE":
      return 0.44;
    case "VOLATILITY_SENSITIVE":
      return 0.48;
    case "STRUCTURALLY_WEAKENING":
    default:
      return 0.40;
  }
}

export function formatINRCompact(n: number): string {
  const abs = Math.abs(n);
  if (!Number.isFinite(n)) return "—";
  if (abs >= 1e12) return `₹${(n / 1e12).toFixed(2)} lakh cr`;
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} lakh`;
  return `₹${Math.round(n).toLocaleString(undefined)}`;
}

export function formatINRPrice(price: number): string {
  if (!Number.isFinite(price)) return "—";
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 100) return price.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function useCompanyLiveTelemetry(args: {
  ticker: string;
  confidenceState: ConfidenceState;
  companyHealthState: CompanyHealthState;
  enabled?: boolean;
  tickMs?: number;
}): CompanyTelemetrySnapshot {
  const {
    ticker,
    confidenceState,
    companyHealthState,
    enabled = true,
    tickMs = 1000,
  } = args;

  const seed = useMemo(() => hashStringToSeed(`ct_${ticker}_${companyHealthState}`), [ticker, companyHealthState]);
  const rnd = useMemo(() => mulberry32(seed), [seed]);

  const initial = useMemo<CompanyTelemetrySnapshot>(() => {
    const base = 40 + rnd() * 3200; // 40..3240 synthetic “price”
    const volatilityEnvironment = volatilityFromConfidence(confidenceState);
    const liquidityParticipation = liquidityFromHealth(companyHealthState);

    const bidDepth = clamp(0.35 + rnd() * 0.5 + (liquidityParticipation - 0.5) * 0.2, 0.05, 0.95);
    const askDepth = clamp(0.35 + rnd() * 0.5 + (0.5 - liquidityParticipation) * 0.12, 0.05, 0.95);

    return {
      price: base,
      dailyChangePct: 0,
      volume: Math.round((4e5 + rnd() * 3.5e6) * (0.6 + liquidityParticipation)),
      bidDepth,
      askDepth,
      liquidityParticipation,
      volatilityEnvironment,
    };
  }, [companyHealthState, confidenceState, rnd]);

  const [snap, setSnap] = useState<CompanyTelemetrySnapshot>(initial);

  const anchorPriceRef = useRef<number>(initial.price);
  const anchorAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    anchorPriceRef.current = initial.price;
    anchorAtRef.current = Date.now();

    setSnap(initial);

    let intervalId: number | null = null;

    const tick = () => {
      const now = Date.now();
      const anchorAgeMs = now - anchorAtRef.current;

      // Re-anchor every ~45s to simulate a “daily movement” feel without time math.
      if (anchorAgeMs > 45_000) {
        anchorAtRef.current = now;
        anchorPriceRef.current = snap.price;
      }

      const t = now / 1000;

      const volEnv = volatilityFromConfidence(confidenceState);
      const liqPart = liquidityFromHealth(companyHealthState);

      // Controlled random walk: stronger volatility => larger step.
      const noise = Math.sin(t * 0.9 + seed * 0.000001) * 0.6 + Math.cos(t * 0.37 + seed * 0.00001) * 0.4;
      const stepPct = (noise * 0.0009 + (volEnv - 0.4) * 0.00035) * (0.65 + liqPart * 0.65);

      setSnap((prev) => {
        const nextPrice = clamp(prev.price * (1 + stepPct), 2, 25_000);

        // dailyChangePct relative to anchor.
        const basePrice = anchorPriceRef.current;
        const dailyChangePct = basePrice <= 0 ? 0 : ((nextPrice - basePrice) / basePrice) * 100;

        // depth participation: stabilize around liquidity/volatility.
        const bidDepth = clamp(0.28 + liqPart * 0.42 + (Math.sin(t * 0.7 + seed) * 0.06) - (volEnv - 0.4) * 0.04, 0.05, 0.98);
        const askDepth = clamp(0.26 + liqPart * 0.40 + (Math.cos(t * 0.52 + seed) * 0.06) + (volEnv - 0.4) * 0.05, 0.05, 0.98);

        const volScale = 0.55 + liqPart * 0.8;
        const volumeNoise = 0.75 + (Math.sin(t * 0.31 + seed * 0.0002) * 0.5 + 0.5) * 0.55;
        const volume = Math.round((2.2e5 + rnd() * 3.8e6) * volScale * volumeNoise);

        return {
          ...prev,
          price: nextPrice,
          dailyChangePct,
          volume,
          bidDepth,
          askDepth,
          liquidityParticipation: liqPart,
          volatilityEnvironment: volEnv,
        };
      });
    };

    intervalId = window.setInterval(tick, tickMs);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
    // We intentionally exclude `snap` to avoid interval churn; update uses refs + functional setSnap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tickMs, ticker, confidenceState, companyHealthState, seed, initial.price]);

  return snap;
}
