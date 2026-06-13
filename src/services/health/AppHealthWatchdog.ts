import { dbAdapter } from '../../db/DatabaseAdapter';
import { pool } from '../../db';

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface HealthCheckResult {
  status: HealthStatus;
  db: { ok: boolean; latencyMs: number; detail?: string };
  providers: { ok: boolean; detail?: string };
  lastChecked: string;
  uptime: number;
}

interface WatchdogConfig {
  checkIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
  onStatusChange?: (prev: HealthStatus, curr: HealthStatus) => void;
}

export class AppHealthWatchdog {
  private config: WatchdogConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private _currentStatus: HealthStatus = 'healthy';
  private _lastCheck: HealthCheckResult | null = null;
  private _failures = 0;
  private readonly startTime = Date.now();

  constructor(config?: Partial<WatchdogConfig>) {
    this.config = {
      checkIntervalMs: config?.checkIntervalMs ?? 30000,
      maxRetries: config?.maxRetries ?? 2,
      retryDelayMs: config?.retryDelayMs ?? 1000,
      onStatusChange: config?.onStatusChange,
    };
  }

  get currentStatus(): HealthStatus {
    return this._currentStatus;
  }

  get lastCheck(): HealthCheckResult | null {
    return this._lastCheck;
  }

  start(): void {
    if (this.timer) return;
    this.runCheck();
    this.timer = setInterval(() => this.runCheck(), this.config.checkIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runCheck(): Promise<HealthCheckResult> {
    const prev = this._currentStatus;
    const result = await this.performCheck();
    this._lastCheck = result;
    this._currentStatus = result.status;

    if (result.status !== 'healthy') {
      this._failures++;
    } else {
      this._failures = 0;
    }

    if (prev !== result.status && this.config.onStatusChange) {
      this.config.onStatusChange(prev, result.status);
    }

    return result;
  }

  private async performCheck(): Promise<HealthCheckResult> {
    const dbStart = Date.now();
    let dbOk = false;
    let dbDetail: string | undefined;

    try {
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          const ping = await dbAdapter.ping();
          dbOk = ping.ok;
          dbDetail = ping.detail;
          if (dbOk) break;
        } catch (e) {
          dbDetail = e instanceof Error ? e.message : String(e);
        }
        if (attempt < this.config.maxRetries) {
          await new Promise(r => setTimeout(r, this.config.retryDelayMs * Math.pow(2, attempt)));
        }
      }
    } catch {
      dbOk = false;
    }
    const dbLatency = Date.now() - dbStart;

    const providerOk = await this.checkProviders();

    const allOk = dbOk && providerOk;
    const status: HealthStatus = allOk ? 'healthy' : dbOk ? 'degraded' : 'down';

    return {
      status,
      db: { ok: dbOk, latencyMs: dbLatency, detail: dbDetail },
      providers: { ok: providerOk },
      lastChecked: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  private async checkProviders(): Promise<boolean> {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export default AppHealthWatchdog;
