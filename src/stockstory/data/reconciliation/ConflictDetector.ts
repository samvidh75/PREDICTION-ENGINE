/**
 * Conflict Detector
 *
 * Detects data conflicts across sources for identity, sector,
 * financial values, dates, and more.
 */

import type { ConflictRecord, ConflictCategory, ConflictSeverity } from './ReconciliationTypes';
import { stableHash } from '../../utils/hash';

export class ConflictDetector {
  private conflicts: ConflictRecord[] = [];

  /**
   * Generic detection: runs all available checks.
   */
  detect(): ConflictRecord[] {
    return [...this.conflicts];
  }

  /**
   * Detect identity mismatch (e.g., different company names for same symbol)
   */
  detectIdentityMismatch(
    symbol: string,
    name1: string,
    name2: string,
    source1: string,
    source2: string
  ): ConflictRecord | null {
    if (name1.toLowerCase() === name2.toLowerCase()) return null;

    const conflict: ConflictRecord = {
      id: `conflict_identity_${symbol}_${stableHash(name1 + name2)}`,
      symbol: symbol.toUpperCase(),
      category: 'identity_mismatch',
      field: 'companyName',
      leftValue: name1,
      rightValue: name2,
      leftSource: source1,
      rightSource: source2,
      severity: 'warning',
      description: `Company name mismatch for ${symbol}: "${name1}" vs "${name2}"`,
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null,
    };

    this.conflicts.push(conflict);
    return conflict;
  }

  /**
   * Detect sector mismatch
   */
  detectSectorMismatch(
    symbol: string,
    sector1: string,
    sector2: string,
    source1: string,
    source2: string
  ): ConflictRecord | null {
    if (!sector1 || !sector2) return null;
    if (sector1.toLowerCase() === sector2.toLowerCase()) return null;

    const conflict: ConflictRecord = {
      id: `conflict_sector_${symbol}_${stableHash(sector1 + sector2)}`,
      symbol: symbol.toUpperCase(),
      category: 'sector_mismatch',
      field: 'sector',
      leftValue: sector1,
      rightValue: sector2,
      leftSource: source1,
      rightSource: source2,
      severity: 'info',
      description: `Sector classification mismatch for ${symbol}: "${sector1}" vs "${sector2}"`,
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null,
    };

    this.conflicts.push(conflict);
    return conflict;
  }

  /**
   * Detect financial value mismatch
   */
  detectFinancialValueMismatch(
    symbol: string,
    field: string,
    value1: number | null,
    value2: number | null,
    source1: string,
    source2: string,
    tolerancePct: number = 5
  ): ConflictRecord | null {
    if (value1 === null || value2 === null) return null;

    const diffPct = Math.abs((value1 - value2) / Math.max(Math.abs(value1), Math.abs(value2), 1)) * 100;
    if (diffPct <= tolerancePct) return null;

    const severity: ConflictSeverity = diffPct > 25 ? 'error' : 'warning';

    const conflict: ConflictRecord = {
      id: `conflict_fin_${symbol}_${field}_${stableHash(value1.toString() + value2.toString())}`,
      symbol: symbol.toUpperCase(),
      category: 'financial_value_mismatch',
      field,
      leftValue: value1.toString(),
      rightValue: value2.toString(),
      leftSource: source1,
      rightSource: source2,
      severity,
      description: `${field} mismatch for ${symbol}: ${value1} vs ${value2} (${diffPct.toFixed(1)}% difference)`,
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null,
    };

    this.conflicts.push(conflict);
    return conflict;
  }

  /**
   * Detect duplicate document by checksum
   */
  detectDocumentDuplicate(
    symbol: string,
    checksum1: string,
    checksum2: string,
    docTitle1: string,
    docTitle2: string
  ): ConflictRecord | null {
    if (checksum1 !== checksum2) return null;

    const conflict: ConflictRecord = {
      id: `conflict_docdup_${symbol}_${checksum1}`,
      symbol: symbol.toUpperCase(),
      category: 'document_duplicate',
      field: 'checksum',
      leftValue: docTitle1,
      rightValue: docTitle2,
      leftSource: 'document_store',
      rightSource: 'document_store',
      severity: 'info',
      description: `Duplicate document detected: "${docTitle1}" and "${docTitle2}" have the same checksum`,
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null,
    };

    this.conflicts.push(conflict);
    return conflict;
  }

  /**
   * Detect stale vs newer value
   */
  detectStaleValue(
    symbol: string,
    field: string,
    oldValue: string | null,
    newValue: string | null,
    oldDate: string | null,
    newDate: string | null,
    source: string
  ): ConflictRecord | null {
    if (!oldDate || !newDate || oldValue === newValue) return null;
    if (newDate <= oldDate) return null;

    const conflict: ConflictRecord = {
      id: `conflict_stale_${symbol}_${field}_${stableHash((oldValue ?? '') + (newValue ?? ''))}`,
      symbol: symbol.toUpperCase(),
      category: 'stale_value',
      field,
      leftValue: oldValue,
      rightValue: newValue,
      leftSource: source,
      rightSource: source,
      severity: 'info',
      description: `Stale value replaced for ${symbol}.${field}: "${oldValue}" → "${newValue}"`,
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null,
    };

    this.conflicts.push(conflict);
    return conflict;
  }

  /**
   * Get all detected conflicts
   */
  getAllConflicts(): ConflictRecord[] {
    return [...this.conflicts];
  }

  /**
   * Clear all conflicts
   */
  reset(): void {
    this.conflicts = [];
  }
}

export const conflictDetector = new ConflictDetector();
