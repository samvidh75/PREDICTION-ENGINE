/**
 * @vitest-environment node
 *
 * Tests for requireAuthenticatedUser preHandler (factory + mock verifier).
 * NEVER calls real Firebase.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { createRequireAuth } from '../requireAuthenticatedUser';
import type { VerifyTokenFn } from '../firebaseAdmin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock FastifyRequest. */
function mockRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    headers: {},
    query: {},
    body: {},
    authenticatedUser: undefined,
    ...overrides,
  } as unknown as FastifyRequest;
}

/** Build a mock FastifyReply that captures status/sent payload. */
function mockReply(): FastifyReply & { _status: number; _payload: unknown } {
  const reply = {
    _status: 200,
    _payload: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    send(payload: unknown) {
      this._payload = payload;
      return this;
    },
  };
  return reply as unknown as FastifyReply & { _status: number; _payload: unknown };
}

// ---------------------------------------------------------------------------
// Mock verifier
// ---------------------------------------------------------------------------

const VALID_UID = 'user-abc-123';
const VALID_EMAIL = 'user@example.com';

/** A verifyToken that accepts any token starting with "valid-". */
const mockVerifyToken: VerifyTokenFn = vi.fn(async (token: string) => {
  if (token === 'valid-token') {
    return { uid: VALID_UID, email: VALID_EMAIL };
  }
  if (token.startsWith('valid-uid-')) {
    // e.g. "valid-uid-userB" → uid = userB
    return { uid: token.slice('valid-uid-'.length) };
  }
  throw new Error('Invalid token');
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRequireAuth / requireAuthenticatedUser', () => {
  const preHandler = createRequireAuth(mockVerifyToken);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Missing Authorization header ----
  it('missing Authorization header returns 401', async () => {
    const request = mockRequest();
    const reply = mockReply();

    await preHandler(request, reply);

    expect(reply._status).toBe(401);
    expect(reply._payload).toMatchObject({ code: 'AUTH_MISSING' });
  });

  // ---- Non-Bearer scheme ----
  it('non-Bearer scheme returns 401', async () => {
    const request = mockRequest({
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    expect(reply._status).toBe(401);
    expect(reply._payload).toMatchObject({ code: 'AUTH_INVALID_SCHEME' });
  });

  // ---- Empty bearer token ----
  it('empty bearer token returns 401', async () => {
    const request = mockRequest({
      headers: { authorization: 'Bearer  ' },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    expect(reply._status).toBe(401);
    expect(reply._payload).toMatchObject({ code: 'AUTH_EMPTY_TOKEN' });
  });

  it('whitespace-only bearer token returns 401', async () => {
    const request = mockRequest({
      headers: { authorization: 'Bearer \t ' },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    expect(reply._status).toBe(401);
    expect(reply._payload).toMatchObject({ code: 'AUTH_EMPTY_TOKEN' });
  });

  // ---- Invalid token ----
  it('invalid token returns 403', async () => {
    const request = mockRequest({
      headers: { authorization: 'Bearer invalid-token' },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
    expect(mockVerifyToken).toHaveBeenCalledWith('invalid-token');
  });

  // ---- Valid token ----
  it('valid token attaches verified UID to request', async () => {
    const request = mockRequest({
      headers: { authorization: 'Bearer valid-token' },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    // Should not have sent an error response
    expect(reply._status).toBe(200); // default, never called status()

    expect(request.authenticatedUser).toBeDefined();
    expect(request.authenticatedUser!.uid).toBe(VALID_UID);
    expect(request.authenticatedUser!.email).toBe(VALID_EMAIL);
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
  });

  // ---- Spoofed x-user-uid header ignored ----
  it('spoofed x-user-uid header is ignored when valid token present', async () => {
    const request = mockRequest({
      headers: {
        authorization: 'Bearer valid-uid-userA',
        'x-user-uid': 'userB',
      },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    expect(request.authenticatedUser!.uid).toBe('userA');
    // Must NOT be the spoofed value
    expect(request.authenticatedUser!.uid).not.toBe('userB');
  });

  // ---- Spoofed ?uid= query param ignored ----
  it('spoofed ?uid= query param is ignored when valid token present', async () => {
    const request = mockRequest({
      headers: { authorization: 'Bearer valid-uid-userA' },
      query: { uid: 'userB' },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    expect(request.authenticatedUser!.uid).toBe('userA');
    expect(request.authenticatedUser!.uid).not.toBe('userB');
  });

  // ---- Body uid cannot override verified UID ----
  it('body uid cannot override verified UID', async () => {
    const request = mockRequest({
      headers: { authorization: 'Bearer valid-uid-userA' },
      body: { uid: 'userB', email: 'fake@example.com' },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    expect(request.authenticatedUser!.uid).toBe('userA');
    expect(request.authenticatedUser!.uid).not.toBe('userB');
  });

  // ---- Edge case: token with leading/trailing whitespace trimmed ----
  it('trims whitespace from token', async () => {
    const request = mockRequest({
      headers: { authorization: 'Bearer  valid-token  ' },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
    expect(request.authenticatedUser!.uid).toBe(VALID_UID);
  });

  // ---- Edge case: verifyToken throws a non-Error ----
  it('handles verifyToken throwing non-Error values gracefully', async () => {
    const throwingVerify: VerifyTokenFn = vi.fn(async () => {
      throw 'just a string'; // not an Error instance
    });
    const handler = createRequireAuth(throwingVerify);

    const request = mockRequest({
      headers: { authorization: 'Bearer anything' },
    });
    const reply = mockReply();

    await handler(request, reply);

    expect(reply._status).toBe(403);
  });

  // ---- Edge case: lowercase bearer ----
  it('rejects lowercase "bearer" scheme', async () => {
    const request = mockRequest({
      headers: { authorization: 'bearer valid-token' },
    });
    const reply = mockReply();

    await preHandler(request, reply);

    expect(reply._status).toBe(401);
    expect(reply._payload).toMatchObject({ code: 'AUTH_INVALID_SCHEME' });
  });
});