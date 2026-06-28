/**
 * DataEvidenceTypes — types for data-moat evidence records and lineage entries.
 *
 * These extend the intelligence-layer `ResearchEvidence` with data-moat
 * specific metadata (provenance, document references, stable IDs).
 */

import type { EvidenceKind } from "../../intelligence/evidence/EvidenceTypes.ts";

// ---------------------------------------------------------------------------
// Data evidence record
// ---------------------------------------------------------------------------

export interface DataEvidence {
  /** Stable evidence ID (see EvidenceIdFactory). */
  id: string;

  /** NSE symbol the evidence relates to. */
  symbol: string;

  /** Field or metric name (e.g. "revenue", "pe_ratio"). */
  field: string;

  /** The observed value. */
  value: string | number | boolean | null;

  /** As-of date for the value (ISO date string). */
  asOf: string | null;

  /** Data source category (from DataSourceRegistry). */
  sourceCategory: string;

  /** Internal source identifier (not exposed to public). */
  sourceId: string;

  /** Optional document ID if the evidence originated from a document. */
  documentId?: string | null;

  /** Confidence 0–1. */
  confidence: number;

  /** When this evidence record was created. */
  createdAt: string;

  /** Human-readable provenance summary for internal use. */
  provenance: string;

  /** Safe public label, or null if not displayable. */
  publicLabel?: string | null;
}

// ---------------------------------------------------------------------------
// Data lineage trail
// ---------------------------------------------------------------------------

export interface DataLineageEntry {
  /** Stable lineage entry ID. */
  id: string;

  /** Evidence ID this entry contributes to. */
  evidenceId: string;

  /** Symbol. */
  symbol: string;

  /** Step description (e.g. "fetched from provider", "normalised", "validated"). */
  step: string;

  /** Source or transformation name. */
  source: string;

  /** Timestamp of this lineage step. */
  timestamp: string;

  /** Optional detail. */
  detail?: string;
}

// ---------------------------------------------------------------------------
// Evidence summary for public-safe exposure
// ---------------------------------------------------------------------------

export interface PublicEvidenceSummary {
  /** Evidence ID (stable). */
  id: string;

  /** Safe public label. */
  label: string;

  /** Human-readable value. */
  summary: string;

  /** As-of date for display. */
  asOf: string | null;

  /** Confidence indicator. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Evidence-to-intelligence bridge
// ---------------------------------------------------------------------------

export interface EvidenceBridge {
  /** The data-moat evidence ID. */
  dataEvidenceId: string;

  /** The intelligence-layer ResearchEvidence ID it maps to. */
  researchEvidenceId: string;

  /** Symbol. */
  symbol: string;

  /** Mapping confidence. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Evidence collection for a stock
// ---------------------------------------------------------------------------

export interface StockEvidenceCollection {
  symbol: string;
  evidence: DataEvidence[];
  lineage: DataLineageEntry[];
  lastUpdatedAt: string;
}
