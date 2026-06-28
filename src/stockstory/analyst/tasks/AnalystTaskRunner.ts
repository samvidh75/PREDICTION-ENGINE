/**
 * AnalystTaskRunner — executes analyst tasks with safe failure handling.
 */

import type { AnalystTask, AnalystTaskStatus } from './AnalystTaskTypes';
import { analystTaskRegistry } from './AnalystTaskRegistry';
import type { AnalystTaskStore } from './AnalystTaskStore';
import { defaultAnalystTaskStore } from './AnalystTaskStore';
import { serializeAnalystOutput } from '../shared/AnalystPublicSerializer';

export type TaskHandler = (task: AnalystTask) => Promise<{
  status: AnalystTaskStatus;
  outputId?: string;
  failureReason?: string;
  output?: Record<string, unknown>;
}>;

export class AnalystTaskRunner {
  private handlers = new Map<string, TaskHandler>();

  constructor(private store: AnalystTaskStore = defaultAnalystTaskStore) {}

  registerHandler(taskType: string, handler: TaskHandler): void {
    this.handlers.set(taskType, handler);
  }

  async createAndRun(input: {
    taskType: string;
    symbol?: string;
    sector?: string;
    userId?: string;
    priority?: AnalystTask['priority'];
    input?: Record<string, unknown>;
  }): Promise<AnalystTask> {
    const validation = analystTaskRegistry.validateCreate(input);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }

    const task = await this.store.create({
      taskType: input.taskType as AnalystTask['taskType'],
      symbol: input.symbol?.toUpperCase(),
      sector: input.sector,
      userId: input.userId,
      priority: input.priority ?? 'medium',
      status: 'queued',
      input: input.input ?? {},
      outputId: null,
      failureReason: null,
    });

    return this.run(task.id);
  }

  async run(taskId: string): Promise<AnalystTask> {
    const task = await this.store.get(taskId);
    if (!task) throw new Error('Task not found');

    if (!analystTaskRegistry.validateTransition(task.status, 'running')) {
      return task;
    }

    await this.store.update(taskId, { status: 'running' });

    const handler = this.handlers.get(task.taskType);
    if (!handler) {
      return (await this.store.update(taskId, {
        status: 'failed_safely',
        failureReason: 'No handler registered for task type.',
        completedAt: new Date().toISOString(),
      }))!;
    }

    try {
      const result = await handler({ ...task, status: 'running' });
      const publicOutput = result.output ? serializeAnalystOutput(result.output) : undefined;
      void publicOutput;

      return (await this.store.update(taskId, {
        status: result.status,
        outputId: result.outputId ?? null,
        failureReason: result.failureReason ?? null,
        completedAt: new Date().toISOString(),
      }))!;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Task failed safely.';
      return (await this.store.update(taskId, {
        status: 'failed_safely',
        failureReason: message.slice(0, 200),
        completedAt: new Date().toISOString(),
      }))!;
    }
  }
}

export const defaultAnalystTaskRunner = new AnalystTaskRunner();
