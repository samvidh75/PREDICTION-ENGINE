export interface IndianApiPremiumConfigSummary {
  enabled: boolean;
  hasApiKey: boolean;
  baseUrlConfigured: boolean;
  timeoutMs: number;
  concurrency: number;
  rateLimitPerMinute: number;
  historyEnabled: boolean;
  scanEnabled: boolean;
}

export class IndianApiPremiumConfig {
  private static instance: IndianApiPremiumConfig;

  readonly enabled: boolean;
  readonly apiKey: string | undefined;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly concurrency: number;
  readonly rateLimitPerMinute: number;
  readonly historyEnabled: boolean;
  readonly scanEnabled: boolean;
  readonly cacheTtlSeconds: number;

  private constructor() {
    this.enabled = process.env.INDIANAPI_PREMIUM_ENABLED?.trim().toLowerCase() === 'true';
    this.apiKey = process.env.INDIANAPI_PREMIUM_API_KEY?.trim();
    this.baseUrl = process.env.INDIANAPI_PREMIUM_BASE_URL?.trim() || 'https://analyst.indianapi.in';
    this.timeoutMs = parseInt(process.env.INDIANAPI_PREMIUM_TIMEOUT_MS || '15000', 10);
    this.concurrency = parseInt(process.env.INDIANAPI_PREMIUM_CONCURRENCY || '20', 10);
    this.rateLimitPerMinute = parseInt(process.env.INDIANAPI_PREMIUM_RATE_LIMIT_PER_MINUTE || '300', 10);
    this.historyEnabled = process.env.INDIANAPI_PREMIUM_HISTORY_ENABLED?.trim().toLowerCase() !== 'false';
    this.scanEnabled = process.env.INDIANAPI_PREMIUM_SCAN_ENABLED?.trim().toLowerCase() === 'true';
    this.cacheTtlSeconds = parseInt(process.env.INDIANAPI_PREMIUM_CACHE_TTL_SECONDS || '300', 10);
  }

  static getInstance(): IndianApiPremiumConfig {
    if (!this.instance) {
      this.instance = new IndianApiPremiumConfig();
    }
    return this.instance;
  }

  static reset(): void {
    (this as any).instance = undefined;
  }

  getSummary(): IndianApiPremiumConfigSummary {
    return {
      enabled: this.enabled,
      hasApiKey: !!this.apiKey,
      baseUrlConfigured: !!this.baseUrl,
      timeoutMs: this.timeoutMs,
      concurrency: this.concurrency,
      rateLimitPerMinute: this.rateLimitPerMinute,
      historyEnabled: this.historyEnabled,
      scanEnabled: this.scanEnabled,
    };
  }
}
