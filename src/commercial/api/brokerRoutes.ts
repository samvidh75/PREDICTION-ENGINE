import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.BROKER_ENCRYPTION_KEY;
  if (!raw) throw new Error("BROKER_ENCRYPTION_KEY not set");
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted payload");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let plain = decipher.update(encrypted, "hex", "utf8");
  plain += decipher.final("utf8");
  return plain;
}

const BROKER_OAUTH_URLS: Record<string, string> = {
  upstox: "https://api.upstox.com/v2/login/authorization/dialog",
};

export async function registerBrokerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/api/v1/broker/auth-url", async (req: FastifyRequest<{
    Body: { broker: string; redirectUri: string };
  }>, reply: FastifyReply) => {
    const { broker, redirectUri } = req.body;
    const uid = (req as any).uid ?? "anonymous";

    const clientId = process.env.VITE_UPSTOX_CLIENT_ID;
    const state = crypto.randomBytes(16).toString("hex");

    const baseUrl = BROKER_OAUTH_URLS[broker];
    if (!baseUrl) {
      return reply.status(400).send({ success: false, error: `Unsupported broker: ${broker}` });
    }

    const params = new URLSearchParams({
      client_id: clientId ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });

    return reply.send({
      success: true,
      authUrl: `${baseUrl}?${params}`,
      state,
    });
  });

  fastify.post("/api/v1/broker/token", async (req: FastifyRequest<{
    Body: { broker: string; code: string; redirectUri: string };
  }>, reply: FastifyReply) => {
    const { broker, code, redirectUri } = req.body;
    const uid = (req as any).uid ?? "anonymous";

    if (broker !== "upstox") {
      return reply.status(400).send({ success: false, error: `Unsupported broker: ${broker}` });
    }

    try {
      const tokenRes = await fetch("https://api.upstox.com/v2/login/authorization/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          code,
          client_id: process.env.VITE_UPSTOX_CLIENT_ID ?? "",
          client_secret: process.env.UPSTOX_CLIENT_SECRET ?? "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        return reply.status(502).send({ success: false, error: `Token exchange failed: ${errText.slice(0, 200)}` });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in ?? 86400;

      const { dbAdapter } = await import("../../db/DatabaseAdapter");
      const encryptedAccess = encrypt(accessToken);
      const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

      const existing = await dbAdapter.query(
        "SELECT id FROM broker_connections WHERE user_id = $1 AND broker = $2 AND status = 'active'",
        [uid, broker],
      );

      if (existing.rows?.length > 0) {
        await dbAdapter.query(
          `UPDATE broker_connections SET
             access_token_enc = $1, refresh_token_enc = $2,
             expires_at = NOW() + make_interval(secs => $3),
             updated_at = NOW()
           WHERE id = $4`,
          [encryptedAccess, encryptedRefresh, expiresIn, existing.rows[0].id],
        );
      } else {
        await dbAdapter.query(
          `INSERT INTO broker_connections
             (user_id, broker, access_token_enc, refresh_token_enc, expires_at)
           VALUES ($1, $2, $3, $4, NOW() + make_interval(secs => $5))`,
          [uid, broker, encryptedAccess, encryptedRefresh, expiresIn],
        );
      }

      return reply.send({ success: true, connected: true });
    } catch (err) {
      req.log.error({ err }, "Broker token exchange failed");
      return reply.status(500).send({ success: false, error: "Token exchange failed" });
    }
  });

  fastify.get("/api/v1/broker/connections", async (req: FastifyRequest, reply: FastifyReply) => {
    const uid = (req as any).uid ?? "anonymous";

    try {
      const { dbAdapter } = await import("../../db/DatabaseAdapter");

      // Using tenant-context query — RLS policy enforces user_id isolation
      const result = uid !== "anonymous"
        ? await dbAdapter.queryWithTenantContext(
            `SELECT id, broker, label, status, broker_user_id,
                    expires_at, created_at, updated_at
             FROM broker_connections
             ORDER BY created_at DESC`,
            [],
            uid,
          )
        : await dbAdapter.query(
            `SELECT id, broker, label, status, broker_user_id,
                    expires_at, created_at, updated_at
             FROM broker_connections
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [uid],
          );

      return reply.send({ success: true, connections: result.rows ?? [] });
    } catch (err) {
      req.log.error({ err }, "Failed to list broker connections");
      return reply.status(500).send({ success: false, error: "Failed to list connections" });
    }
  });

  fastify.delete("/api/v1/broker/connections/:id", async (req: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const uid = (req as any).uid ?? "anonymous";
    const { id } = req.params;

    try {
      const { dbAdapter } = await import("../../db/DatabaseAdapter");

      const result = await dbAdapter.query(
        "SELECT access_token_enc, broker FROM broker_connections WHERE id = $1 AND user_id = $2",
        [id, uid],
      );

      if (!result.rows?.length) {
        return reply.status(404).send({ success: false, error: "Connection not found" });
      }

      const row = result.rows[0];
      const accessToken = decrypt(row.access_token_enc);

      try {
        await fetch("https://api.upstox.com/v2/login/revoke", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
      } catch {
        // Revocation is best-effort
      }

      await dbAdapter.query(
        "UPDATE broker_connections SET status = 'revoked', updated_at = NOW() WHERE id = $1",
        [id],
      );

      return reply.send({ success: true, disconnected: true });
    } catch (err) {
      req.log.error({ err }, "Failed to disconnect broker");
      return reply.status(500).send({ success: false, error: "Failed to disconnect" });
    }
  });

  fastify.post("/api/v1/broker/trade", async (req: FastifyRequest<{
    Body: {
      connectionId: string;
      symbol: string;
      exchange: string;
      side: "BUY" | "SELL";
      quantity: number;
      orderType: "MARKET" | "LIMIT";
      price?: number;
    };
  }>, reply: FastifyReply) => {
    const uid = (req as any).uid ?? "anonymous";
    const { connectionId, symbol, exchange, side, quantity, orderType, price } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return reply.status(400).send({ success: false, error: "Invalid order parameters" });
    }

    try {
      const { dbAdapter } = await import("../../db/DatabaseAdapter");

      const result = await dbAdapter.query(
        "SELECT access_token_enc, broker FROM broker_connections WHERE id = $1 AND user_id = $2 AND status = 'active'",
        [connectionId, uid],
      );

      if (!result.rows?.length) {
        return reply.status(404).send({ success: false, error: "Active connection not found" });
      }

      const row = result.rows[0];
      const accessToken = decrypt(row.access_token_enc);
      const broker = row.broker as string;
      let orderResult: Record<string, unknown>;

      if (broker === "upstox") {
        const orderPayload: Record<string, unknown> = {
          instrument_key: `${exchange}|${symbol}`,
          quantity,
          product: "D",
          validity: "DAY",
          side: side === "BUY" ? "buy" : "sell",
          order_type: orderType === "LIMIT" ? "limit" : "market",
        };
        if (orderType === "LIMIT" && price) {
          orderPayload.price = price;
        }
        const res = await fetch("https://api.upstox.com/v2/order/place", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(orderPayload),
        });
        orderResult = await res.json();
        if (!res.ok) {
          return reply.status(502).send({
            success: false,
            error: (orderResult as any)?.errors?.[0]?.message ?? "Upstox order failed",
          });
        }
      } else if (broker === "zerodha") {
        const apiKey = process.env.ZERODHA_API_KEY || process.env.VITE_ZERODHA_API_KEY || "";
        const res = await fetch("https://api.kite.trade/orders/regular", {
          method: "POST",
          headers: {
            Authorization: `token ${apiKey}:${accessToken}`,
            "X-Kite-Version": "3",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            tradingsymbol: symbol,
            exchange: exchange || "NSE",
            transaction_type: side === "BUY" ? "BUY" : "SELL",
            quantity: String(quantity),
            price: orderType === "LIMIT" && price ? String(price) : "0",
            order_type: orderType === "LIMIT" ? "LIMIT" : "MARKET",
            product: "CNC",
            validity: "DAY",
          }).toString(),
        });
        orderResult = await res.json();
        if (!res.ok) {
          return reply.status(502).send({
            success: false,
            error: (orderResult as any)?.message ?? "Zerodha order failed",
          });
        }
      } else if (broker === "angel_one") {
        const res = await fetch("https://apiconnect.angelone.in/smart-api/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tradingsymbol: symbol,
            symboltoken: symbol,
            exchange: exchange || "NSE",
            transactiontype: side === "BUY" ? "BUY" : "SELL",
            quantity: String(quantity),
            price: orderType === "LIMIT" && price ? String(price) : "0",
            order_type: orderType === "LIMIT" ? "LIMIT" : "MARKET",
            product: "DELIVERY",
            duration: "DAY",
          }),
        });
        orderResult = await res.json();
        if (!res.ok) {
          return reply.status(502).send({
            success: false,
            error: (orderResult as any)?.message ?? "Angel One order failed",
          });
        }
      } else {
        return reply.status(400).send({ success: false, error: `Unsupported broker: ${broker}` });
      }

      return reply.send({
        success: true,
        order: orderResult,
        broker,
      });
    } catch (err) {
      req.log.error({ err }, "Trade placement failed");
      return reply.status(500).send({ success: false, error: "Trade placement failed" });
    }
  });
}
