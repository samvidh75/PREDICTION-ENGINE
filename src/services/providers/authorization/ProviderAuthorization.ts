import {
  ProviderAuthorizationClass,
  ProviderAuthorizationConfig,
  AuthorizedProviderConfig,
  AuthorizationGateResult,
} from './types';

const CONTACT_EMAIL = process.env.AUTHORIZED_PROVIDER_CONTACT_EMAIL || '';

function loadProviderConfig(prefix: string): ProviderAuthorizationConfig {
  const enabled = process.env[`${prefix}_INGESTION_ENABLED`] === 'true';
  const authorizationRecordId = process.env[`${prefix}_AUTHORIZATION_RECORD_ID`] || '';
  const authorizationScope = process.env[`${prefix}_AUTHORIZATION_SCOPE`] || '';
  const requestsPerMinute = Number(process.env[`${prefix}_REQUESTS_PER_MINUTE`] || '6');
  const requestsPerDay = Number(process.env[`${prefix}_REQUESTS_PER_DAY`] || '500');
  const concurrencyLimit = Number(process.env[`${prefix}_CONCURRENCY_LIMIT`] || '1');
  const userAgent = process.env[`${prefix}_USER_AGENT`] || '';
  return { enabled, authorizationRecordId, authorizationScope, requestsPerMinute, requestsPerDay, concurrencyLimit, userAgent };
}

export function loadAuthorizedProviderConfig(): AuthorizedProviderConfig {
  return {
    screener: loadProviderConfig('SCREENER'),
    moneycontrol: loadProviderConfig('MONEYCONTROL'),
  };
}

export function authorizeProviderIngestion(provider: string, config: ProviderAuthorizationConfig): AuthorizationGateResult {
  if (!config.enabled) {
    return { passed: false, provider, authorizationClass: 'DISABLED', reason: `${provider}: ingestion is disabled (set ${provider.toUpperCase()}_INGESTION_ENABLED=true)` };
  }
  if (!config.authorizationRecordId || config.authorizationRecordId.length < 5) {
    return { passed: false, provider, authorizationClass: 'AUTHORIZATION_RECORD_MISSING', reason: `${provider}: authorization record ID is missing or too short` };
  }
  if (!config.authorizationScope) {
    return { passed: false, provider, authorizationClass: 'AUTHORIZATION_SCOPE_INSUFFICIENT', reason: `${provider}: authorization scope is empty` };
  }
  if (!config.userAgent && !CONTACT_EMAIL) {
    return { passed: false, provider, authorizationClass: 'UNKNOWN_REVIEW_REQUIRED', reason: `${provider}: user agent and contact email are both empty — set ${provider.toUpperCase()}_USER_AGENT or AUTHORIZED_PROVIDER_CONTACT_EMAIL` };
  }
  return { passed: true, provider, authorizationClass: 'AUTHORIZED_AUTOMATED_INGESTION' };
}

export function isPublicDisplayAllowed(config: ProviderAuthorizationConfig): boolean {
  return config.authorizationScope.includes('public_display') || config.authorizationScope.includes('PUBLIC_DISPLAY');
}

export function getProviderUserAgent(config: ProviderAuthorizationConfig): string {
  if (config.userAgent) return config.userAgent;
  if (CONTACT_EMAIL) return `Lensory/${config.authorizationRecordId} (${CONTACT_EMAIL})`;
  return `Lensory/${config.authorizationRecordId}`;
}
