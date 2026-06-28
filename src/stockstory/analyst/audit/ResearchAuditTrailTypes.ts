/**
 * Research Audit Trail Types
 */

export interface ResearchAuditRecord {
  id: string;
  taskId: string | null;
  workflowId: string;
  symbol: string | null;
  sector: string | null;
  inputHash: string;
  dataSnapshotIds: string[];
  evidenceIds: string[];
  engineVersions: string[];
  promptVersion: string | null;
  outputValidationResult: 'passed' | 'warnings' | 'failed';
  confidenceScore: number;
  reviewStatus: string;
  generatedAt: string;
}
