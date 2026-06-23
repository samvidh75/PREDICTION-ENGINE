export class UpstoxConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstoxConfigError';
  }
}

export class UpstoxAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'UpstoxAuthError';
  }
}

export class UpstoxApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly upstoxCode?: string,
  ) {
    super(message);
    this.name = 'UpstoxApiError';
  }
}

export class UpstoxTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstoxTokenError';
  }
}

export class UpstoxSandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstoxSandboxError';
  }
}

export function isUpstoxError(err: unknown): err is UpstoxApiError | UpstoxAuthError | UpstoxConfigError {
  return err instanceof UpstoxApiError || err instanceof UpstoxAuthError || err instanceof UpstoxConfigError;
}

export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/(access_token|refresh_token|code|client_secret|api_key|apikey)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/authorization:\s*[^\s]+/gi, 'authorization:[REDACTED]');
}

export function maskToken(token: string): string {
  if (token.length <= 8) return '****';
  return token.slice(0, 4) + '****' + token.slice(-4);
}
