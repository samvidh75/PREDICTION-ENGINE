import React from "react";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import SimplifiedHealthometer from "./SimplifiedHealthometer";

type Props = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
};

/**
 * HealthometerEcosystem
 * - Currently simplified to the 5-state beginner-friendly “Stock Health” indicator.
 * - Keeps the existing prop contract so callers don’t break.
 */
export default function HealthometerEcosystem({ synthesis, theme }: Props): JSX.Element {
  return <SimplifiedHealthometer synthesis={synthesis} theme={theme} />;
}
