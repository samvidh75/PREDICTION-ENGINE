/**
 * AnalystTaskStore — in-memory task persistence adapter.
 * Documented limitation: no durable DB persistence in default adapter.
 */

import type { AnalystTask, AnalystTaskStatus } from './AnalystTaskTypes';
import { stableHash } from '../../utils/hash';

export interface AnalystTaskStore {
  create(task: Omit<AnalystTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnalystTask>;
  get(id: string): Promise<AnalystTask | null>;
  update(id: string, patch: Partial<AnalystTask>): Promise<AnalystTask | null>;
  list(filter?: { status?: AnalystTaskStatus; symbol?: string; taskType?: string }): Promise<AnalystTask[]>;
}

export class InMemoryAnalystTaskStore implements AnalystTaskStore {
  private tasks = new Map<string, AnalystTask>();

  async create(task: Omit<AnalystTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnalystTask> {
    const now = new Date().toISOString();
    const id = `task_${stableHash(`${task.taskType}_${now}_${Math.random()}`)}`;
    const record: AnalystTask = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, record);
    return record;
  }

  async get(id: string): Promise<AnalystTask | null> {
    return this.tasks.get(id) ?? null;
  }

  async update(id: string, patch: Partial<AnalystTask>): Promise<AnalystTask | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated: AnalystTask = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async list(filter?: { status?: AnalystTaskStatus; symbol?: string; taskType?: string }): Promise<AnalystTask[]> {
    let items = [...this.tasks.values()];
    if (filter?.status) items = items.filter((t) => t.status === filter.status);
    if (filter?.symbol) items = items.filter((t) => t.symbol === filter.symbol?.toUpperCase());
    if (filter?.taskType) items = items.filter((t) => t.taskType === filter.taskType);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  clear(): void {
    this.tasks.clear();
  }
}

export const defaultAnalystTaskStore = new InMemoryAnalystTaskStore();
