/**
 * DataLineageService — records and queries the provenance trail for
 * every evidence data point.
 *
 * Tracks each transformation step so internal validators can audit
 * where values came from.
 */

import type {
  DataEvidence,
  DataLineageEntry,
  StockEvidenceCollection,
  PublicEvidenceSummary,
} from "./DataEvidenceTypes.ts";
import { dataEvidenceIdFactory } from "./DataEvidenceIdFactory.ts";

export class DataLineageService {
  private evidenceStore = new Map<string, DataEvidence>();
  private lineageStore = new Map<string, DataLineageEntry[]>();

  // -------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------

  /**
   * Register a new evidence record and its initial lineage entry.
   */
  registerEvidence(evidence: DataEvidence): void {
    this.evidenceStore.set(evidence.id, evidence);
    this.lineageStore.set(evidence.id, [
      {
        id: dataEvidenceIdFactory.createLineageId(evidence.id, "registered"),
        evidenceId: evidence.id,
        symbol: evidence.symbol,
        step: "registered",
        source: evidence.sourceId,
        timestamp: evidence.createdAt,
        detail: `Evidence created for field "${evidence.field}" from ${evidence.sourceCategory}`,
      },
    ]);
  }

  /**
   * Append a lineage step to an existing evidence record.
   */
  appendLineage(entry: DataLineageEntry): void {
    const existing = this.lineageStore.get(entry.evidenceId) ?? [];
    existing.push(entry);
    this.lineageStore.set(entry.evidenceId, existing);
  }

  // -------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------

  /**
   * Get the full evidence record + lineage for a given evidence ID.
   */
  getEvidence(id: string): DataEvidence | undefined {
    return this.evidenceStore.get(id);
  }

  /**
   * Get lineage trail for an evidence record.
   */
  getLineage(evidenceId: string): DataLineageEntry[] {
    return this.lineageStore.get(evidenceId) ?? [];
  }

  /**
   * Get all evidence + lineage for a symbol.
   */
  getForSymbol(symbol: string): StockEvidenceCollection {
    const evidence: DataEvidence[] = [];
    const lineage: DataLineageEntry[] = [];

    for (const [, ev] of this.evidenceStore) {
      if (ev.symbol === symbol) {
        evidence.push(ev);
        const trail = this.lineageStore.get(ev.id) ?? [];
        lineage.push(...trail);
      }
    }

    return {
      symbol,
      evidence,
      lineage,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------
  // Public-safe summaries
  // -------------------------------------------------------------------

  /**
   * Produce a public-safe evidence summary (no source IDs or
   * internal provenance exposed).
   */
  toPublicSummary(evidence: DataEvidence): PublicEvidenceSummary {
    return {
      id: evidence.id,
      label: evidence.publicLabel ?? evidence.field,
      summary: String(evidence.value ?? "unavailable"),
      asOf: evidence.asOf,
      confidence: evidence.confidence,
    };
  }
}
