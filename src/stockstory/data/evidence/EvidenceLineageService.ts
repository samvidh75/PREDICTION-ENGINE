/**
 * Evidence Lineage Service
 *
 * Tracks the provenance chain for every data point.
 * Records evidence, builds chains, and supports audit queries.
 */

import type {
  EvidenceRecord,
  EvidenceChain,
  LineageGraph,
  EvidenceClaim,
} from './EvidenceLineageTypes';
import { evidenceIdFactory } from './EvidenceIdFactory';

export class EvidenceLineageService {
  /** All evidence records keyed by evidence ID */
  private records: Map<string, EvidenceRecord> = new Map();

  /** subject+attribute → latest evidence ID */
  private latestIndex: Map<string, string> = new Map();

  /** evidence ID → contributor evidence IDs */
  private contributions: Map<string, Set<string>> = new Map();

  record(record: EvidenceRecord): void {
    this.records.set(record.evidenceId.id, record);

    const subjectKey = `${record.claim.subject}::${record.claim.attribute}`;
    const existing = this.latestIndex.get(subjectKey);
    if (!existing || record.capturedAt > (this.records.get(existing)?.capturedAt ?? '')) {
      this.latestIndex.set(subjectKey, record.evidenceId.id);
    }
  }

  addContribution(childId: string, parentId: string): void {
    const contributors = this.contributions.get(childId) ?? new Set();
    contributors.add(parentId);
    this.contributions.set(childId, contributors);
  }

  getLatest(subject: string, attribute: string): EvidenceRecord | undefined {
    const key = `${subject}::${attribute}`;
    const id = this.latestIndex.get(key);
    if (!id) return undefined;
    return this.records.get(id);
  }

  getById(evidenceId: string): EvidenceRecord | undefined {
    return this.records.get(evidenceId);
  }

  buildChain(evidenceId: string): EvidenceChain | undefined {
    const final = this.records.get(evidenceId);
    if (!final) return undefined;

    const contributorIds = this.contributions.get(evidenceId) ?? new Set();
    const contributors: EvidenceRecord[] = [];
    for (const cid of contributorIds) {
      const record = this.records.get(cid);
      if (record) contributors.push(record);
    }

    const allRecords = [final, ...contributors].sort(
      (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
    );

    return {
      final,
      contributors,
      chainHash: evidenceIdFactory.hash(allRecords.map(r => ({
        evidenceId: r.evidenceId,
        capturedAt: r.capturedAt,
      }))),
    };
  }

  getBySubject(subject: string): EvidenceRecord[] {
    const results: EvidenceRecord[] = [];
    for (const record of this.records.values()) {
      if (record.claim.subject === subject) results.push(record);
    }
    return results.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }

  getByDomain(domain: string): EvidenceRecord[] {
    return Array.from(this.records.values()).filter(r => r.evidenceId.domain === domain);
  }

  getLineageGraph(evidenceId: string): LineageGraph | undefined {
    const chain = this.buildChain(evidenceId);
    if (!chain) return undefined;

    const nodes = [chain.final, ...chain.contributors];
    const edges = chain.contributors.map(c => ({
      from: c.evidenceId.id,
      to: chain.final.evidenceId.id,
      relationship: 'contributes_to',
    }));

    return { nodes, edges };
  }

  searchByAttribute(attribute: string): EvidenceRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.claim.attribute.toUpperCase().includes(attribute.toUpperCase()))
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }

  getStats(): {
    totalRecords: number;
    byDomain: Record<string, number>;
    byKind: Record<string, number>;
    chainedRecords: number;
  } {
    const byDomain: Record<string, number> = {};
    const byKind: Record<string, number> = {};

    for (const r of this.records.values()) {
      byDomain[r.evidenceId.domain] = (byDomain[r.evidenceId.domain] ?? 0) + 1;
      byKind[r.evidenceId.kind] = (byKind[r.evidenceId.kind] ?? 0) + 1;
    }

    return {
      totalRecords: this.records.size,
      byDomain,
      byKind,
      chainedRecords: this.contributions.size,
    };
  }
}

export const evidenceLineage = new EvidenceLineageService();
