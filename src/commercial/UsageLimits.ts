/**
 * commercial/UsageLimits — Fair-use usage tracking and enforcement.
 *
 * Tracks per-user usage of rate-limited resources (search, API calls, etc.)
 * and checks against plan limits.  Storage is in-memory by default;
 * swap to Redis for multi-instance deployments.
 *
 * This is NOT a hard paywall — it prevents abuse / fair-use violations.
 */

import { EntitlementService } from "./EntitlementService";
import type { ResolvedEntitlements } from "./entitlementTypes";

// ─── Types ──────────────────────────────────────────────────────────

export type UsageMetric =
  | "api_calls_per_hour"
  | "searches_per_day"
  | "stock_views_per_day"
  | "export_actions_per_day"
  ;

interface UsageRecord {
  count: number;
  windowStart: number; // epoch ms
}

interface UsageConfig {
  /** Max allowed in the window */
  limit: number;
  /** Window duration in ms */
  windowMs: number;
}

// ─── Default Limits (per tier) ──────────────────────────────────────

const METRIC_CONFIGS: Record<UsageMetric, Record<string, UsageConfig>> = {
  api_calls_per_hour: {
    free: { limit: 30, windowMs: 3600_000 },
    plus: { limit: 120, windowMs: 3600_000 },
    pro: { limit: 600, windowMs: 3600_000 },
  },
  searches_per_day: {
    free: { limit: 10, windowMs: 86_400_000 },
    plus: { limit: 100, windowMs: 86_400_000 },
    pro: { limit: 500, windowMs: 86_400_000 },
  },
  stock_views_per_day: {
    free: { limit: 50, windowMs: 86_400_000 },
    plus: { limit: 300, windowMs: 86_400_000 },
    pro: { limit: 2000, windowMs: 86_400_000 },
  },
  export_actions_per_day: {
    free: { limit: 0, windowMs: 86_400_000 },
    plus: { limit: 5, windowMs: 86_400_000 },
    pro: { limit: 50, windowMs: 86_400_000 },
  },
};

// ─── Service ────────────────────────────────────────────────────────

export class UsageLimits {
  private store = new Map<string, Map<UsageMetric, UsageRecord>>();
  private svc = new EntitlementService();

  /**
   * Check and record a usage event.
   * @returns true if within limits, false if exceeded.
   */
  checkAndIncrement(
    userId: string,
    metric: UsageMetric,
    entitlements: ResolvedEntitlements | null,
  ): boolean {
    const tier = (entitlements ?? this.svc.resolve(null)).tier;
    const config = METRIC_CONFIGS[metric][tier];
    if (!config) return false;

    const now = Date.now();
    const userMetrics = this.getOrCreateUserMetrics(userId);
    const record = userMetrics.get(metric);

    // Reset if window expired
    if (!record || now - record.windowStart > config.windowMs) {
      userMetrics.set(metric, { count: 1, windowStart: now });
      return true;
    }

    if (record.count >= config.limit) {
      return false; // limit exceeded
    }

    record.count += 1;
    return true;
  }

  /**
   * Read-only check without recording.
   */
  peek(
    userId: string,
    metric: UsageMetric,
    entitlements: ResolvedEntitlements | null,
  ): { allowed: number; used: number; resetAt: number } {
    const tier = (entitlements ?? this.svc.resolve(null)).tier;
    const config = METRIC_CONFIGS[metric][tier];
    const userMetrics = this.store.get(userId);
    const record = userMetrics?.get(metric);
    const now = Date.now();

    const used = record && now - record.windowStart <= config.windowMs ? record.count : 0;
    return {
      allowed: config.limit,
      used,
      resetAt: record ? record.windowStart + config.windowMs : now + config.windowMs,
    };
  }

  /**
   * Reset all usage for a user (called on subscription change).
   */
  reset(userId: string): void {
    this.store.delete(userId);
  }

  private getOrCreateUserMetrics(userId: string): Map<UsageMetric, UsageRecord> {
    let m = this.store.get(userId);
    if (!m) {
      m = new Map();
      this.store.set(userId, m);
    }
    return m;
  }
}

export const usageLimits = new UsageLimits();
