/**
 * TRACK-P4B-P2 — Authenticated user middleware.
 * 
 * Extracts and verifies a Firebase ID token from the Authorization header.
 * Attaches authenticatedUser to the Fastify request.
 * NEVER trusts x-user-uid, ?uid=, or localStorage.
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { getTokenVerifier } from './firebaseAdmin';
import type { TokenVerifier } from './firebaseAdmin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authenticatedUser?: AuthenticatedUser;
  }
}

/**
 * PreHandler hook that requires a valid Firebase ID token.
 * - Missing token → HTTP 401
 * - Invalid token → HTTP 403
 * - Valid token → attaches request.authenticatedUser
 */
export async function requireAuthenticatedUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  // 401: No Authorization header
  if (!authHeader) {
    return reply.status(401).send({
      code: 'AUTH_MISSING',
      error: 'Authorization header is required.',
    });
  }

  // 401: Not Bearer scheme
  if (!authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      code: 'AUTH_INVALID_SCHEME',
      error: 'Bearer token is required.',
    });
  }

  const token = authHeader.slice(7).trim();

  // 401: Empty token
  if (!token) {
    return reply.status(401).send({
      code: 'AUTH_EMPTY_TOKEN',
      error: 'Token is required.',
    });
  }

  // Verify token server-side
  try {
    const verifier = getTokenVerifier();
    const decoded = await verifier.verifyIdToken(token);
    request.authenticatedUser = {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch {
    // 403: Invalid, expired, or revoked token
    return reply.status(403).send({
      code: 'AUTH_INVALID_TOKEN',
      error: 'The provided token is invalid, expired, or revoked.',
    });
  }
}

/**
 * Factory that creates a requireAuth preHandler with an injected TokenVerifier.
 * Used in tests to inject mock verifiers without calling real Firebase.
 */
export function createRequireAuth(verifier: TokenVerifier): (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void> {
  return async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        code: 'AUTH_MISSING',
        error: 'Authorization header is required.',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        code: 'AUTH_INVALID_SCHEME',
        error: 'Bearer token is required.',
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return reply.status(401).send({
        code: 'AUTH_EMPTY_TOKEN',
        error: 'Token is required.',
      });
    }

    try {
      const decoded = await verifier.verifyIdToken(token);
      request.authenticatedUser = {
        uid: decoded.uid,
        email: decoded.email,
      };
    } catch {
      return reply.status(403).send({
        code: 'AUTH_INVALID_TOKEN',
        error: 'The provided token is invalid, expired, or revoked.',
      });
    }
  };
}
