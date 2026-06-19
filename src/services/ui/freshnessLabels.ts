import { ThesisSnapshotEngine } from "../portfolio/ThesisSnapshotEngine";

export type FreshnessLabel =
  | "Updated today"
  | "Updated yesterday"
  | "Tracking begins now"
  | "Signals changed"
  | "No change since last review"
  | "Needs review"
  | "Awaiting latest research cycle";

export function getFreshnessLabel(timestamp: string | null | undefined): FreshnessLabel | null {
  if (!timestamp) return null;
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = now - then;
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) return "Updated today";
  if (diffHours < 48) return "Updated yesterday";
  return null;
}

export function getSnapshotChangeLabel(symbol: string, currentScore: number | null, currentRisk: number | null): FreshnessLabel | null {
  const prev = ThesisSnapshotEngine.getSnapshot(symbol);
  if (!prev) return "Tracking begins now";

  const prevScore = prev.score;
  const prevLabel = prev.label;

  if (currentScore !== null && prevScore !== null && Math.abs(currentScore - prevScore) >= 10) {
    return "Signals changed";
  }

  if (currentRisk !== null && prev.factors?.risk !== null) {
    const prevRisk = prev.factors?.risk ?? null;
    if (prevRisk !== null && currentRisk < 40 && prevRisk >= 40) {
      return "Needs review";
    }
  }

  return "No change since last review";
}

export function formatLastUpdated(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}
