/**
 * Evidence & Data Lineage Types
 *
 * Every data point in Lensory must be traceable back to its source
 * through an evidence chain that records: who said it, when, via what source,
 * and with what confidence.
 */

export type EvidenceKind = 'market' | 'fundamental' | 'corporate_action' | 'filing' | 'result' | 'news' | 'derived';

export interface EvidenceId {
  /** Unique evidence identifier: e.g., "ev_NSE_TCS_Q3FY24_001" */
  id: string;

  /** Human-readable label */
  label: string;

  /** What kind of evidence this is */
  kind: EvidenceKind;

  /** Which data domain this belongs to */
  domain: string;
}

export interface EvidenceRecord {
  evidenceId: EvidenceId;

  /** The actual data point (the claim) */
  claim: EvidenceClaim;

  /** Where this data came from */
  source: EvidenceSource;

  /** When it was recorded */
  capturedAt: string;

  /** When the source originally published it */
  sourceTimestamp: string | null;

  /** Who or what recorded it */
  ingestedBy: string;

  /** Confidence in this evidence (0–1) */
  confidence: number;

  /** Tags for discoverability */
  tags: string[];

  /** Raw data for audit trail */
  rawPayload?: unknown;
}

export interface EvidenceClaim {
  /** What symbol/company this claim is about */
  subject: string;

  /** What attribute: e.g., "PE_RATIO", "REVENUE", "DIVIDEND_AMOUNT" */
  attribute: string;

  /** The claimed value */
  value: unknown;

  /** Unit if applicable */
  unit?: string;

  /** For time-series: the period this claim applies to */
  period?: string;
}

export interface EvidenceSource {
  /** Source identifier from DataSourceRegistry */
  sourceId: string;

  /** Source display name */
  sourceName: string;

  /** URL or file path where data was fetched from */
  url?: string;

  /** HTTP status or exit code */
  statusCode?: number;

  /** Any provenance metadata */
  provenance?: Record<string, unknown>;
}

export interface EvidenceChain {
  /** The final derived data point */
  final: EvidenceRecord;

  /** Intermediate evidence that contributed to the final value */
  contributors: EvidenceRecord[];

  /** Audit hash for tamper detection */
  chainHash: string;
}

export interface LineageGraph {
  nodes: EvidenceRecord[];
  edges: Array<{ from: string; to: string; relationship: string }>;
}
