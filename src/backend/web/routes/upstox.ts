/**
 * Upstox provider routes — token management and status.
 *
 * Routes:
 *   GET  /api/providers/upstox/status          — token presence, expiry, health (no secrets)
 *   POST /api/providers/upstox/token/request    — request token approval (7AM IST)
 *   GET/POST /api/providers/upstox/token/callback — OAuth callback handler (masks token)
 *
 * Security:
 *   - Never returns the raw access token.
 *   - Never logs the raw access token or client secret.
 *   - Sanitizes all provider errors before returning/logging.
 *   - Optional UPSTOX_NOTIFIER_SECRET validates callback origin.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";

interface TokenStatusResponse {
  configured: boolean;
  tokenPresent: boolean;
  tokenExpiry: string | null;
  tokenState: string;
  lastVerified: string | null;
  apiKeyConfigured: boolean;
  clientSecretConfigured: boolean;
  redirectUriConfigured: boolean;
  healthStatus: string;
}

interface TokenRequestResponse {
  status: string;
  message: string;
  authUrl: string | null;
  requestedAt: string;
}

interface TokenCallbackResponse {
  status: string;
  message: string;
  receivedAt: string;
}

/** In-memory token holder for the current process. Does NOT persist across restarts. */
let currentAccessToken: string | null = null;
let tokenReceivedAt: string | null = null;

function trimmedEnv(name: string): string | undefined {
  const value = process.env[name];
  return value ? value.trim() : undefined;
}

function sanitizeError(message: string): string {
  return message
    .replace(/(token|access_token|refresh_token|code|client_secret|api_key|apikey)=([^&\s]+)/gi, "$1=[REDACTED]")
    .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/authorization:\s*[^\s]+/gi, "authorization:[REDACTED]");
}

function generateState(): string {
  return crypto.randomBytes(32).toString("hex");
}

const upstoxRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {

  app.get("/api/providers/upstox/status", async (_request, reply) => {
    const accessToken = currentAccessToken ?? trimmedEnv("UPSTOX_ACCESS_TOKEN");
    const apiKey = trimmedEnv("UPSTOX_API_KEY");
    const clientSecret = trimmedEnv("UPSTOX_CLIENT_SECRET");
    const redirectUri = trimmedEnv("UPSTOX_REDIRECT_URI");

    const response: TokenStatusResponse = {
      configured: !!(apiKey && clientSecret),
      tokenPresent: !!accessToken,
      tokenExpiry: null,
      tokenState: accessToken ? "present" : "missing",
      lastVerified: tokenReceivedAt,
      apiKeyConfigured: !!apiKey,
      clientSecretConfigured: !!clientSecret,
      redirectUriConfigured: !!redirectUri,
      healthStatus: accessToken ? "token_available" : "token_missing",
    };

    return reply.send(response);
  });

  app.post("/api/providers/upstox/token/request", async (request, reply) => {
    const clientId = trimmedEnv("UPSTOX_API_KEY");
    const redirectUri = trimmedEnv("UPSTOX_REDIRECT_URI")
      || `${request.protocol}://${request.hostname}/api/providers/upstox/token/callback`;

    if (!clientId) {
      return reply.status(400).send({
        status: "error",
        message: "UPSTOX_API_KEY not configured. Cannot generate authorization URL.",
        authUrl: null,
        requestedAt: new Date().toISOString(),
      });
    }

    const state = generateState();

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
    } as TokenRequestResponse);
  });

  async function handleCallback(
    request: any,
    reply: any,
  ): Promise<any> {
    const query = (request.query || {}) as Record<string, string | undefined>;
    const body = (request.body || {}) as Record<string, string | undefined>;
    const code = query.code || body.code;
    const state = query.state || body.state;
    const error = query.error || body.error;
    const notifierSecret = trimmedEnv("UPSTOX_NOTIFIER_SECRET");

    // Validate notifier signature if configured
    const providedSecret = query.secret || body.secret || request.headers["x-upstox-notifier-secret"];
    if (notifierSecret && providedSecret !== notifierSecret) {
      request.log?.warn?.("Upstox callback rejected: notifier secret mismatch");
      return reply.status(401).send({
        status: "rejected",
        message: "Notifier secret validation failed.",
        receivedAt: new Date().toISOString(),
      } as TokenCallbackResponse);
    }

    if (error) {
      return reply.status(400).send({
        status: "rejected",
        message: `Upstox authorization rejected: ${sanitizeError(error)}`,
        receivedAt: new Date().toISOString(),
      } as TokenCallbackResponse);
    }

    if (!code) {
      return reply.status(400).send({
        status: "error",
        message: "Missing authorization code in callback.",
        receivedAt: new Date().toISOString(),
      } as TokenCallbackResponse);
    }

    // Optional: exchange code for access token
    const clientId = trimmedEnv("UPSTOX_API_KEY");
    const clientSecret = trimmedEnv("UPSTOX_CLIENT_SECRET");
    const redirectUri = trimmedEnv("UPSTOX_REDIRECT_URI")
      || `${request.protocol}://${request.hostname}/api/providers/upstox/token/callback`;

    let exchangeStatus = "received";
    let exchangeMessage = "Authorization code received. Token exchange not attempted (client credentials unavailable).";

    if (clientId && clientSecret) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        const response = await fetch("https://api.upstox.com/v2/login/authorization/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }).toString(),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await response.json().catch(() => ({}));
        if (response.ok && data.access_token) {
          currentAccessToken = data.access_token;
          tokenReceivedAt = new Date().toISOString();
          exchangeStatus = "accepted";
          exchangeMessage = "Access token received and accepted. Token value is not exposed.";
        } else {
          exchangeStatus = "rejected";
          exchangeMessage = `Token exchange failed: ${sanitizeError(data.message || data.error || `HTTP ${response.status}`)}`;
          request.log?.warn?.({ status: response.status, error: data.error }, "Upstox token exchange failed");
        }
      } catch (err: any) {
        exchangeStatus = "rejected";
        exchangeMessage = `Token exchange error: ${sanitizeError(err.message || String(err))}`;
        request.log?.error?.(err, "Upstox token exchange exception");
      }
    }

    return reply.send({
      status: exchangeStatus,
      message: exchangeMessage,
      receivedAt: new Date().toISOString(),
    } as TokenCallbackResponse);
  }

  app.get("/api/providers/upstox/token/callback", async (request, reply) => {
    return handleCallback(request, reply);
  });

  app.post("/api/providers/upstox/token/callback", async (request, reply) => {
    return handleCallback(request, reply);
  });
};

export default upstoxRoutes;
