import type { ConfidenceState } from "../../intelligence/ConfidenceEngine";
import type { DiscoveryResult } from "../../../services/discovery/discoveryTypes";

export function labelForState(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Increased Sector Rotation";
    case "STABLE_CONVICTION":
      return "Stable Market Conditions";
    case "NEUTRAL_ENVIRONMENT":
      return "Liquidity Strength Improving";
    case "MOMENTUM_WEAKENING":
      return "Elevated Sector Drift";
    case "ELEVATED_RISK":
      return "Elevated Volatility";
    default:
      return "Market Conditions";
  }
}

export function notificationForState(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Institutional activity reads steadier across large-cap banking exposures.";
    case "STABLE_CONVICTION":
      return "Market health checks remain controlled—signals stay constructive with contained risk intensity.";
    case "NEUTRAL_ENVIRONMENT":
      return "Energy is reorganizing slowly—liquidity and volatility are showing cautious balance.";
    case "MOMENTUM_WEAKENING":
      return "Mid-cycle momentum softens—follow-through becomes selective, not unstable.";
    case "ELEVATED_RISK":
      return "Volatility pressure is widening—risk intensity elevates with tighter interpretive confidence.";
    default:
      return "Market conditions remain composed—interpretation stays educational and probabilistic.";
  }
}

export function formatKind(kind: DiscoveryResult["kind"]): string {
  return kind.replaceAll("_", " ");
}

export function relationshipPreview(tags: string[]): string {
  return tags.slice(0, 2).join(" • ");
}
