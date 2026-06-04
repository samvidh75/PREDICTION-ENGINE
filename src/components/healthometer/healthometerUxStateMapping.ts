import type { NeuralHealthometerState } from "../../services/synthesis/neuralMarketSynthesisTypes";

export type HealthUxState = "Very Healthy" | "Healthy" | "Stable" | "Weakening" | "Unhealthy";

export function toHealthUxState(state: NeuralHealthometerState): HealthUxState {
  switch (state) {
    case "Structurally Healthy":
      return "Very Healthy";
    case "Stable Expansion":
      return "Stable";
    case "Confidence Improving":
      return "Healthy";
    case "Liquidity Fragile":
      return "Weakening";
    case "Volatility Sensitive":
      return "Unhealthy";
    case "Structurally Weakening":
    default:
      return "Unhealthy";
  }
}
