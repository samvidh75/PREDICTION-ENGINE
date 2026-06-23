export class StockEdgeIntegrationError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "StockEdgeIntegrationError";
    this.code = code;
    this.retryable = retryable;
  }
}

export const STOCKEDGE_CODES = {
  disabled: "STOCKEDGE_DISABLED",
  authNotConfigured: "STOCKEDGE_AUTH_NOT_CONFIGURED",
  loginFailed: "STOCKEDGE_LOGIN_FAILED",
  mfaRequired: "STOCKEDGE_MFA_REQUIRED",
  sessionExpired: "STOCKEDGE_SESSION_EXPIRED",
  discoveryRequired: "STOCKEDGE_DISCOVERY_REQUIRED",
  endpointNotDiscovered: "STOCKEDGE_ENDPOINT_NOT_DISCOVERED",
  configMissing: "STOCKEDGE_CONFIG_MISSING",
  timeout: "STOCKEDGE_TIMEOUT",
  rateLimited: "STOCKEDGE_RATE_LIMITED",
  remoteError: "STOCKEDGE_REMOTE_ERROR",
  emptyPayload: "STOCKEDGE_EMPTY_PAYLOAD",
  mappingError: "STOCKEDGE_MAPPING_ERROR",
} as const;

export const STOCKEDGE_LOGIN_ERROR_CODES = new Set([
  STOCKEDGE_CODES.authNotConfigured,
  STOCKEDGE_CODES.loginFailed,
  STOCKEDGE_CODES.mfaRequired,
  STOCKEDGE_CODES.discoveryRequired,
]);

export const STOCKEDGE_RECOVERABLE_CODES = new Set([
  STOCKEDGE_CODES.sessionExpired,
  STOCKEDGE_CODES.discoveryRequired,
  STOCKEDGE_CODES.endpointNotDiscovered,
]);
