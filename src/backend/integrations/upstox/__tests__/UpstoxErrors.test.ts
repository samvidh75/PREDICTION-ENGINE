import { describe, expect, it } from 'vitest';
import { sanitizeErrorMessage, maskToken, UpstoxConfigError, UpstoxAuthError, UpstoxApiError, UpstoxTokenError, UpstoxSandboxError } from '../UpstoxErrors';

describe('UpstoxErrors', () => {
  it('sanitizeErrorMessage redacts access_token', () => {
    const msg = 'Error: access_token=abc123&other=val';
    expect(sanitizeErrorMessage(msg)).toBe('Error: access_token=[REDACTED]&other=val');
  });

  it('sanitizeErrorMessage redacts client_secret', () => {
    const msg = 'Error: client_secret=__TEST_CLIENT_SECRET__';
    expect(sanitizeErrorMessage(msg)).toContain('[REDACTED]');
    expect(sanitizeErrorMessage(msg)).not.toContain('__TEST_CLIENT_SECRET__');
  });

  it('sanitizeErrorMessage redacts Bearer tokens', () => {
    const msg = 'Authorization: Bearer __TEST_JWT_TOKEN__';
    expect(sanitizeErrorMessage(msg)).toContain('[REDACTED]');
    expect(sanitizeErrorMessage(msg)).not.toContain('__TEST_JWT_TOKEN__');
  });

  it('sanitizeErrorMessage redacts code parameter', () => {
    const msg = 'Error: code=auth-code-12345';
    expect(sanitizeErrorMessage(msg)).toBe('Error: code=[REDACTED]');
  });

  it('maskToken masks middle characters', () => {
    expect(maskToken('abcdefghijklmnop')).toBe('abcd****mnop');
    expect(maskToken('short')).toBe('****');
  });

  it('error classes have correct names', () => {
    expect(new UpstoxConfigError('test').name).toBe('UpstoxConfigError');
    expect(new UpstoxAuthError('test', 'ERR').name).toBe('UpstoxAuthError');
    expect(new UpstoxApiError('test', 401).name).toBe('UpstoxApiError');
    expect(new UpstoxTokenError('test').name).toBe('UpstoxTokenError');
    expect(new UpstoxSandboxError('test').name).toBe('UpstoxSandboxError');
  });

  it('UpstoxAuthError carries code', () => {
    const err = new UpstoxAuthError('unauthorized', 'AUTH_FAILED');
    expect(err.code).toBe('AUTH_FAILED');
  });

  it('UpstoxApiError carries http status', () => {
    const err = new UpstoxApiError('rate limited', 429);
    expect(err.httpStatus).toBe(429);
  });
});
