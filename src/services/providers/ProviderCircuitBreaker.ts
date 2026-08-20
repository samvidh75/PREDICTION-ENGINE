// src/services/providers/ProviderCircuitBreaker.ts

/**
 * Simple circuit breaker implementation for provider reliability.
 * States:
 *   - CLOSED: normal operation.
 *   - OPEN: calls are blocked, immediately fail.
 *   - HALF_OPEN: test a single request to see if provider recovered.
 *
 * The breaker opens after `failureThreshold` consecutive failures.
 * It stays open for `openTimeoutMs` before moving to HALF_OPEN.
 * If a request in HALF_OPEN succeeds, the breaker resets to CLOSED.
 */
export enum CircuitState {
  CLOSED = 'Closed',
  OPEN = 'Open',
  HALF_OPEN = 'HalfOpen',
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to stay open before trying half‑open */
  openTimeoutMs: number;
}

/**
 * Thrown when the circuit is open and `execute()` refuses to even attempt the
 * call. Distinct from a real provider error so callers (ProviderCoordinator)
 * can tell "the provider failed" from "we didn't try the provider" — treating
 * the latter as a real failure double-counts a single outage: three genuine
 * errors open the circuit, and every fast-fail during the 30s-60s open window
 * was then also recorded against ProviderHealthMonitor, which pushed it past
 * its own unavailable threshold from just a handful of real failures.
 */
export class CircuitOpenError extends Error {
  readonly circuitOpen = true;
  constructor() {
    super('CircuitBreaker: Open');
    this.name = 'CircuitOpenError';
  }
}

export class ProviderCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private nextAttempt: number = 0; // epoch ms when half‑open allowed

  constructor(private readonly options: CircuitBreakerOptions) {}

  /**
   * Checks if a call is allowed. Throws if circuit is OPEN.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (this.state === CircuitState.OPEN && now < this.nextAttempt) {
      throw new CircuitOpenError();
    }
    if (this.state === CircuitState.OPEN && now >= this.nextAttempt) {
      this.state = CircuitState.HALF_OPEN;
    }
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private recordSuccess() {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private recordFailure() {
    this.failureCount += 1;
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.openTimeoutMs;
    }
  }

  // Expose current state for monitoring / audit
  getState(): CircuitState {
    return this.state;
  }
}

export default ProviderCircuitBreaker;
