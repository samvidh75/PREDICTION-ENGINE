import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import { UpstoxConfig } from "../../integrations/upstox/UpstoxConfig";
import { UpstoxTokenStore } from "../../integrations/upstox/UpstoxTokenStore";
import { UpstoxOAuthService } from "../../integrations/upstox/UpstoxOAuthService";
import { UpstoxSandboxClient } from "../../integrations/upstox/UpstoxSandboxClient";
import { UpstoxClient } from "../../integrations/upstox/UpstoxClient";
import { sanitizeErrorMessage } from "../../integrations/upstox/UpstoxErrors";

const STATE_TTL = 10 * 60 * 1000;
const pendingStates = new Map<string, number>();

function generateState(): string {
  return crypto.randomBytes(32).toString("hex");
}

function storeState(state: string): void {
  pendingStates.set(state, Date.now());
}

function validateState(state: string | undefined): boolean {
  if (!state) return false;
  const ts = pendingStates.get(state);
  if (!ts) return false;
  if (Date.now() - ts > STATE_TTL) {
    pendingStates.delete(state);
    return false;
  }
  pendingStates.delete(state);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [state, ts] of pendingStates) {
    if (now - ts > STATE_TTL) pendingStates.delete(state);
  }
}, 60_000);

const upstoxRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const config = UpstoxConfig.getInstance();
  const tokenStore = UpstoxTokenStore.getInstance();
  tokenStore.loadFromEnv();
  const oauthService = new UpstoxOAuthService(config, tokenStore);

  app.get("/api/providers/upstox/status", async (_request, reply) => {
    const summary = config.getSummary();
    const tokenStatus = tokenStore.getTokenStatus();
    const maskedInfo = tokenStore.getMaskedInfo();

    return reply.send({
      configured: summary.hasApiKey && summary.hasClientSecret,
      redirectConfigured: summary.hasRedirectUri,
      tokenPresent: tokenStatus.live.present,
      tokenState: tokenStatus.live.present ? "present" : "missing",
      tokenExpiry: tokenStatus.live.expiresAt ? new Date(tokenStatus.live.expiresAt).toISOString() : null,
      tokenMasked: maskedInfo.live,
      sandboxEnabled: summary.sandboxEnabled,
      sandboxTokenPresent: tokenStatus.sandbox.present,
      sandboxTokenMasked: maskedInfo.sandbox,
      marketDataEnabled: summary.marketDataEnabled,
      orderSandboxEnabled: summary.orderSandboxEnabled,
      apiKeyConfigured: summary.hasApiKey,
      clientSecretConfigured: summary.hasClientSecret,
      redirectUriConfigured: summary.hasRedirectUri,
    });
  });

  app.post("/api/providers/upstox/token/request", async (request, reply) => {
    const fallbackRedirect = `${request.protocol}://${request.hostname}/api/providers/upstox/token/callback`;
    const clientId = config.apiKey;
    const redirectUri = config.getRedirectUri() || fallbackRedirect;

    if (!clientId) {
      return reply.status(400).send({
        status: "error",
        message: "UPSTOX_API_KEY not configured. Cannot generate authorization URL.",
        authUrl: null,
        requestedAt: new Date().toISOString(),
      });
    }

    try {
      const state = generateState();
      storeState(state);
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        state,
      });
      const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?${params.toString()}`;
      return reply.send({
        status: "requested",
        message: "Authorization URL generated",
        authUrl,
        requestedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return reply.status(400).send({
        status: "error",
        message: sanitizeErrorMessage(err.message || "Cannot generate authorization URL"),
        authUrl: null,
        requestedAt: new Date().toISOString(),
      });
    }
  });

  async function handleCallback(request: any, reply: any): Promise<any> {
    const query = (request.query || {}) as Record<string, string | undefined>;
    const body = (request.body || {}) as Record<string, string | undefined>;
    const code = query.code || body.code;
    const error = query.error || body.error;
    const notifierSecret = config.notifierSecret;

    const providedSecret = query.secret || body.secret || request.headers?.["x-upstox-notifier-secret"];

    if (!validateState(query.state)) {
      return reply.status(401).send({
        status: "rejected",
        message: "OAuth state validation failed. Authorization request may have been tampered with.",
        receivedAt: new Date().toISOString(),
      });
    }

    if (notifierSecret && providedSecret !== notifierSecret) {
      return reply.status(401).send({
        status: "rejected",
        message: "Notifier secret validation failed.",
        receivedAt: new Date().toISOString(),
      });
    }

    if (error) {
      return reply.status(400).send({
        status: "rejected",
        message: `Authorization rejected: ${sanitizeErrorMessage(error)}`,
        receivedAt: new Date().toISOString(),
      });
    }

    if (!code) {
      if (!config.configured) {
        return reply.status(200).send({
          status: "received",
          message: "Authorization code received. Token exchange not possible — Upstox not configured.",
          receivedAt: new Date().toISOString(),
        });
      }
      return reply.status(400).send({
        status: "error",
        message: "Missing authorization code in callback",
        receivedAt: new Date().toISOString(),
      });
    }

    if (!config.configured) {
      return reply.status(200).send({
        status: "received",
        message: "Authorization code received. Token exchange not possible — Upstox not configured.",
        receivedAt: new Date().toISOString(),
      });
    }

    const result = await oauthService.exchangeCodeForToken(code);
    const httpStatus = result.status === "accepted" ? 200 : 400;
    return reply.status(httpStatus).send(result);
  }

  app.get("/api/providers/upstox/token/callback", async (request, reply) => {
    return handleCallback(request, reply);
  });

  app.post("/api/providers/upstox/token/callback", async (request, reply) => {
    return handleCallback(request, reply);
  });

  app.post("/api/providers/upstox/token/clear", async (request, reply) => {
    const body = (request.body || {}) as Record<string, string | undefined>;
    const mode = body.mode as 'live' | 'sandbox' | undefined;

    if (mode && mode !== 'live' && mode !== 'sandbox') {
      return reply.status(400).send({
        status: "error",
        message: "Invalid mode. Use 'live' or 'sandbox'.",
      });
    }

    tokenStore.clearToken(mode);
    return reply.send({
      status: "cleared",
      message: mode ? `Upstox ${mode} token cleared` : "Upstox tokens cleared",
      clearedAt: new Date().toISOString(),
    });
  });

  app.get("/api/providers/upstox/sandbox/status", async (_request, reply) => {
    const sandboxToken = tokenStore.getSandboxToken();
    const sandboxEnabled = config.getSandboxEnabled();

    let sandboxReachable = false;
    if (sandboxEnabled && sandboxToken) {
      try {
        const sandboxClient = new UpstoxSandboxClient(config, tokenStore);
        const health = await sandboxClient.checkHealth();
        sandboxReachable = health.status === 'healthy';
      } catch {
        sandboxReachable = false;
      }
    }

    return reply.send({
      sandboxEnabled,
      sandboxTokenPresent: !!sandboxToken,
      sandboxReachable,
      orderSandboxEnabled: config.orderSandboxEnabled,
      checkedAt: new Date().toISOString(),
    });
  });

  app.get("/api/providers/upstox/profile", async (_request, reply) => {
    try {
      const client = new UpstoxClient(config, tokenStore);
      const profile = await client.getUserProfile();
      return reply.send({
        status: "success",
        data: {
          userId: profile.userId,
          userName: profile.userName,
          broker: profile.broker,
        },
      });
    } catch (err: any) {
      return reply.status(401).send({
        status: "error",
        message: sanitizeErrorMessage(err.message || "Profile fetch failed"),
      });
    }
  });

  app.get("/api/providers/upstox/holdings", async (_request, reply) => {
    try {
      const client = new UpstoxClient(config, tokenStore);
      const holdings = await client.getHoldings();
      return reply.send({ status: "success", data: holdings });
    } catch (err: any) {
      return reply.status(401).send({
        status: "error",
        message: sanitizeErrorMessage(err.message || "Holdings fetch failed"),
      });
    }
  });

  app.get("/api/providers/upstox/positions", async (_request, reply) => {
    try {
      const client = new UpstoxClient(config, tokenStore);
      const positions = await client.getPositions();
      return reply.send({ status: "success", data: positions });
    } catch (err: any) {
      return reply.status(401).send({
        status: "error",
        message: sanitizeErrorMessage(err.message || "Positions fetch failed"),
      });
    }
  });

  app.get("/api/providers/upstox/funds", async (_request, reply) => {
    try {
      const client = new UpstoxClient(config, tokenStore);
      const funds = await client.getFunds();
      return reply.send({ status: "success", data: funds });
    } catch (err: any) {
      return reply.status(401).send({
        status: "error",
        message: sanitizeErrorMessage(err.message || "Funds fetch failed"),
      });
    }
  });
};

export default upstoxRoutes;
