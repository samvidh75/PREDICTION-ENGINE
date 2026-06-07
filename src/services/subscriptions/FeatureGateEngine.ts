// src/services/subscriptions/FeatureGateEngine.ts
import { SubscriptionEngine } from "./SubscriptionEngine";
import { EntitlementEngine, EntitlementFeature } from "./EntitlementEngine";

export class FeatureGateEngine {
  public static checkFeature(feature: EntitlementFeature): boolean {
    const activePlan = SubscriptionEngine.getActivePlan();
    return EntitlementEngine.isEntitled(activePlan, feature);
  }
}
