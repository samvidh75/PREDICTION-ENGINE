import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UpstoxConfig } from '../UpstoxConfig';
import { UpstoxTokenStore } from '../UpstoxTokenStore';
import { UpstoxOAuthService } from '../UpstoxOAuthService';

const ENV_BACKUP: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    ENV_BACKUP[key] = process.env[key];
  }
  UpstoxConfig.reset();
  UpstoxTokenStore.reset();
  process.env.UPSTOX_API_KEY = 'test-api-key';
  process.env.UPSTOX_CLIENT_SECRET = 'test-client-secret';
  process.env.UPSTOX_REDIRECT_URI = 'https://www.stockstory-india.com/api/providers/upstox/token/callback';
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

describe('UpstoxOAuthService', () => {
  it('buildAuthorizationUrl uses exact redirect URI', () => {
    const config = UpstoxConfig.getInstance();
    const service = new UpstoxOAuthService(config);
    const result = service.buildAuthorizationUrl();
    const url = new URL(result.authUrl);
    expect(url.origin + url.pathname).toBe('https://api.upstox.com/v2/login/authorization/dialog');
    expect(url.searchParams.get('redirect_uri')).toBe('https://www.stockstory-india.com/api/providers/upstox/token/callback');
    expect(url.searchParams.get('client_id')).toBe('test-api-key');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.has('state')).toBe(true);
  });

  it('buildAuthorizationUrl generates unique state each time', () => {
    const config = UpstoxConfig.getInstance();
    const service = new UpstoxOAuthService(config);
    const result1 = service.buildAuthorizationUrl();
    const result2 = service.buildAuthorizationUrl();
    expect(result1.state).not.toBe(result2.state);
  });

  it('exchangeCodeForToken rejects missing code', async () => {
    const config = UpstoxConfig.getInstance();
    const service = new UpstoxOAuthService(config);
    const result = await service.exchangeCodeForToken('');
    expect(result.status).toBe('rejected');
    expect(result.message).toContain('Missing authorization code');
  });

  it('exchangeCodeForToken never returns raw token', async () => {
    const config = UpstoxConfig.getInstance();
    const service = new UpstoxOAuthService(config);
    const result = await service.exchangeCodeForToken('some-code');

    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain('test-api-key');
    expect(resultStr).not.toContain('test-client-secret');
    expect(resultStr).not.toContain('access_token');
  });

  it('getStatus returns safe status only', () => {
    const config = UpstoxConfig.getInstance();
    const service = new UpstoxOAuthService(config);
    const status = service.getStatus();
    expect(status.configured).toBe(true);
    expect(status).not.toHaveProperty('accessToken');
    expect(status).not.toHaveProperty('clientSecret');
    expect(status).toHaveProperty('tokenPresent');
    expect(status).toHaveProperty('sandboxEnabled');
  });

  it('getConfigSummary hides secrets', () => {
    const config = UpstoxConfig.getInstance();
    const service = new UpstoxOAuthService(config);
    const summary = service.getConfigSummary();
    expect(summary.hasApiKey).toBe(true);
    expect(summary.hasClientSecret).toBe(true);
    expect(summary.hasRedirectUri).toBe(true);
    expect(Object.keys(summary)).not.toContain('apiKey');
    expect(Object.keys(summary)).not.toContain('clientSecret');
    expect(Object.keys(summary)).not.toContain('accessToken');
  });
});
