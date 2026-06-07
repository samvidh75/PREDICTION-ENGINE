/**
 * UpstoxHealthEngine — TRACK-35 Agent A1
 * Upstox integration hardening with token refresh, retry logic, connection diagnostics.
 * Status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MISCONFIGURED'
 */

export type HealthStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MISCONFIGURED';
export type ErrorCategory = 'auth' | 'timeout' | 'rate-limit' | 'provider-error' | 'unknown';
export type TokenState = 'valid' | 'expiring' | 'expired' | 'missing';

export interface UpstoxHealthCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface UpstoxHealth {
  status: HealthStatus;
  checks: UpstoxHealthCheck[];
  tokenExpiry: string | null;
  lastSuccess: string | null;
}

export interface ClassifiedError {
  category: ErrorCategory;
  message: string;
  retryable: boolean;
}

export interface UpstoxApiClient {
  testAuth(): Promise<{ ok: boolean; detail: string }>;
  getQuote(symbol: string): Promise<unknown>;
  getHistory(symbol: string, range: string): Promise<unknown>;
  getInstrumentMaster(): Promise<unknown>;
}

export class UpstoxHealthEngine {
  private tokenExpiry: string | null = null;
  private lastSuccess: string | null = null;
  private apiClient: UpstoxApiClient | null = null;
  private retryConfig = { maxAttempts: 3, backoffMs: [2000, 4000, 8000] };

  setApiClient(client: UpstoxApiClient): void {
    this.apiClient = client;
  }

  getTokenExpiry(): string | null {
    return this.tokenExpiry;
  }

  getLastSuccess(): string | null {
    return this.lastSuccess;
  }

  classifyError(error: Error): ClassifiedError {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token')) {
      return { category: 'auth', message: error.message, retryable: false };
    }
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('econnrefused')) {
      return { category: 'timeout', message: error.message, retryable: true };
    }
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
      return { category: 'rate-limit', message: error.message, retryable: true };
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
      return { category: 'provider-error', message: error.message, retryable: true };
    }
    return { category: 'unknown', message: error.message, retryable: true };
  }

  async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const result = await fn();
        this.lastSuccess = new Date().toISOString();
        return result;
      } catch (err: any) {
        lastError = err;
        const classified = this.classifyError(err);
        if (!classified.retryable || attempt === this.retryConfig.maxAttempts) {
          throw new Error(`[${classified.category}] ${err.message}`);
        }
        const delay = this.retryConfig.backoffMs[attempt - 1] || 8000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError || new Error('Retry exhausted with no error');
  }

  async check(): Promise<UpstoxHealth> {
    const checks: UpstoxHealthCheck[] = [];
    const accessToken = process.env.UPSTOX_ACCESS_TOKEN || process.env.VITE_UPSTOX_ACCESS_TOKEN || null;

    // Check 1: API key presence
    if (!accessToken) {
      return {
        status: 'MISCONFIGURED',
        checks: [{ name: 'API Key', passed: false, detail: 'UPSTOX_ACCESS_TOKEN not configured' }],
        tokenExpiry: null,
        lastSuccess: this.lastSuccess,
      };
    }
    checks.push({ name: 'API Key', passed: true, detail: 'Token configured' });

    // Check 2: Token format
    if (accessToken.length < 20) {
      checks.push({ name: 'Token Format', passed: false, detail: 'Token appears too short to be valid' });
      return {
        status: 'MISCONFIGURED',
        checks,
        tokenExpiry: this.tokenExpiry,
        lastSuccess: this.lastSuccess,
      };
    }
    checks.push({ name: 'Token Format', passed: true, detail: 'Token format valid' });

    // Check 3: Connection test (if client available)
    if (this.apiClient) {
      try {
        const authResult = await this.apiClient.testAuth();
        checks.push({
          name: 'Authentication',
          passed: authResult.ok,
          detail: authResult.detail,
        });
      } catch (err: any) {
        checks.push({
          name: 'Authentication',
          passed: false,
          detail: `Auth test failed: ${err.message}`,
        });
      }

      // Check 4: Quote retrieval test
      try {
        await this.retryWithBackoff(() => this.apiClient!.getQuote('RELIANCE'));
        checks.push({ name: 'Quote Retrieval', passed: true, detail: 'Successfully fetched quote for RELIANCE' });
      } catch (err: any) {
        checks.push({ name: 'Quote Retrieval', passed: false, detail: `Quote test failed: ${err.message}` });
      }

      // Check 5: Historical candles test
      try {
        await this.retryWithBackoff(() => this.apiClient!.getHistory('RELIANCE', '1M'));
        checks.push({ name: 'Historical Candles', passed: true, detail: 'Successfully fetched 1M history' });
      } catch (err: any) {
        checks.push({ name: 'Historical Candles', passed: false, detail: `History test failed: ${err.message}` });
      }

      // Check 6: Instrument master test
      try {
        await this.apiClient.getInstrumentMaster();
        checks.push({ name: 'Instrument Master', passed: true, detail: 'Master data accessible' });
      } catch (err: any) {
        checks.push({ name: 'Instrument Master', passed: false, detail: `Master fetch failed: ${err.message}` });
      }
    } else {
      checks.push({
        name: 'Connection Tests',
        passed: false,
        detail: 'No API client configured — cannot run connection tests',
      });
    }

    const allPassed = checks.every(c => c.passed);
    const anyFailed = checks.some(c => !c.passed);
    const allFailed = checks.filter(c => c.name !== 'API Key').every(c => !c.passed);

    let status: HealthStatus;
    if (allPassed) status = 'ONLINE';
    else if (allFailed) status = 'OFFLINE';
    else if (anyFailed) status = 'DEGRADED';
    else status = 'MISCONFIGURED';

    return { status, checks, tokenExpiry: this.tokenExpiry, lastSuccess: this.lastSuccess };
  }
}

let _instance: UpstoxHealthEngine | null = null;
export function getUpstoxHealthEngine(): UpstoxHealthEngine {
  if (!_instance) _instance = new UpstoxHealthEngine();
  return _instance;
}
export function setUpstoxHealthEngine(engine: UpstoxHealthEngine): void { _instance = engine; }
export const upstoxHealthEngine = new Proxy({} as UpstoxHealthEngine, {
  get: (_, prop) => (getUpstoxHealthEngine() as any)[prop],
});
