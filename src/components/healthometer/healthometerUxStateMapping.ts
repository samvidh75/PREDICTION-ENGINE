import type { NeuralHealthometerState } from "../../services/synthesis/neuralMarketSynthesisTypes";

export type HealthUxState = "Strong" | "Stable" | "Improving" | "Weakening" | "Volatile" | "High Risk";

export function toHealthUxState(state: NeuralHealthometerState): HealthUxState {
  switch (state) {
    case "Structurally Healthy":
      return "Strong";
    case "Stable Expansion":
      return "Stable";
    case "Confidence Improving":
      return "Improving";
    case "Liquidity Fragile":
      return "Weakening";
    case "Volatility Sensitive":
      return "Volatile";
    case "Structurally Weakening":
    default:
      return "High Risk";
  }
}
