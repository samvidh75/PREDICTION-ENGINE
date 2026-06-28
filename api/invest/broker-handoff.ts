import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── Broker Handoff Endpoint ──────────────────────────────────────────────────
// POST /api/invest/broker-handoff
// Body: { broker: "upstox" | "zerodha", action: "auth_url", redirectUri: string }
// Returns: { authUrl, state, broker }
//
// GET /api/invest/broker-handoff?broker=upstox&status=callback&code=xxx&state=yyy
// Returns: { success, broker, message }

const UPSTOX_API_BASE = "https://api.upstox.com/v2";

function generateState(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── GET: OAuth callback processing ──────────────────────────────
  if (req.method === "GET") {
    const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
    const state = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;
    const broker = String(
      Array.isArray(req.query.broker) ? req.query.broker[0] : req.query.broker || "upstox"
    ).toLowerCase();

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: "code and state required for OAuth callback",
      });
    }

    return res.status(200).json({
      success: true,
      broker,
      message: "OAuth callback received. Exchange code for token via POST /api/invest/broker-handoff with action=exchange.",
      code,
      state,
    });
  }

  // ── POST: Initiate broker handoff or exchange code ──────────────
  if (req.method === "POST") {
    const { broker, action, redirectUri, code, codeVerifier } = req.body as {
      broker?: string;
      action?: string;
      redirectUri?: string;
      code?: string;
      codeVerifier?: string;
    };

    const brokerName = (broker || "upstox").toLowerCase();

    // ── Initiate OAuth flow ──────────────────────────────────────
    if (action === "auth_url" || !action) {
      if (!redirectUri) {
        return res.status(400).json({ error: "redirectUri required for auth_url action" });
      }

      if (brokerName === "upstox") {
        const clientId = process.env.UPSTOX_CLIENT_ID || "";
        if (!clientId) {
          return res.status(503).json({
            success: false,
            error: "Upstox broker not configured",
            broker: brokerName,
          });
        }

        const state = generateState();
        const authUrl = `https://api.upstox.com/v2/login/authorization/dialog` +
          `?client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&state=${encodeURIComponent(state)}`;

        return res.status(200).json({
          success: true,
          broker: brokerName,
          authUrl,
          state,
          instructions: "Redirect user to authUrl. After authorization, they'll return to redirectUri with code & state.",
        });
      }

      if (brokerName === "zerodha") {
        return res.status(501).json({
          success: false,
          error: "Zerodha broker integration coming soon",
          broker: brokerName,
        });
      }

      return res.status(400).json({ error: `Unknown broker: ${brokerName}` });
    }

    // ── Exchange auth code for access token ──────────────────────
    if (action === "exchange") {
      if (!code) {
        return res.status(400).json({ error: "code required for exchange action" });
      }

      if (brokerName === "upstox") {
        const clientId = process.env.UPSTOX_CLIENT_ID || "";
        const clientSecret = process.env.UPSTOX_CLIENT_SECRET || "";

        if (!clientId || !clientSecret) {
          return res.status(503).json({
            success: false,
            error: "Upstox credentials not configured",
          });
        }

        try {
          const tokenRes = await fetch(`${UPSTOX_API_BASE}/login/authorization/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json",
            },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri || "",
              grant_type: "authorization_code",
              ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
            }).toString(),
            signal: AbortSignal.timeout(10_000),
          });

          const data = await tokenRes.json();
          if (!tokenRes.ok) {
            return res.status(502).json({
              success: false,
              error: data?.errors?.[0]?.message || data?.message || "Token exchange failed",
            });
          }

          return res.status(200).json({
            success: true,
            broker: brokerName,
            accessToken: data.access_token,
            tokenType: data.token_type || "Bearer",
            expiresIn: data.expires_in,
            message: "Authorization successful. Use accessToken for broker API calls.",
          });
        } catch (err) {
          return res.status(502).json({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
