import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UpstoxConfig } from '../UpstoxConfig';

const UPSTOX_ENV_KEYS = [
  'UPSTOX_API_KEY', 'UPSTOX_CLIENT_SECRET', 'UPSTOX_REDIRECT_URI',
  'UPSTOX_ACCESS_TOKEN', 'UPSTOX_SANDBOX_ENABLED', 'UPSTOX_SANDBOX_ACCESS_TOKEN',
  'UPSTOX_SANDBOX_MODE', 'UPSTOX_NOTIFIER_SECRET', 'UPSTOX_MARKET_DATA_ENABLED',
  'UPSTOX_ORDER_SANDBOX_ENABLED', 'UPSTOX_TOKEN_STORAGE',
];

beforeEach(() => {
  for (const key of UPSTOX_ENV_KEYS) {
    delete process.env[key];
  }
  UpstoxConfig.reset();
});

afterEach(() => {
  for (const key of UPSTOX_ENV_KEYS) {
    delete process.env[key];
  }
  UpstoxConfig.reset();
});

function setEnv(vars: Record<string, string>): void {
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
  }
}

describe('UpstoxConfig', () => {
  it('returns unconfigured when no env vars set', () => {
    const config = UpstoxConfig.getInstance();
    expect(config.configured).toBe(false);
    expect(config.getSummary().hasApiKey).toBe(false);
    expect(config.getSummary().hasClientSecret).toBe(false);
  });

  it('returns configured when all required env vars set', () => {
    setEnv({ UPSTOX_API_KEY: 'key', UPSTOX_CLIENT_SECRET: 'cs-value-test', UPSTOX_REDIRECT_URI: 'https://example.com/callback' });
    const config = UpstoxConfig.getInstance();
    expect(config.configured).toBe(true);
  });

  it('returns config summary without exposing secrets', () => {
    setEnv({
      UPSTOX_API_KEY: 'key-123',
      UPSTOX_CLIENT_SECRET: 'test-client-secret-value',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      UPSTOX_ACCESS_TOKEN: 'token-789',
    });
    const config = UpstoxConfig.getInstance();
    const summary = config.getSummary();
    expect(summary.hasApiKey).toBe(true);
    expect(summary.hasClientSecret).toBe(true);
    expect(summary.hasRedirectUri).toBe(true);
    expect(summary.hasAccessToken).toBe(true);
    expect(summary.sandboxEnabled).toBe(false);
    expect(summary.hasSandboxAccessToken).toBe(false);
    expect(summary.marketDataEnabled).toBe(false);
    expect(summary.orderSandboxEnabled).toBe(false);
  });

  it('detects sandbox mode from UPSTOX_SANDBOX_ENABLED', () => {
    setEnv({
      UPSTOX_API_KEY: 'key',
      UPSTOX_CLIENT_SECRET: 'value-cs-test',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      UPSTOX_SANDBOX_ENABLED: 'true',
    });
    const config = UpstoxConfig.getInstance();
    expect(config.getSandboxEnabled()).toBe(true);
    expect(config.getMode()).toBe('sandbox');
    expect(config.getApiBaseUrl()).toBe('https://sandbox-api.upstox.com/v2');
  });

  it('detects sandbox mode from UPSTOX_SANDBOX_MODE', () => {
    setEnv({
      UPSTOX_API_KEY: 'key',
      UPSTOX_CLIENT_SECRET: 'value-cs-test',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      UPSTOX_SANDBOX_MODE: 'true',
    });
    const config = UpstoxConfig.getInstance();
    expect(config.getSandboxEnabled()).toBe(true);
    expect(config.getMode()).toBe('sandbox');
  });

  it('reads sandbox access token', () => {
    setEnv({
      UPSTOX_API_KEY: 'key',
      UPSTOX_CLIENT_SECRET: 'value-cs-test',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      UPSTOX_SANDBOX_ENABLED: 'true',
      UPSTOX_SANDBOX_ACCESS_TOKEN: 'sandbox-token',
    });
    const config = UpstoxConfig.getInstance();
    expect(config.getSandboxAccessToken()).toBe('sandbox-token');
    expect(config.getActiveToken()).toBe('sandbox-token');
  });

  it('reads live access token', () => {
    setEnv({
      UPSTOX_API_KEY: 'key',
      UPSTOX_CLIENT_SECRET: 'value-cs-test',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      UPSTOX_ACCESS_TOKEN: 'live-token',
    });
    const config = UpstoxConfig.getInstance();
    expect(config.getLiveAccessToken()).toBe('live-token');
    expect(config.getActiveToken()).toBe('live-token');
  });

  it('live token is used when sandbox is not enabled', () => {
    setEnv({
      UPSTOX_API_KEY: 'key',
      UPSTOX_CLIENT_SECRET: 'value-cs-test',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      UPSTOX_ACCESS_TOKEN: 'live-token',
      UPSTOX_SANDBOX_ACCESS_TOKEN: 'sandbox-token',
    });
    const config = UpstoxConfig.getInstance();
    expect(config.getActiveToken()).toBe('live-token');
  });

  it('sandbox token is used when sandbox is enabled', () => {
    setEnv({
      UPSTOX_API_KEY: 'key',
      UPSTOX_CLIENT_SECRET: 'value-cs-test',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      UPSTOX_SANDBOX_ENABLED: 'true',
      UPSTOX_ACCESS_TOKEN: 'live-token',
      UPSTOX_SANDBOX_ACCESS_TOKEN: 'sandbox-token',
    });
    const config = UpstoxConfig.getInstance();
    expect(config.getActiveToken()).toBe('sandbox-token');
  });

  it('reads optional flags', () => {
    setEnv({
      UPSTOX_API_KEY: 'key',
      UPSTOX_CLIENT_SECRET: 'value-cs-test',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      UPSTOX_MARKET_DATA_ENABLED: 'true',
      UPSTOX_ORDER_SANDBOX_ENABLED: 'true',
    });
    const config = UpstoxConfig.getInstance();
    expect(config.marketDataEnabled).toBe(true);
    expect(config.orderSandboxEnabled).toBe(true);
  });

  it('live mode uses production base URL', () => {
    setEnv({
      UPSTOX_API_KEY: 'key',
      UPSTOX_CLIENT_SECRET: 'value-cs-test',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
    });
    const config = UpstoxConfig.getInstance();
    expect(config.getApiBaseUrl()).toBe('https://api.upstox.com/v2');
    expect(config.getAuthBaseUrl()).toBe('https://api.upstox.com/v2');
  });

  it('sandbox mode uses sandbox base URL', () => {
    setEnv({
      UPSTOX_API_KEY: 'key',
      UPSTOX_CLIENT_SECRET: 'value-cs-test',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      UPSTOX_SANDBOX_ENABLED: 'true',
    });
    const config = UpstoxConfig.getInstance();
    expect(config.getApiBaseUrl()).toBe('https://sandbox-api.upstox.com/v2');
  });
});
