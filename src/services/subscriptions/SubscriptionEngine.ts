// src/services/subscriptions/SubscriptionEngine.ts

export type SubscriptionPlan = "Free" | "Plus" | "Pro" | "Institutional";

export class SubscriptionEngine {
  private static activePlan: SubscriptionPlan = "Free";
  private static listeners: Array<(plan: SubscriptionPlan) => void> = [];

  public static getActivePlan(): SubscriptionPlan {
    return this.activePlan;
  }

  public static setActivePlan(plan: SubscriptionPlan): void {
    this.activePlan = plan;
    this.listeners.forEach((l) => l(plan));
  }

  public static subscribe(listener: (plan: SubscriptionPlan) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
