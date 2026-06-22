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
  configMissing: "STOCKEDGE_CONFIG_MISSING",
  timeout: "STOCKEDGE_TIMEOUT",
  rateLimited: "STOCKEDGE_RATE_LIMITED",
  remoteError: "STOCKEDGE_REMOTE_ERROR",
  emptyPayload: "STOCKEDGE_EMPTY_PAYLOAD",
  mappingError: "STOCKEDGE_MAPPING_ERROR",
} as const;
