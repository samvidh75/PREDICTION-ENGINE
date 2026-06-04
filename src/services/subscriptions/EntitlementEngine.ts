// src/services/subscriptions/EntitlementEngine.ts
import { SubscriptionPlan } from "./SubscriptionEngine";

export type EntitlementFeature =
  | "basicSearch"
  | "basicTelemetry"
  | "basicWatchlists"
  | "basicStories"
  | "advancedWatchlists"
  | "portfolioIntelligence"
  | "alerts"
  | "sectorExplorer"
  | "extendedHistory"
  | "advancedTelemetry"
  | "aiCopilot"
  | "unlimitedAlerts"
  | "advancedDiscovery"
  | "portfolioDiagnostics"
  | "researchExports"
  | "teamSpaces"
  | "collaboration"
  | "customScreens";

export class EntitlementEngine {
  private static planEntitlements: Record<SubscriptionPlan, EntitlementFeature[]> = {
    Free: ["basicSearch", "basicTelemetry", "basicWatchlists", "basicStories"],
    Plus: [
      "basicSearch",
      "basicTelemetry",
      "basicWatchlists",
      "basicStories",
      "advancedWatchlists",
      "portfolioIntelligence",
      "alerts",
      "sectorExplorer",
      "extendedHistory",
    ],
    Pro: [
      "basicSearch",
      "basicTelemetry",
      "basicWatchlists",
      "basicStories",
      "advancedWatchlists",
      "portfolioIntelligence",
      "alerts",
      "sectorExplorer",
      "extendedHistory",
      "advancedTelemetry",
      "aiCopilot",
      "unlimitedAlerts",
      "advancedDiscovery",
      "portfolioDiagnostics",
    ],
    Institutional: [
      "basicSearch",
      "basicTelemetry",
      "basicWatchlists",
      "basicStories",
      "advancedWatchlists",
      "portfolioIntelligence",
      "alerts",
      "sectorExplorer",
      "extendedHistory",
      "advancedTelemetry",
      "aiCopilot",
      "unlimitedAlerts",
      "advancedDiscovery",
      "portfolioDiagnostics",
      "researchExports",
      "teamSpaces",
      "collaboration",
      "customScreens",
    ],
  };

  public static isEntitled(plan: SubscriptionPlan, feature: EntitlementFeature): boolean {
    const list = this.planEntitlements[plan] || [];
    return list.includes(feature);
  }
}
