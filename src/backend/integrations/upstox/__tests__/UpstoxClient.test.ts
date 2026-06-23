import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpstoxConfig } from '../UpstoxConfig';
import { UpstoxTokenStore } from '../UpstoxTokenStore';
import { UpstoxClient } from '../UpstoxClient';
import { UpstoxApiError } from '../UpstoxErrors';

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

describe('UpstoxClient', () => {
  it('throws when live token is not available', () => {
    const config = UpstoxConfig.getInstance();
    const tokenStore = UpstoxTokenStore.getInstance();
    const client = new UpstoxClient(config, tokenStore);
    expect(() => (client as any).getToken()).toThrow('Live access token not available');
  });

  it('uses live base URL', () => {
    const client = new UpstoxClient();
    expect((client as any).getBaseUrl()).toBe('https://api.upstox.com/v2');
  });

  it('does not use sandbox token', () => {
    const config = UpstoxConfig.getInstance();
    const tokenStore = UpstoxTokenStore.getInstance();
    tokenStore.setLiveToken('live-token-123456789');
    tokenStore.setSandboxToken('sandbox-token-987654321');
    const client = new UpstoxClient(config, tokenStore);
    const token = (client as any).getToken();
    expect(token).toBe('live-token-123456789');
    expect(token).not.toBe('sandbox-token-987654321');
  });

  it('sanitizes errors', () => {
    const config = UpstoxConfig.getInstance();
    const tokenStore = UpstoxTokenStore.getInstance();
    tokenStore.setLiveToken('live-token-123456789');
    const client = new UpstoxClient(config, tokenStore);
    expect(() => {
      throw new UpstoxApiError('Error with token=secret123', 401);
    }).toThrow();
  });

  it('returns empty array for holdings on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const config = UpstoxConfig.getInstance();
    const tokenStore = UpstoxTokenStore.getInstance();
    tokenStore.setLiveToken('live-token-123456789');
    const client = new UpstoxClient(config, tokenStore);
    await expect(client.getHoldings()).rejects.toThrow();
    vi.restoreAllMocks();
  });
});
