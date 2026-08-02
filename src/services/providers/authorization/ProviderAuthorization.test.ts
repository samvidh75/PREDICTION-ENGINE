import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  loadAuthorizedProviderConfig,
  authorizeProviderIngestion,
  isPublicDisplayAllowed,
  getProviderUserAgent,
} from './ProviderAuthorization';
import type { ProviderAuthorizationConfig } from './types';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('loadAuthorizedProviderConfig', () => {
  it('both providers are disabled by default when no env vars are set', () => {
    delete process.env.SCREENER_INGESTION_ENABLED;
    delete process.env.MONEYCONTROL_INGESTION_ENABLED;

    const config = loadAuthorizedProviderConfig();

    expect(config.screener.enabled).toBe(false);
    expect(config.moneycontrol.enabled).toBe(false);
  });

  it('reads per-provider environment variables correctly', () => {
    process.env.SCREENER_INGESTION_ENABLED = 'true';
    process.env.SCREENER_AUTHORIZATION_RECORD_ID = 'rec_abc12345';
    process.env.SCREENER_AUTHORIZATION_SCOPE = 'public_display';
    process.env.SCREENER_REQUESTS_PER_MINUTE = '10';
    process.env.SCREENER_REQUESTS_PER_DAY = '1000';
    process.env.SCREENER_CONCURRENCY_LIMIT = '2';
    process.env.SCREENER_USER_AGENT = 'ScreenerBot/1.0';

    const config = loadAuthorizedProviderConfig();

    expect(config.screener).toMatchObject({
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'public_display',
      requestsPerMinute: 10,
      requestsPerDay: 1000,
      concurrencyLimit: 2,
      userAgent: 'ScreenerBot/1.0',
    });
  });
});

describe('authorizeProviderIngestion', () => {
  const PROVIDER = 'screener';

  it('fails closed when the provider is disabled', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: false,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'internal_only',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    const result = authorizeProviderIngestion(PROVIDER, config);

    expect(result.passed).toBe(false);
    expect(result.authorizationClass).toBe('DISABLED');
    expect(result.reason).toContain('SCREENER_INGESTION_ENABLED=true');
  });

  it('fails closed when authorization record ID is missing', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: '',
      authorizationScope: 'internal_only',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    const result = authorizeProviderIngestion(PROVIDER, config);

    expect(result.passed).toBe(false);
    expect(result.authorizationClass).toBe('AUTHORIZATION_RECORD_MISSING');
    expect(result.reason).toContain('missing or too short');
  });

  it('fails closed when authorization record ID is too short', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'ab',
      authorizationScope: 'internal_only',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    const result = authorizeProviderIngestion(PROVIDER, config);

    expect(result.passed).toBe(false);
    expect(result.authorizationClass).toBe('AUTHORIZATION_RECORD_MISSING');
    expect(result.reason).toContain('missing or too short');
  });

  it('fails closed when authorization scope is empty', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: '',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    const result = authorizeProviderIngestion(PROVIDER, config);

    expect(result.passed).toBe(false);
    expect(result.authorizationClass).toBe('AUTHORIZATION_SCOPE_INSUFFICIENT');
    expect(result.reason).toContain('authorization scope is empty');
  });

  it('fails closed when user agent and contact email are both empty', () => {
    delete process.env.AUTHORIZED_PROVIDER_CONTACT_EMAIL;

    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'internal_only',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: '',
    };

    const result = authorizeProviderIngestion(PROVIDER, config);

    expect(result.passed).toBe(false);
    expect(result.authorizationClass).toBe('UNKNOWN_REVIEW_REQUIRED');
    expect(result.reason).toContain('user agent and contact email are both empty');
  });

  it('passes when all required fields are present', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'internal_only',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    const result = authorizeProviderIngestion(PROVIDER, config);

    expect(result.passed).toBe(true);
    expect(result.authorizationClass).toBe('AUTHORIZED_AUTOMATED_INGESTION');
  });
});

describe('isPublicDisplayAllowed', () => {
  it('returns true when scope contains public_display', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'public_display',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    expect(isPublicDisplayAllowed(config)).toBe(true);
  });

  it('returns true when scope contains PUBLIC_DISPLAY', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'STORAGE_AND_DERIVATION PUBLIC_DISPLAY',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    expect(isPublicDisplayAllowed(config)).toBe(true);
  });

  it('returns false when scope does not include public display', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'AUTHORIZED_INTERNAL_ONLY',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    expect(isPublicDisplayAllowed(config)).toBe(false);
  });

  it('returns false when scope is empty', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: '',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    expect(isPublicDisplayAllowed(config)).toBe(false);
  });
});

describe('getProviderUserAgent', () => {
  it('returns configured user agent when set', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'internal_only',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'MyCustomAgent/2.0',
    };

    expect(getProviderUserAgent(config)).toBe('MyCustomAgent/2.0');
  });

  it('returns Lensory/recordId when user agent is empty but contact email is set', async () => {
    vi.stubEnv('AUTHORIZED_PROVIDER_CONTACT_EMAIL', 'dev@example.com');
    vi.resetModules();

    const { getProviderUserAgent: getAgent } = await import('./ProviderAuthorization');

    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'internal_only',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: '',
    };

    expect(getAgent(config)).toBe('Lensory/rec_abc12345 (dev@example.com)');
  });

  it('returns Lensory/recordId when both user agent and contact email are empty', () => {
    delete process.env.AUTHORIZED_PROVIDER_CONTACT_EMAIL;

    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'rec_abc12345',
      authorizationScope: 'internal_only',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: '',
    };

    expect(getProviderUserAgent(config)).toBe('Lensory/rec_abc12345');
  });
});

describe('confidential values are never logged', () => {
  it('does not include the raw authorization record ID in gate failure messages', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'super-secret-key-12345',
      authorizationScope: '',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    const result = authorizeProviderIngestion('moneycontrol', config);

    expect(result.reason).toBeDefined();
    expect(result.reason).not.toContain('super-secret-key-12345');
    expect(result.reason).not.toContain('super-secret');
  });

  it('does not include the raw authorization record ID in disabled failure messages', () => {
    const config: ProviderAuthorizationConfig = {
      enabled: false,
      authorizationRecordId: 'secret-rec-98765',
      authorizationScope: 'public_display',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: 'TestBot/1.0',
    };

    const result = authorizeProviderIngestion('screener', config);

    expect(result.reason).toBeDefined();
    expect(result.reason).not.toContain('secret-rec-98765');
  });

  it('does not include the raw authorization record ID when user agent check fails', () => {
    delete process.env.AUTHORIZED_PROVIDER_CONTACT_EMAIL;

    const config: ProviderAuthorizationConfig = {
      enabled: true,
      authorizationRecordId: 'confidential-rec-555',
      authorizationScope: 'internal_only',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: '',
    };

    const result = authorizeProviderIngestion('moneycontrol', config);

    expect(result.reason).toBeDefined();
    expect(result.reason).not.toContain('confidential-rec-555');
  });
});
