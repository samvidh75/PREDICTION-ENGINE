import type { PopulationStage } from './CheckpointManager';

export interface FailureQueueItem {
  id?: number;
  runId: string;
  stage: PopulationStage;
  symbol: string;
  errorMessage: string;
  attempts: number;
  nextRetryAt: string;
  lastAttemptAt?: string | null;
  resolvedAt?: string | null;
}

export interface FailureQueueRepository {
  enqueue(item: FailureQueueItem): Promise<void>;
  listDue(limit?: number): Promise<FailureQueueItem[]>;
  markAttempt(id: number, attempts: number, nextRetryAt: string, errorMessage: string): Promise<void>;
  markResolved(id: number): Promise<void>;
}

export class FailureQueue {
  constructor(private readonly repository: FailureQueueRepository) {}

  async enqueue(runId: string, stage: PopulationStage, symbol: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await this.repository.enqueue({ runId, stage, symbol, errorMessage, attempts: 0, nextRetryAt: new Date().toISOString() });
  }

  async listDue(limit = 100): Promise<FailureQueueItem[]> {
    return this.repository.listDue(limit);
  }

  async recordFailure(item: FailureQueueItem, error: unknown): Promise<void> {
    if (item.id == null) throw new Error('Failure queue item id is required');
    const attempts = item.attempts + 1;
    const delayMs = Math.min(86_400_000, Math.pow(2, attempts) * 60_000);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await this.repository.markAttempt(item.id, attempts, new Date(Date.now() + delayMs).toISOString(), errorMessage);
  }

  async resolve(item: FailureQueueItem): Promise<void> {
    if (item.id == null) throw new Error('Failure queue item id is required');
    await this.repository.markResolved(item.id);
  }
}

export default FailureQueue;
