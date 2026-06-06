import type { FailureQueue } from './FailureQueue';
import type { PopulationStage } from './CheckpointManager';

export interface ReplayExecutor {
  execute(stage: PopulationStage, symbol: string): Promise<void>;
}

export class ReplayFailedSymbols {
  constructor(private readonly queue: FailureQueue, private readonly executor: ReplayExecutor) {}

  async run(limit = 100): Promise<{ replayed: number; resolved: number; failed: number }> {
    const items = await this.queue.listDue(limit);
    let resolved = 0;
    let failed = 0;
    for (const item of items) {
      try {
        await this.executor.execute(item.stage, item.symbol);
        await this.queue.resolve(item);
        resolved += 1;
      } catch (error) {
        await this.queue.recordFailure(item, error);
        failed += 1;
      }
    }
    return { replayed: items.length, resolved, failed };
  }
}

export default ReplayFailedSymbols;
