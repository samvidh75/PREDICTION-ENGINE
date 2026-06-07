// src/services/subscriptions/PlanCoordinator.ts
import { SubscriptionPlan } from "./SubscriptionEngine";

export interface PlanMeta {
  plan: SubscriptionPlan;
  priceFormatted: string;
  benefits: string[];
}

export class PlanCoordinator {
  private static planDetails: PlanMeta[] = [
    { plan: "Free", priceFormatted: "₹0 / month", benefits: ["Basic Ticker Search", "Market Health Index", "Primary Stories"] },
    { plan: "Plus", priceFormatted: "₹999 / month", benefits: ["Portfolio Analytics", "Sector Explorer Matrix", "Smart Alerts"] },
    { plan: "Pro", priceFormatted: "₹2,499 / month", benefits: ["AI Copilot Workspace", "Advanced Health Telemetry", "High Conviction Discovery"] },
    { plan: "Institutional", priceFormatted: "Custom Pricing", benefits: ["Excel/CSV/PDF Exports", "Shared Team Workspaces", "Corporate Collaboration"] },
  ];

  public static getPlans(): PlanMeta[] {
    return this.planDetails;
  }
}
