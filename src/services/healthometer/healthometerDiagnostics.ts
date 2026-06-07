declare global {
  interface Window {
    __ss_healthometer_diag_buffer?: Array<unknown>;
  }
}

export type HealthometerDiagEvent =
  | {
      type: "healthometer_category_eval";
      at: number;
      overallScore01: number;
      confidenceTone: "composed" | "guarded" | "sensitive";
      availableSignalCoverage: number;
      anomalyFlags: string[];
      weights: Record<string, number>;
    }
  | {
      type: "healthometer_category_eval_missing";
      at: number;
      reason: string;
    };

function getBuffer(): Array<unknown> | null {
  if (typeof window === "undefined") return null;
  const g = window as Window;
  if (!g.__ss_healthometer_diag_buffer) g.__ss_healthometer_diag_buffer = [];
  return g.__ss_healthometer_diag_buffer;
}

export function pushHealthometerDiag(ev: HealthometerDiagEvent, maxEntries = 120): void {
  const buf = getBuffer();
  if (!buf) return;

  buf.push(ev);

  if (buf.length > maxEntries) {
    buf.splice(0, buf.length - maxEntries);
  }
}
