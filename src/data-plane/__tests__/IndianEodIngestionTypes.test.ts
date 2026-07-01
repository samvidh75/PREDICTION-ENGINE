import { describe, it, expect } from 'vitest';
import type { EodIngestionBatch, EodIngestionResult, IngestionTaskRecord, EodIngestionSourceKind } from '../ingestion/IndianEodIngestionTypes';

describe('EodIngestionBatch type', () => {
  it('can create a valid batch object', () => {
    const batch: EodIngestionBatch = {
      batchId: 'batch-001',
      source: 'nse_feed',
      ingestedAt: Date.now(),
      totalCandles: 100,
      acceptedCandles: 95,
      rejectedCandles: 5,
      results: [],
    };
    expect(batch.batchId).toBe('batch-001');
    expect(batch.acceptedCandles + batch.rejectedCandles).toBe(batch.totalCandles);
  });

  it('supports all source kinds', () => {
    const sources: EodIngestionSourceKind[] = ['nse_feed', 'bse_feed', 'file_import', 'manual_entry'];
    expect(sources).toHaveLength(4);
  });
});

describe('EodIngestionResult type', () => {
  it('can create a valid result object with accepted', () => {
    const result: EodIngestionResult = {
      symbol: 'RELIANCE',
      date: '2026-06-17',
      accepted: true,
      qualityScore: 100,
      issues: [],
    };
    expect(result.accepted).toBe(true);
  });

  it('can create a rejected result with issues', () => {
    const result: EodIngestionResult = {
      symbol: 'UNKNOWN',
      date: '2026-06-17',
      accepted: false,
      qualityScore: 0,
      issues: ['Negative close price'],
    };
    expect(result.accepted).toBe(false);
    expect(result.issues).toHaveLength(1);
  });
});

describe('IngestionTaskRecord type', () => {
  it('can create a pending task', () => {
    const task: IngestionTaskRecord = {
      taskId: 'task-001',
      source: 'nse_feed',
      symbols: ['RELIANCE', 'TCS'],
      date: '2026-06-17',
      status: 'pending',
      createdAt: Date.now(),
    };
    expect(task.status).toBe('pending');
  });

  it('can create a completed task with stats', () => {
    const task: IngestionTaskRecord = {
      taskId: 'task-001',
      source: 'nse_feed',
      symbols: ['RELIANCE', 'TCS'],
      date: '2026-06-16',
      status: 'completed',
      createdAt: Date.now() - 5000,
      completedAt: Date.now(),
      batchId: 'batch-001',
      acceptedCount: 2,
      rejectedCount: 0,
    };
    expect(task.status).toBe('completed');
    expect(task.acceptedCount).toBe(2);
    expect(task.completedAt).toBeGreaterThanOrEqual(task.createdAt);
  });

  it('can create a failed task', () => {
    const task: IngestionTaskRecord = {
      taskId: 'task-002',
      source: 'file_import',
      symbols: ['ALL'],
      date: '2026-06-16',
      status: 'failed',
      error: 'Connection timeout to exchange feed',
      createdAt: Date.now() - 5000,
    };
    expect(task.status).toBe('failed');
  });
});
