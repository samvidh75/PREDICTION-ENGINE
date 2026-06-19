import { computeFreshness, type FreshnessLabel } from "./workspaceModels";

export function getFreshnessLabel(timestamp: string | null | undefined): FreshnessLabel {
  return computeFreshness(timestamp);
}

export function getDisplayFreshness(timestamp: string | null | undefined): string | null {
  const f = computeFreshness(timestamp);
  return f.label;
}
