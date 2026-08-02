// src/services/providers/RetryPolicy.ts

/**
 * RetryPolicy provides a simple exponential backoff with jitter for async operations.
 * It can be used by provider implementations to retry transient failures such as
 * network time‑outs or 5xx responses.
 */
export interface RetryPolicyOptions {
  /** Maximum number of retry attempts */
  retries: number;
  /** Minimum delay in milliseconds before the first retry */
  minDelayMs: number;
  /** Maximum delay in milliseconds between retries */
  maxDelayMs: number;
}

export class RetryPolicy {
  /**
   * Execute an async function with retry logic.
   * @param fn The async operation to execute.
   * @param opts Configuration for retry behavior.
   * @returns The resolved value of the async function if successful.
   * @throws The error from the final failed attempt.
   */
  static async execute<T>(fn: () => Promise<T>, opts: RetryPolicyOptions): Promise<T> {
    let attempt = 0;
    const { retries, minDelayMs, maxDelayMs } = opts;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt > retries) {
          throw err;
        }
        // Exponential backoff: delay = minDelay * 2^(attempt-1)
        const exponential = minDelayMs * Math.pow(2, attempt - 1);
        const delay = Math.min(exponential, maxDelayMs);
        // Add full jitter: random value between 0 and delay
        const jitter = (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * delay;
        await new Promise(res => setTimeout(res, jitter));
      }
    }
  }
}

export default RetryPolicy;
