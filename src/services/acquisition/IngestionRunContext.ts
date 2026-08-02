import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';

export interface IngestionRunContext {
  runId: string;
  source?: string;
}

const storage = new AsyncLocalStorage<IngestionRunContext>();

export function createIngestionRunId(prefix = 'ingestion'): string {
  return `${prefix}-${new Date().toISOString()}-${crypto.randomUUID()}`;
}

export function getCurrentIngestionRunContext(): IngestionRunContext | undefined {
  return storage.getStore();
}

export function getCurrentIngestionRunId(): string | undefined {
  return storage.getStore()?.runId;
}

export async function runWithIngestionRunContext<T>(
  context: IngestionRunContext,
  work: () => Promise<T>,
): Promise<T> {
  return storage.run(context, work);
}
