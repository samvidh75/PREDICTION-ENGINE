/**
 * Freshness Tracker
 *
 * Tracks last-updated timestamps for all data types.
 * Determines staleness based on expected update frequency.
 * Used by quality pipeline and ingestion monitoring.
 */

import type { FreshnessCheck } from './QualityTypes';

export type UpdateFrequency = FreshnessCheck['expectedFrequency'];

export interface FreshnessRecord {
  dataType: string;
  identifier: string;
  lastUpdated: string;
  sourceId: string;
}

export class FreshnessTracker {
  private records: Map<string, FreshnessRecord> = new Map();

  private frequencyDays: Record<UpdateFrequency, number> = {
    realtime: 0.042, // 1 hour
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    annual: 365,
  };

  update(dataType: string, identifier: string, sourceId: string, timestamp?: string): void {
    const key = `${dataType}:${identifier}`;
    this.records.set(key, {
      dataType,
      identifier,
      lastUpdated: timestamp ?? new Date().toISOString(),
      sourceId,
    });
  }

  check(dataType: string, identifier: string, frequency: UpdateFrequency): FreshnessCheck {
    const key = `${dataType}:${identifier}`;
    const record = this.records.get(key);
    const maxAge = this.frequencyDays[frequency] ?? 7;

    if (!record) {
      return {
        dataType,
        identifier,
        lastUpdated: null,
        expectedFrequency: frequency,
        isStale: true,
        daysStale: Infinity,
        maxAcceptableAgeDays: maxAge,
      };
    }

    const ageMs = Date.now() - new Date(record.lastUpdated).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    return {
      dataType,
      identifier,
      lastUpdated: record.lastUpdated,
      expectedFrequency: frequency,
      isStale: ageDays > maxAge,
      daysStale: Math.round(ageDays * 10) / 10,
      maxAcceptableAgeDays: maxAge,
    };
  }

  getAllStale(frequency?: UpdateFrequency): FreshnessCheck[] {
    const stale: FreshnessCheck[] = [];
    for (const [key, record] of this.records) {
      const [dataType] = key.split(':');
      const freq: UpdateFrequency = frequency ?? 'daily';
      const check = this.check(dataType, record.identifier, freq);
      if (check.isStale) stale.push(check);
    }
    return stale;
  }

  getRecordsByType(dataType: string): FreshnessRecord[] {
    return Array.from(this.records.values()).filter(r => r.dataType === dataType);
  }

  getStats(): {
    totalRecords: number;
    staleCount: number;
    byType: Record<string, number>;
    oldestRecord: FreshnessRecord | null;
  } {
    const byType: Record<string, number> = {};
    let staleCount = 0;
    let oldest: FreshnessRecord | null = null;

    for (const record of this.records.values()) {
      byType[record.dataType] = (byType[record.dataType] ?? 0) + 1;
      const check = this.check(record.dataType, record.identifier, 'daily');
      if (check.isStale) staleCount++;
      if (!oldest || record.lastUpdated < oldest.lastUpdated) {
        oldest = record;
      }
    }

    return {
      totalRecords: this.records.size,
      staleCount,
      byType,
      oldestRecord: oldest,
    };
  }
}

export const freshnessTracker = new FreshnessTracker();
