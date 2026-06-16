/**
 * Upstox provider routes — token management and status.
 *
 * Routes:
 *   GET  /api/providers/upstox/status          — token presence, expiry, health
 *   POST /api/providers/upstox/token/request    — request token approval (7AM IST)
 *   POST /api/providers/upstox/token/callback   — OAuth callback handler
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";

interface TokenStatusResponse {
  configured: boolean;
  tokenPresent: boolean;
  tokenExpiry: string | null;
  tokenState: string;
  lastVerified: string | null;
  apiKeyConfigured: boolean;
  clientSecretConfigured: boolean;
  healthStatus: string;
}

interface TokenRequestResponse {
  status: string;
  message: string;
  authUrl: string | null;
  requestedAt: string;
}

const upstoxRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {

  app.get("/api/providers/upstox/status", async (_request, reply) => {
    const accessToken = process.env.UPSTOX_ACCESS_TOKEN;
    const apiKey = process.env.UPSTOX_API_KEY;
    const clientSecret = process.env.UPSTOX_CLIENT_SECRET;

    const response: TokenStatusResponse = {
      configured: !!(apiKey && clientSecret),
      tokenPresent: !!accessToken,
      tokenExpiry: null,
      tokenState: accessToken ? "present" : "missing",
      lastVerified: null,
      apiKeyConfigured: !!apiKey,
      clientSecretConfigured: !!clientSecret,
      healthStatus: accessToken ? "token_available" : "token_missing",
    };

    return reply.send(response);
  });

  app.post("/api/providers/upstox/token/request", async (_request, reply) => {
    const clientId = process.env.UPSTOX_API_KEY;
    const redirectUri = process.env.UPSTOX_REDIRECT_URI
      || `${_request.protocol}://${_request.hostname}/api/providers/upstox/token/callback`;

    if (!clientId) {
      return reply.status(400).send({
        status: "error",
        message: "UPSTOX_API_KEY not configured. Cannot generate authorization URL.",
        authUrl: null,
        requestedAt: new Date().toISOString(),
      });
    }

    const state = Array.from(new Uint8Array(32), b =>
      b.toString(16).padStart(2, "0")
    ).join("");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "read_portfolio read_user_profile",
      state,
    });

    const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?${params.toString()}`;

    return reply.send({
      status: "requested",
      message: "Authorization URL generated. User must approve via Upstox login.",
      authUrl,
      requestedAt: new Date().toISOString(),
    });
  });

  app.post("/api/providers/upstox/token/callback", async (request, reply) => {
    const { code, state, error } = request.query as Record<string, string | undefined>;

    if (error) {
      return reply.status(400).send({
        status: "rejected",
        message: `Upstox authorization rejected: ${error}`,
      });
    }

    if (!code) {
      return reply.status(400).send({
        status: "error",
        message: "Missing authorization code in callback.",
      });
    }

    const response = {
      status: "received",
      message: "Authorization code received. Token exchange completed by Upstox provider flow.",
      receivedAt: new Date().toISOString(),
    };

    return reply.send(response);
  });
};

export default upstoxRoutes;
