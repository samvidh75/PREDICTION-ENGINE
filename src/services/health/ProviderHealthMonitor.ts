/**
 * ProviderHealthMonitor: Tracks provider uptime, response times, and auto-deprioritizes slow/failing providers
 */

export type ProviderName = 'yfinance' | 'nselib' | 'jugasad' | 'screener';
export type ProviderStatus = 'healthy' | 'degraded' | 'down';

export interface ProviderHealthMetrics {
  provider: ProviderName;
  successCount: number;
  failCount: number;
  totalRequests: number;
  uptime: number; // percentage
  avgResponseTime: number; // ms
  lastUpdateTime: string; // ISO timestamp
  lastUpdateAt: number; // unix ms
  status: ProviderStatus;
  isDeprioritized: boolean;
}

interface HealthMetricsRecord {
  provider: ProviderName;
  successCount: number;
  failCount: number;
  responseTimes: number[];
  lastUpdateTime: string;
  lastUpdateAt: number;
}

const STORAGE_KEY = 'prediction-engine:provider-health';
const MAX_RESPONSE_TIMES = 100;
const UPTIME_THRESHOLD = 90; // % - below this = degraded
const RESPONSE_TIME_THRESHOLD = 5000; // ms - above this = degraded
const RESET_TIME = 24 * 60 * 60 * 1000; // 24 hours

class ProviderHealthMonitorClass {
  private metrics: Map<ProviderName, HealthMetricsRecord> = new Map();
  private deprioritizedProviders: Set<ProviderName> = new Set();
  private lastResetTime: number = Date.now();

  constructor() {
    this.initialize();
    setInterval(() => this.checkAndResetDaily(), 60000); // Check every minute
  }

  initialize() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const provider of ['yfinance', 'nselib', 'jugasad', 'screener'] as ProviderName[]) {
          if (data[provider]) {
            this.metrics.set(provider, data[provider]);
          } else {
            this.metrics.set(provider, this.createEmptyMetrics(provider));
          }
        }
        this.lastResetTime = data.lastResetTime || Date.now();
      } else {
        for (const provider of ['yfinance', 'nselib', 'jugasad', 'screener'] as ProviderName[]) {
          this.metrics.set(provider, this.createEmptyMetrics(provider));
        }
      }
    } catch (error) {
      console.error('[ProviderHealthMonitor] Failed to load health data:', error);
      this.resetAll();
    }
  }

  private createEmptyMetrics(provider: ProviderName): HealthMetricsRecord {
    return {
      provider,
      successCount: 0,
      failCount: 0,
      responseTimes: [],
      lastUpdateTime: new Date().toISOString(),
      lastUpdateAt: Date.now(),
    };
  }

  recordSuccess(provider: ProviderName, responseTimeMs: number) {
    const metrics = this.metrics.get(provider);
    if (metrics) {
      metrics.successCount++;
      metrics.responseTimes.push(responseTimeMs);
      if (metrics.responseTimes.length > MAX_RESPONSE_TIMES) {
        metrics.responseTimes.shift();
      }
      metrics.lastUpdateTime = new Date().toISOString();
      metrics.lastUpdateAt = Date.now();
      this.updateDeprioritization();
      this.persist();
    }
  }

  recordFailure(provider: ProviderName) {
    const metrics = this.metrics.get(provider);
    if (metrics) {
      metrics.failCount++;
      metrics.lastUpdateTime = new Date().toISOString();
      metrics.lastUpdateAt = Date.now();
      this.updateDeprioritization();
      this.persist();
    }
  }

  private updateDeprioritization() {
    this.deprioritizedProviders.clear();
    for (const [provider, metrics] of this.metrics) {
      const uptime = this.calculateUptime(metrics);
      const avgTime = this.calculateAvgResponseTime(metrics);

      if (uptime < UPTIME_THRESHOLD || avgTime > RESPONSE_TIME_THRESHOLD) {
        this.deprioritizedProviders.add(provider);
      }
    }
  }

  private calculateUptime(metrics: HealthMetricsRecord): number {
    const total = metrics.successCount + metrics.failCount;
    if (total === 0) return 100;
    return (metrics.successCount / total) * 100;
  }

  private calculateAvgResponseTime(metrics: HealthMetricsRecord): number {
    if (metrics.responseTimes.length === 0) return 0;
    const sum = metrics.responseTimes.reduce((a, b) => a + b, 0);
    return sum / metrics.responseTimes.length;
  }

  getMetrics(provider: ProviderName): ProviderHealthMetrics {
    const record = this.metrics.get(provider);
    if (!record) return this.createDefaultMetrics(provider);

    const uptime = this.calculateUptime(record);
    const avgResponseTime = this.calculateAvgResponseTime(record);
    const status = this.getStatus(uptime, avgResponseTime);
    const isDeprioritized = this.deprioritizedProviders.has(provider);

    return {
      provider,
      successCount: record.successCount,
      failCount: record.failCount,
      totalRequests: record.successCount + record.failCount,
      uptime: Math.round(uptime * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      lastUpdateTime: record.lastUpdateTime,
      lastUpdateAt: record.lastUpdateAt,
      status,
      isDeprioritized,
    };
  }

  getAllMetrics(): ProviderHealthMetrics[] {
    return ['yfinance', 'nselib', 'screener'].map(p => this.getMetrics(p as ProviderName));
  }

  isDeprioritized(provider: ProviderName): boolean {
    return this.deprioritizedProviders.has(provider);
  }

  getHealthyProviders(): ProviderName[] {
    return ['yfinance', 'nselib', 'jugasad', 'screener'].filter(
      p => !this.isDeprioritized(p as ProviderName)
    ) as ProviderName[];
  }

  private getStatus(uptime: number, avgResponseTime: number): ProviderStatus {
    if (uptime < 50 || avgResponseTime > 10000) return 'down';
    if (uptime < UPTIME_THRESHOLD || avgResponseTime > RESPONSE_TIME_THRESHOLD) return 'degraded';
    return 'healthy';
  }

  private createDefaultMetrics(provider: ProviderName): ProviderHealthMetrics {
    return {
      provider,
      successCount: 0,
      failCount: 0,
      totalRequests: 0,
      uptime: 100,
      avgResponseTime: 0,
      lastUpdateTime: new Date().toISOString(),
      lastUpdateAt: Date.now(),
      status: 'healthy',
      isDeprioritized: false,
    };
  }

  private checkAndResetDaily() {
    const now = Date.now();
    if (now - this.lastResetTime > RESET_TIME) {
      this.resetAll();
    }
  }

  resetAll() {
    this.metrics.clear();
    this.deprioritizedProviders.clear();
    for (const provider of ['yfinance', 'nselib', 'jugasad', 'screener'] as ProviderName[]) {
      this.metrics.set(provider, this.createEmptyMetrics(provider));
    }
    this.lastResetTime = Date.now();
    this.persist();
  }

  resetProvider(provider: ProviderName) {
    this.metrics.set(provider, this.createEmptyMetrics(provider));
    this.updateDeprioritization();
    this.persist();
  }

  private persist() {
    try {
      const data: Record<string, unknown> = {
        lastResetTime: this.lastResetTime,
      };
      for (const [provider, metrics] of this.metrics) {
        data[provider] = metrics;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[ProviderHealthMonitor] Failed to persist health data:', error);
    }
  }
}

export const providerHealthMonitor = new ProviderHealthMonitorClass();
