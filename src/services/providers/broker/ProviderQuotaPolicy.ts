/**
 * F3.1A — ProviderQuotaPolicy
 *
 * Tracks and enforces per-provider rate limits with sliding windows for:
 *   - Per-minute
 *   - Per-day
 *   - Burst (short window)
 *   - Max concurrent calls
 *   - Cooldown after rate-limit signal
 */

import type { ProviderBudgetConfig, ProviderQuotaState, BudgetState } from './types';
import { errBudgetExhausted, errRateLimited } from './ProviderBrokerErrors';
import type { BrokerError } from './types';

/** Default budgets for known providers. */
export const DEFAULT_BUDGETS: Record<string, ProviderBudgetConfig> = {
  finnhub: { provider: 'finnhub', perMinute: 60, perDay: 500, burst: 10, maxConcurrent: 5, cooldownMs: 60_000 },
  indianapi: { provider: 'indianapi', perMinute: 120, perDay: 1000, burst: 15, maxConcurrent: 5, cooldownMs: 30_000 },
  upstox: { provider: 'upstox', perMinute: 30, perDay: 500, burst: 5, maxConcurrent: 3, cooldownMs: 60_000 },
  yahoo: { provider: 'yahoo', perMinute: 100, perDay: 2000, burst: 20, maxConcurrent: 10, cooldownMs: 30_000 },
};

const WINDOW_MINUTE = 60_000;
const WINDOW_DAY = 86_400_000;
const WINDOW_BURST = 10_000; // 10 seconds

export class ProviderQuotaPolicy {
  private state = new Map<string, ProviderQuotaState>();
  private budgets = new Map<string, ProviderBudgetConfig>();
  private runLevelMax = Infinity;
  private runLevelCount = 0;

  constructor(customBudgets?: Record<string, ProviderBudgetConfig>) {
    const allBudgets = { ...DEFAULT_BUDGETS, ...customBudgets };
    for (const [provider, config] of Object.entries(allBudgets)) {
      this.budgets.set(provider, config);
      this.state.set(provider, this.freshState(provider));
    }
  }

  /** Set an optional run-level maximum call count. */
  setRunLevelMax(max: number): void {
    this.runLevelMax = max;
  }

  /** Get remaining budget for a provider (for observability). */
  getBudgetState(provider: string): BudgetState {
    const q = this.state.get(provider);
    if (!q) return 'exhausted';
    if (q.totalCalls >= this.runLevelMax) return 'exhausted';
    if (q.minuteWindow.count >= (this.budgets.get(provider)?.perMinute ?? Infinity) * 0.9) return 'warning';
    return 'ok';
  }

  /** Check whether a call is allowed. Throws BrokerError if quota exhausted. */
  checkQuota(provider: string): void | never {
    const config = this.budgets.get(provider);
    if (!config) return; // No budget = no enforcement

    const q = this.ensureState(provider);
    const now = Date.now();

    // Run-level max
    if (this.runLevelCount >= this.runLevelMax) {
      throw errBudgetExhausted(provider);
    }

    // Cooldown
    if (now < q.cooldownUntil) {
      throw errRateLimited(q.cooldownUntil - now);
    }

    // Reset expired windows
    if (now > q.minuteWindow.resetAt) {
      q.minuteWindow = { count: 0, resetAt: now + WINDOW_MINUTE };
    }
    if (now > q.dayWindow.resetAt) {
      q.dayWindow = { count: 0, resetAt: now + WINDOW_DAY };
    }
    if (now > q.burstWindow.resetAt) {
      q.burstWindow = { count: 0, resetAt: now + WINDOW_BURST };
    }

    // Check burst
    if (q.burstWindow.count >= config.burst) {
      throw errRateLimited(WINDOW_BURST);
    }

    // Check per-minute
    if (q.minuteWindow.count >= config.perMinute) {
      throw errRateLimited(q.minuteWindow.resetAt - now);
    }

    // Check per-day
    if (q.dayWindow.count >= config.perDay) {
      throw errRateLimited(q.dayWindow.resetAt - now);
    }

    // Check concurrent
    if (q.concurrentCount >= config.maxConcurrent) {
      throw errRateLimited(5_000);
    }
  }

  /** Record that a call is starting. */
  recordCallStart(provider: string): void {
    const q = this.ensureState(provider);
    q.concurrentCount++;
  }

  /** Record that a call completed (success or failure). */
  recordCallEnd(provider: string, statusCode?: number, retryAfterMs?: number): void {
    const q = this.ensureState(provider);
    const now = Date.now();

    q.concurrentCount = Math.max(0, q.concurrentCount - 1);
    q.minuteWindow.count++;
    q.dayWindow.count++;
    q.burstWindow.count++;
    q.totalCalls++;
    this.runLevelCount++;

    // Apply cooldown on rate-limit signal
    if (statusCode === 429) {
      q.cooldownUntil = now + (retryAfterMs ?? 60_000);
    }
  }

  /** Get remaining quota for a provider. */
  getQuotaState(provider: string): ProviderQuotaState | null {
    return this.state.get(provider) ?? null;
  }

  /** Number of calls remaining in the run-level budget. */
  getRunLevelRemaining(): number {
    return Math.max(0, this.runLevelMax - this.runLevelCount);
  }

  /** Total calls made in this run. */
  getRunLevelCount(): number {
    return this.runLevelCount;
  }

  // ── Private ──

  private freshState(provider: string): ProviderQuotaState {
    const now = Date.now();
    return {
      provider,
      minuteWindow: { count: 0, resetAt: now + WINDOW_MINUTE },
      dayWindow: { count: 0, resetAt: now + WINDOW_DAY },
      burstWindow: { count: 0, resetAt: now + WINDOW_BURST },
      concurrentCount: 0,
      cooldownUntil: 0,
      totalCalls: 0,
    };
  }

  private ensureState(provider: string): ProviderQuotaState {
    let q = this.state.get(provider);
    if (!q) {
      q = this.freshState(provider);
      this.state.set(provider, q);
    }
    return q;
  }
}
