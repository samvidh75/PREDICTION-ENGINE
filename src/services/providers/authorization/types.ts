export type ProviderAuthorizationClass =
  | 'AUTHORIZED_AUTOMATED_INGESTION'
  | 'AUTHORIZED_STORAGE_AND_DERIVATION'
  | 'AUTHORIZED_PUBLIC_DISPLAY'
  | 'AUTHORIZED_INTERNAL_ONLY'
  | 'AUTHORIZATION_RECORD_MISSING'
  | 'AUTHORIZATION_SCOPE_INSUFFICIENT'
  | 'DISABLED'
  | 'UNKNOWN_REVIEW_REQUIRED';

export interface ProviderAuthorizationConfig {
  enabled: boolean;
  authorizationRecordId: string;
  authorizationScope: string;
  requestsPerMinute: number;
  requestsPerDay: number;
  concurrencyLimit: number;
  userAgent: string;
}

export interface AuthorizedProviderConfig {
  screener: ProviderAuthorizationConfig;
  moneycontrol: ProviderAuthorizationConfig;
}

export interface AuthorizationGateResult {
  passed: boolean;
  reason?: string;
  provider: string;
  authorizationClass: ProviderAuthorizationClass;
}
