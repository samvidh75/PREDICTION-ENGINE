/**
 * authMiddleware — Shared Firebase auth preHandler for Fastify routes.
 *
 * Consolidates the previously duplicated requireAuth functions in:
 *   - render/apiRouter.ts
 *   - commercial/api/checkoutRoutes.ts
 *   - commercial/api/billingRoutes.ts
 *
 * Usage:
 *   import { requireAuth } from "../services/auth/authMiddleware.js";
 *   fastify.get("/protected", { preHandler: [requireAuth] }, handler);
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyFirebaseToken } from "../../config/firebaseAdmin.js";

/**
 * Firebase auth preHandler — verifies Bearer ID token via Admin SDK.
 * Blocks unauthenticated requests in production. In development,
 * logs a warning and sets uid to null so local dev can proceed.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = req.headers?.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      req.log.warn({ url: req.url }, "Unauthenticated — no Bearer token");
      if (process.env.NODE_ENV === "production") {
        return reply.status(401).send({ error: "Authentication required" });
      }
      (req as any).uid = null;
      return;
    }
    const token = auth.slice(7);
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      req.log.warn({ url: req.url }, "Invalid Firebase token");
      if (process.env.NODE_ENV === "production") {
        return reply.status(401).send({ error: "Authentication required" });
      }
      (req as any).uid = null;
      return;
    }
    (req as any).uid = decoded.uid;
  } catch (err) {
    req.log.warn({ url: req.url, err }, "Firebase token verification failed");
    if (process.env.NODE_ENV === "production") {
      return reply.status(401).send({ error: "Authentication required" });
    }
    (req as any).uid = null;
  }
}

/** Convenience helper: returns the authenticated uid or throws 401. */
export function getUid(req: FastifyRequest): string {
  const uid = (req as any).uid;
  if (!uid) {
    throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  }
  return uid;
}
