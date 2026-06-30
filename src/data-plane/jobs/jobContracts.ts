/**
 * jobContracts.ts — Internal types for the Phase 20B data-plane job system.
 *
 * These types describe scheduled/precomputed analytics jobs.
 * They are internal-only and must not appear in any public UI copy.
 */

export type DataPlaneJobKind =
  | "eod_refresh"
  | "healthometer_snapshot"
  | "scanner_snapshot"
  | "ranking_snapshot"
  | "event_evidence_snapshot"
  | "watchlist_thesis_refresh"
  | "cache_cleanup"
  | "quota_report";

export type DataPlaneJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

export interface DataPlaneJobRun {
  id: string;
  kind: DataPlaneJobKind;
  startedAt: string;
  finishedAt?: string | null;
  status: DataPlaneJobStatus;
  symbolsProcessed: number;
  providerCalls: number;
  cacheHits: number;
  cacheWrites: number;
  skippedReason?: string | null;
  errorSummary?: string | null;
}

export function formatErrorSummary(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : err === null || err === undefined
          ? "Unknown error"
          : String(err);
  // Strip stack traces and anything that looks like a secret/key
  const withoutStack = msg.split("\n")[0] ?? msg;
  return withoutStack.replace(/(key|secret|token|password|credential)=[^\s&]+/gi, "$1=***");
}

export function isValidStatusTransition(
  from: DataPlaneJobStatus | null,
  to: DataPlaneJobStatus,
): boolean {
  const allowed: Record<string, DataPlaneJobStatus[]> = {
    queued: ["running", "skipped", "succeeded", "failed"],
    running: ["succeeded", "failed"],
    succeeded: [],
    failed: ["queued", "running"],
    skipped: [],
  };
  if (!from) return ["queued", "running", "succeeded", "failed", "skipped"].includes(to);
  return allowed[from]?.includes(to) ?? false;
}
