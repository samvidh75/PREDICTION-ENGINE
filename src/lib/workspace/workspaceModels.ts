export interface ThesisSnapshot {
  symbol: string;
  signalLabel: string | null;
  score: number | null;
  confidence: number | null;
  qualityScore: number | null;
  valuationScore: number | null;
  growthScore: number | null;
  riskScore: number | null;
  momentumScore: number | null;
  topDrivers: string[];
  topRisks: string[];
  timestamp: string;
}

export interface ResearchChangeEvent {
  symbol: string;
  type: "signal_changed" | "risk_rising" | "factor_changed" | "thesis_needs_review" | "no_prior_snapshot";
  previousLabel: string | null;
  currentLabel: string | null;
  previousScore: number | null;
  currentScore: number | null;
  details: string[];
  timestamp: string;
}

export interface WorkspaceStorageStatus {
  location: "local" | "cloud" | "local_and_cloud";
  label: string;
  detail: string | null;
}

export function getStorageStatus(storage: "local" | "cloud" | "local_and_cloud"): WorkspaceStorageStatus {
  switch (storage) {
    case "local":
      return { location: "local", label: "Saved on this device", detail: "Data is stored locally in your browser. Create an account to preserve across devices." };
    case "cloud":
      return { location: "cloud", label: "Saved to your account", detail: "Data is stored securely and available across devices." };
    case "local_and_cloud":
      return { location: "local_and_cloud", label: "Saved to your account", detail: "Data is stored locally and synced to your account." };
  }
}

export type FreshnessLabel =
  | { state: "updated_today"; label: "Updated today" }
  | { state: "updated_yesterday"; label: "Updated yesterday" }
  | { state: "updated_recently"; label: `Updated ${number} days ago` }
  | { state: "awaiting_cycle"; label: "Awaiting latest research cycle" }
  | { state: "needs_review"; label: "Needs review" }
  | { state: "tracking_begins"; label: "Tracking begins now" }
  | { state: "unknown"; label: null };

export function computeFreshness(timestamp: string | null | undefined): FreshnessLabel {
  if (!timestamp) return { state: "unknown", label: null };

  const now = Date.now();
  const then = new Date(timestamp).getTime();
  if (isNaN(then)) return { state: "unknown", label: null };

  const diffMs = now - then;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours < 24) return { state: "updated_today", label: "Updated today" };
  if (diffHours < 48) return { state: "updated_yesterday", label: "Updated yesterday" };
  if (diffDays < 7) return { state: "updated_recently", label: `Updated ${Math.floor(diffDays)} days ago` as any };
  if (diffDays < 30) return { state: "needs_review", label: "Needs review" };
  return { state: "awaiting_cycle", label: "Awaiting latest research cycle" };
}
