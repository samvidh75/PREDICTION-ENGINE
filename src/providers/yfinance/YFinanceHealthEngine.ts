/**
 * YFinanceHealthEngine.ts
 * Monitors yfinance provider health — tracks success/failure rates,
 * consecutive failures, rate limit detection, and exposes a health report.
 */

// ---------------------------------------------------------------------------
// Health report types
// ---------------------------------------------------------------------------

export type HealthStatus = 'Healthy' | 'Degraded' | 'Unavailable';

export interface HealthReport {
  status: HealthStatus;
  uptimePercent: number;
  successRate: number;
  consecutiveFailures: number;
  rateLimited: boolean;
  lastSuccess: string | null;
  lastFailure: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max consecutive failures before marking Degraded */
const DEGRADED_THRESHOLD = 3;

/** Max consecutive failures before marking Unavailable */
const UNAVAILABLE_THRESHOLD = 5;

/** Window in ms for rate-limit detection (60 seconds) */
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Keywords that suggest a rate-limit error from Yahoo Finance / network */
const RATE_LIMIT_KEYWORDS = [
  'rate limit',
  'rate-limited',
  'too many requests',
  '429',
  'throttle',
  'throttled',
  'slow down',
  'try again later',
];

// ---------------------------------------------------------------------------
// YFinanceHealthEngine
// ---------------------------------------------------------------------------

export class YFinanceHealthEngine {
  private successCount = 0;
  private failureCount = 0;
  private lastSuccessTime: number | null = null;
  private lastFailureTime: number | null = null;
  private consecutiveFailures = 0;
  private rateLimitHits = 0;
  private lastRateLimitTime: number | null = null;

  /**
   * Record a successful request.
   * Resets consecutive failure counter.
   */
  recordSuccess(): void {
    this.successCount++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();
  }

  /**
   * Record a failed request.
   * Increments failure count, updates consecutive failures,
   * and automatically detects rate-limit errors from the error string.
   */
  recordFailure(error: string): void {
    this.failureCount++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    // Detect rate-limit hits from error message
    if (this.detectRateLimit(error)) {
      this.rateLimitHits++;
      this.lastRateLimitTime = Date.now();
    }
  }

  /**
   * Check whether the provider is currently healthy.
   * Healthy = consecutive failures < UNAVAILABLE_THRESHOLD
   *           AND no rate limit detected within the last 60 seconds.
   */
  isHealthy(): boolean {
    // Check rate-limit recency
    if (this.lastRateLimitTime !== null) {
      const elapsed = Date.now() - this.lastRateLimitTime;
      if (elapsed < RATE_LIMIT_WINDOW_MS) {
        return false;
      }
    }

    // Check consecutive failures
    if (this.consecutiveFailures >= UNAVAILABLE_THRESHOLD) {
      return false;
    }

    return true;
  }

  /**
   * Generate a full health report with status, uptime %, success rate, etc.
   */
  getHealthReport(): HealthReport {
    const total = this.successCount + this.failureCount;
    const successRate = total > 0 ? this.successCount / total : 1;
    const uptimePercent = total > 0 ? this.successCount / total * 100 : 100;

    // Determine rate-limited status
    let rateLimited = false;
    if (this.lastRateLimitTime !== null) {
      const elapsed = Date.now() - this.lastRateLimitTime;
      rateLimited = elapsed < RATE_LIMIT_WINDOW_MS;
    }

    // Determine status
    let status: HealthStatus;
    if (rateLimited || this.consecutiveFailures >= UNAVAILABLE_THRESHOLD) {
      status = 'Unavailable';
    } else if (this.consecutiveFailures >= DEGRADED_THRESHOLD) {
      status = 'Degraded';
    } else {
      status = 'Healthy';
    }

    return {
      status,
      uptimePercent: Math.round(uptimePercent * 100) / 100,
      successRate: Math.round(successRate * 10000) / 10000,
      consecutiveFailures: this.consecutiveFailures,
      rateLimited,
      lastSuccess: this.lastSuccessTime ? new Date(this.lastSuccessTime).toISOString() : null,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }

  /**
   * Return the current consecutive failure count.
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Check an error message for rate-limit indicators.
   */
  private detectRateLimit(error: string): boolean {
    if (!error) return false;
    const lower = error.toLowerCase();
    return RATE_LIMIT_KEYWORDS.some((keyword) => lower.includes(keyword));
  }
}