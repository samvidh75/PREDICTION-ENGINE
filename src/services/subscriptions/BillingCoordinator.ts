// src/services/subscriptions/BillingCoordinator.ts
import { SubscriptionEngine, SubscriptionPlan } from "./SubscriptionEngine";

export class BillingCoordinator {
  public static processUpgrade(plan: SubscriptionPlan): { success: boolean; message: string } {
    SubscriptionEngine.setActivePlan(plan);
    return {
      success: true,
      message: `Successfully upgraded to the ${plan} tier! Entitlements are now unlocked.`,
    };
  }
}
