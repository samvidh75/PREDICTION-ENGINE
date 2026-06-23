import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UpstoxTokenStore } from '../UpstoxTokenStore';
import { maskToken } from '../UpstoxErrors';
import { UpstoxConfig } from '../UpstoxConfig';

let envBackup: Record<string, string | undefined> = {};

function setMinEnv(): void {
  process.env.UPSTOX_API_KEY = 'test-api-key';
  process.env.UPSTOX_CLIENT_SECRET = 'test-client-secret';
  process.env.UPSTOX_REDIRECT_URI = 'https://example.com/callback';
}

beforeEach(() => {
  envBackup = {};
  for (const key of Object.keys(process.env)) {
    envBackup[key] = process.env[key];
  }
  UpstoxTokenStore.reset();
  UpstoxConfig.reset();
});

afterEach(() => {
  for (const key of Object.keys(envBackup)) {
    if (envBackup[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = envBackup[key];
    }
  }
  for (const key of Object.keys(process.env)) {
    if (!(key in envBackup)) {
      delete process.env[key];
    }
  }
  UpstoxTokenStore.reset();
  UpstoxConfig.reset();
});

describe('UpstoxTokenStore', () => {
  it('stores and retrieves live token', () => {
    const store = UpstoxTokenStore.getInstance();
    store.setLiveToken('test-live-token-value');
    expect(store.getLiveToken()).toBe('test-live-token-value');
  });

  it('stores and retrieves sandbox token', () => {
    const store = UpstoxTokenStore.getInstance();
    store.setSandboxToken('test-sandbox-token-value');
    expect(store.getSandboxToken()).toBe('test-sandbox-token-value');
  });

  it('rejects invalid live token', () => {
    const store = UpstoxTokenStore.getInstance();
    expect(() => store.setLiveToken('short')).toThrow('Invalid live token');
  });

  it('rejects invalid sandbox token', () => {
    const store = UpstoxTokenStore.getInstance();
    expect(() => store.setSandboxToken('short')).toThrow('Invalid sandbox token');
  });

  it('live and sandbox tokens are separated', () => {
    const store = UpstoxTokenStore.getInstance();
    store.setLiveToken('live-token-value-12345');
    store.setSandboxToken('sandbox-token-value-67890');
    expect(store.getLiveToken()).toBe('live-token-value-12345');
    expect(store.getSandboxToken()).toBe('sandbox-token-value-67890');
  });

  it('clears live token', () => {
    const store = UpstoxTokenStore.getInstance();
    store.setLiveToken('live-token-value-12345');
    store.setSandboxToken('sandbox-token-value-67890');
    store.clearToken('live');
    expect(store.getLiveToken()).toBeNull();
    expect(store.getSandboxToken()).toBe('sandbox-token-value-67890');
  });

  it('clears sandbox token', () => {
    const store = UpstoxTokenStore.getInstance();
    store.setLiveToken('live-token-value-12345');
    store.setSandboxToken('sandbox-token-value-67890');
    store.clearToken('sandbox');
    expect(store.getLiveToken()).toBe('live-token-value-12345');
    expect(store.getSandboxToken()).toBeNull();
  });

  it('clears all tokens', () => {
    const store = UpstoxTokenStore.getInstance();
    store.setLiveToken('live-token-value-12345');
    store.setSandboxToken('sandbox-token-value-67890');
    store.clearToken();
    expect(store.getLiveToken()).toBeNull();
    expect(store.getSandboxToken()).toBeNull();
  });

  it('returns token status', () => {
    const store = UpstoxTokenStore.getInstance();
    store.setLiveToken('live-token-value-12345', { expiresAt: Date.now() + 3600000 });
    store.setSandboxToken('sandbox-token-value-67890');
    const status = store.getTokenStatus();
    expect(status.live.present).toBe(true);
    expect(status.live.expiresAt).toBeGreaterThan(Date.now());
    expect(status.sandbox.present).toBe(true);
  });

  it('returns masked token info', () => {
    const store = UpstoxTokenStore.getInstance();
    store.setLiveToken('abcdefghijklmnop');
    store.setSandboxToken('uvwxyzabcdefghij');
    const masked = store.getMaskedInfo();
    expect(masked.live).toBe('abcd****mnop');
    expect(masked.sandbox).toBe('uvwx****ghij');
  });

  it('maskToken hides middle characters', () => {
    expect(maskToken('1234567890')).toBe('1234****7890');
    expect(maskToken('abc')).toBe('****');
    expect(maskToken('abcdefghijkl')).toBe('abcd****ijkl');
  });

  it('notifies listeners on token change', () => {
    const store = UpstoxTokenStore.getInstance();
    const notifications: string[] = [];
    store.onTokenChange((mode, status) => {
      notifications.push(`${mode}:${status}`);
    });
    store.setLiveToken('live-token-123456789');
    expect(notifications).toContain('live:stored');
    store.clearToken('live');
    expect(notifications).toContain('live:cleared');
  });

  it('getActiveToken returns sandbox when sandbox enabled', () => {
    setMinEnv();
    process.env.UPSTOX_SANDBOX_ENABLED = 'true';
    const store = UpstoxTokenStore.getInstance();
    store.setLiveToken('live-token-12345');
    store.setSandboxToken('sandbox-token-67890');
    const active = store.getActiveToken();
    expect(active).toBe('sandbox-token-67890');
  });

  it('getActiveToken returns live when sandbox not enabled', () => {
    setMinEnv();
    const store = UpstoxTokenStore.getInstance();
    store.setLiveToken('live-token-12345');
    store.setSandboxToken('sandbox-token-67890');
    expect(store.getActiveToken()).toBe('live-token-12345');
  });

  it('loadFromEnv reads tokens from environment', () => {
    setMinEnv();
    process.env.UPSTOX_ACCESS_TOKEN = 'env-live-token-12345';
    process.env.UPSTOX_SANDBOX_ACCESS_TOKEN = 'env-sandbox-token-67890';
    const store = UpstoxTokenStore.getInstance();
    store.loadFromEnv();
    expect(store.getLiveToken()).toBe('env-live-token-12345');
    expect(store.getSandboxToken()).toBe('env-sandbox-token-67890');
  });
});
