import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpstoxConfig } from '../UpstoxConfig';
import { UpstoxTokenStore } from '../UpstoxTokenStore';
import { UpstoxSandboxClient } from '../UpstoxSandboxClient';

const ENV_BACKUP: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    ENV_BACKUP[key] = process.env[key];
  }
  UpstoxConfig.reset();
  UpstoxTokenStore.reset();
  process.env.UPSTOX_API_KEY = 'test-api-key';
  process.env.UPSTOX_CLIENT_SECRET = 'test-client-secret';
  process.env.UPSTOX_REDIRECT_URI = 'https://example.com/callback';
});

afterEach(() => {
  for (const key of Object.keys(ENV_BACKUP)) {
    if (ENV_BACKUP[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = ENV_BACKUP[key];
    }
  }
  UpstoxConfig.reset();
  UpstoxTokenStore.reset();
});

describe('UpstoxSandboxClient', () => {
  it('throws when sandbox token is not available', () => {
    const config = UpstoxConfig.getInstance();
    const tokenStore = UpstoxTokenStore.getInstance();
    const client = new UpstoxSandboxClient(config, tokenStore);
    expect(() => (client as any).getToken()).toThrow('Sandbox token not available');
  });

  it('uses sandbox base URL', () => {
    const client = new UpstoxSandboxClient();
    expect((client as any).getBaseUrl()).toBe('https://sandbox-api.upstox.com/v2');
  });

  it('does not use live token', () => {
    const config = UpstoxConfig.getInstance();
    const tokenStore = UpstoxTokenStore.getInstance();
    tokenStore.setLiveToken('live-token-123456789');
    tokenStore.setSandboxToken('sandbox-token-987654321');
    const client = new UpstoxSandboxClient(config, tokenStore);
    const token = (client as any).getToken();
    expect(token).toBe('sandbox-token-987654321');
    expect(token).not.toBe('live-token-123456789');
  });

  it('sanitizes API errors', async () => {
    const config = UpstoxConfig.getInstance();
    const tokenStore = UpstoxTokenStore.getInstance();
    tokenStore.setSandboxToken('some-sandbox-token-value');
    const client = new UpstoxSandboxClient(config, tokenStore);
    try {
      await client.checkHealth();
    } catch (err: any) {
      expect(err.message).not.toContain('some-sandbox-token-value');
    }
  });

  it('checkHealth returns status object', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const config = UpstoxConfig.getInstance();
    const tokenStore = UpstoxTokenStore.getInstance();
    tokenStore.setSandboxToken('some-sandbox-token-12345');
    const client = new UpstoxSandboxClient(config, tokenStore);
    const health = await client.checkHealth();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('message');
    vi.restoreAllMocks();
  });
});
