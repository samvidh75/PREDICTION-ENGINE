import { useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { NeuralMarketSynthesis } from "./neuralMarketSynthesisTypes";
import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";
import { useConfidenceEngine } from "../../components/intelligence/ConfidenceEngine";
import { useMotionController } from "../../components/motion/MotionController";
import { MarketService } from "../market/marketService";
import { useMarketService } from "../ui/environmentSync";
import { buildNeuralMarketSynthesisEngine } from "./neuralMarketSynthesisEngine";

function pickQuality(args: { prefersReducedMotion: boolean | null; isMobile: boolean; state: ConfidenceState }): "low" | "balanced" | "high" {
  const { prefersReducedMotion, isMobile, state } = args;
  if ((prefersReducedMotion ?? false) || isMobile) return "low";
  if (state === "ELEVATED_RISK" || state === "MOMENTUM_WEAKENING") return "balanced";
  return "high";
}

export function useNeuralMarketSynthesisSuperengine(): {
  synthesis: NeuralMarketSynthesis;
  connectionStatus: "disconnected" | "connecting" | "connected" | "reconnecting";
} {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useMotionController();
  const { state, theme, narrativeKey } = useConfidenceEngine();

  const marketServiceRef = useRef<MarketService | null>(null);
  if (!marketServiceRef.current) marketServiceRef.current = new MarketService();

  const marketStream = useMarketService(marketServiceRef.current);

  const quality = pickQuality({ prefersReducedMotion, isMobile, state });

  const synthesis = useMemo(() => {
    return buildNeuralMarketSynthesisEngine({
      market: marketStream.snapshot,
      confidenceState: state,
      theme,
      narrativeKey,
      quality,
    });
  }, [marketStream.snapshot, state, theme, narrativeKey, quality]);

  return { synthesis, connectionStatus: marketStream.connectionStatus };
}
