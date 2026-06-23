import { UpstoxConfigError } from './UpstoxErrors';
import type { UpstoxConfigSummary, UpstoxMode } from './UpstoxTypes';

function optionalEnv(name: string, fallback?: string): string | undefined {
  return process.env[name]?.trim() || fallback;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new UpstoxConfigError(`${name} is not configured`);
  return value;
}

function isTrue(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === 'true';
}

export class UpstoxConfig {
  private static instance: UpstoxConfig;

  readonly apiKey: string | undefined;
  readonly clientSecret: string | undefined;
  readonly redirectUri: string | undefined;
  readonly notifierSecret: string | undefined;
  readonly marketDataEnabled: boolean;
  readonly orderSandboxEnabled: boolean;
  readonly tokenStorage: string;
  readonly configured: boolean;

  private constructor() {
    this.apiKey = optionalEnv('UPSTOX_API_KEY');
    this.clientSecret = optionalEnv('UPSTOX_CLIENT_SECRET');
    this.redirectUri = optionalEnv('UPSTOX_REDIRECT_URI');
    this.notifierSecret = optionalEnv('UPSTOX_NOTIFIER_SECRET');
    this.marketDataEnabled = isTrue('UPSTOX_MARKET_DATA_ENABLED');
    this.orderSandboxEnabled = isTrue('UPSTOX_ORDER_SANDBOX_ENABLED');
    this.tokenStorage = optionalEnv('UPSTOX_TOKEN_STORAGE', 'encrypted_db')!;
    this.configured = !!(this.apiKey && this.clientSecret && this.redirectUri);
  }

  static getInstance(): UpstoxConfig {
    if (!this.instance) {
      this.instance = new UpstoxConfig();
    }
    return this.instance;
  }

  static requireConfigured(): UpstoxConfig {
    const config = this.getInstance();
    if (!config.configured) {
      throw new UpstoxConfigError('Upstox is not fully configured');
    }
    return config;
  }

  static reset(): void {
    (this as any).instance = undefined;
  }

  getSandboxEnabled(): boolean {
    return isTrue('UPSTOX_SANDBOX_ENABLED') || isTrue('UPSTOX_SANDBOX_MODE');
  }

  getSandboxAccessToken(): string | undefined {
    return optionalEnv('UPSTOX_SANDBOX_ACCESS_TOKEN');
  }

  getLiveAccessToken(): string | undefined {
    return optionalEnv('UPSTOX_ACCESS_TOKEN');
  }

  getRedirectUri(): string {
    return this.redirectUri || '';
  }

  getMode(): UpstoxMode {
    return this.getSandboxEnabled() ? 'sandbox' : 'live';
  }

  getActiveToken(): string | undefined {
    return this.getSandboxEnabled() ? this.getSandboxAccessToken() : this.getLiveAccessToken();
  }

  getApiBaseUrl(): string {
    return 'https://api.upstox.com/v2';
  }

  getAuthBaseUrl(): string {
    return 'https://api.upstox.com/v2';
  }

  getSummary(): UpstoxConfigSummary {
    return {
      hasApiKey: !!this.apiKey,
      hasClientSecret: !!this.clientSecret,
      hasRedirectUri: !!this.redirectUri,
      hasAccessToken: !!this.getLiveAccessToken(),
      sandboxEnabled: this.getSandboxEnabled(),
      hasSandboxAccessToken: !!this.getSandboxAccessToken(),
      marketDataEnabled: this.marketDataEnabled,
      orderSandboxEnabled: this.orderSandboxEnabled,
    };
  }
}
