import type { BrokerResult } from './types';

export type InFlightRegistration<T> = {
  promise: Promise<BrokerResult<T>>;
  isLeader: boolean;
};

export type CacheLookup<T> = {
  data: T;
  staleAt: number;
};

export type QuotaWindow = 'minute' | 'day' | 'burst';

export interface ProviderBrokerStore {
  getFresh<T>(key: string): CacheLookup<T> | null;
  getStale<T>(key: string): CacheLookup<T> | null;
  setFresh<T>(key: string, data: T, ttlMs: number, staleWindowMs: number): void;

  isNegativelyCached(key: string): boolean;
  setNegative(key: string, ttlMs: number): void;

  getOrCreateInFlight<T>(key: string, factory: () => Promise<BrokerResult<T>>): InFlightRegistration<T>;
  getInFlightConsumerCount(key: string): number;

  getCooldown(provider: string): Promise<number | null>;
  setCooldown(provider: string, retryAfterMs: number): Promise<void>;

  incrementQuotaCounter(provider: string, window: QuotaWindow, ttlSeconds: number): Promise<number>;
  readQuotaCounter(provider: string, window: QuotaWindow): Promise<number>;

  incrementRunBudget(runId: string, ttlSeconds: number): Promise<number>;
  readRunBudget(runId: string): Promise<number>;

  acquireConcurrencySlot(provider: string, maxConcurrent: number, ttlMs: number): Promise<boolean>;
  releaseConcurrencySlot(provider: string): Promise<void>;

  acquireDistributedLock(lockName: string, owner: string, ttlMs: number): Promise<boolean>;
  releaseDistributedLock(lockName: string, owner: string): Promise<boolean>;

  resetForTests(): Promise<void> | void;
}
