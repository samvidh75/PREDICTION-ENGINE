import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";

export type NotificationKind =
  | "market_environment"
  | "institutional_activity"
  | "behavioural_reflection"
  | "learning_summary"
  | "daily_market_briefing"
  | "portfolio_intelligence";

export type NotificationPriority = 1 | 2 | 3 | 4 | 5;

export type IntelligenceNotification = {
  id: string;
  kind: NotificationKind;

  title: string;
  body: string;

  priority: NotificationPriority;
  createdAt: number;

  // Useful for UI/context and de-duplication
  confidenceState?: ConfidenceState;
  narrativeKey?: number;

  // Calmer signatures (avoid noise)
  signature: string;
};

export type AlertContext = {
  confidenceState: ConfidenceState;
  marketStateLabel: string; // educational label from engine (e.g. "Elevated Volatility")
  narrativeKey: number;
};
