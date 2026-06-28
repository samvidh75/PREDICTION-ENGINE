/**
 * ResearchAuditTrailService — internal-only audit trail.
 */

import { stableHash } from '../../utils/hash';
import type { ResearchAuditRecord } from './ResearchAuditTrailTypes';
import { containsSecrets } from '../shared/AnalystPublicSerializer';

export class ResearchAuditTrailService {
  private records = new Map<string, ResearchAuditRecord>();

  record(input: Omit<ResearchAuditRecord, 'id' | 'generatedAt'>): string {
    if (containsSecrets(input)) {
      throw new Error('Audit record must not contain secrets.');
    }

    const id = `audit_${stableHash(`${input.workflowId}_${input.inputHash}`)}`;
    const record: ResearchAuditRecord = {
      ...input,
      id,
      generatedAt: new Date().toISOString(),
    };
    this.records.set(id, record);
    return id;
  }

  get(id: string): ResearchAuditRecord | null {
    return this.records.get(id) ?? null;
  }

  list(): ResearchAuditRecord[] {
    return [...this.records.values()].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  toPublic(): null {
    return null;
  }

  clear(): void {
    this.records.clear();
  }
}

export const defaultAuditTrailService = new ResearchAuditTrailService();
