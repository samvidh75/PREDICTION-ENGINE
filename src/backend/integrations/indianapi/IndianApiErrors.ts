export class IndianApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "IndianApiError";
  }
}

export function mapIndianApiError(err: unknown): IndianApiError {
  if (err instanceof IndianApiError) return err;
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("timeout") || msg.includes("TIMEOUT")) {
      return new IndianApiError("Request timed out", "TIMEOUT", true, 408);
    }
    if (msg.includes("429") || msg.includes("Too Many Requests")) {
      return new IndianApiError("Rate limit exceeded", "RATE_LIMITED", true, 429);
    }
    if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) {
      return new IndianApiError("Provider authentication failed", "AUTH_ERROR", false, 403);
    }
    if (msg.includes("50") || msg.includes("server error")) {
      return new IndianApiError("Provider server error", "PROVIDER_ERROR", true, 502);
    }
    if (msg.includes("fetch") || msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED")) {
      return new IndianApiError("Provider unreachable", "NETWORK_ERROR", true, 503);
    }
    return new IndianApiError(msg, "UNKNOWN", false, 500);
  }
  return new IndianApiError("Unknown provider error", "UNKNOWN", false, 500);
}
