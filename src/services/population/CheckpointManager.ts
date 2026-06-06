export type PopulationStage = 'registry' | 'financials' | 'statements' | 'derivedMetrics' | 'features' | 'factors' | 'rankings' | 'cache' | 'telemetry';
export type CheckpointStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface CheckpointRecord {
  runId: string;
  stage: PopulationStage;
  symbol?: string;
  status: CheckpointStatus;
  details?: Record<string, unknown>;
  updatedAt: string;
}

export interface CheckpointRepository {
  upsert(record: CheckpointRecord): Promise<void>;
  list(runId: string): Promise<CheckpointRecord[]>;
}

export class CheckpointManager {
  constructor(private readonly repository: CheckpointRepository) {}

  async mark(runId: string, stage: PopulationStage, status: CheckpointStatus, symbol?: string, details: Record<string, unknown> = {}): Promise<void> {
    await this.repository.upsert({ runId, stage, symbol, status, details, updatedAt: new Date().toISOString() });
  }

  async getRunState(runId: string): Promise<CheckpointRecord[]> {
    return this.repository.list(runId);
  }
}

export default CheckpointManager;
