/**
 * DataEvidenceIdFactory — stable, deterministic evidence IDs for the
 * data-moat layer.
 *
 * Format:  ev-<hash-of(symbol, field, asOf, sourceCategory)>
 * Stability: same inputs → same ID for idempotent registration.
 */

import { createHash } from "node:crypto";

export class DataEvidenceIdFactory {
  /**
   * Create a stable evidence ID for a given evidence context.
   */
  createId(params: {
    symbol: string;
    field: string;
    asOf: string | null;
    sourceCategory: string;
  }): string {
    const raw = [params.symbol, params.field, params.asOf ?? "unknown", params.sourceCategory].join("|");
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 12);
    return `ev-${hash}`;
  }

  /**
   * Create a lineage entry ID.
   */
  createLineageId(evidenceId: string, step: string): string {
    const raw = [evidenceId, step].join("|");
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 10);
    return `ln-${hash}`;
  }
}

/** Singleton. */
export const dataEvidenceIdFactory = new DataEvidenceIdFactory();
