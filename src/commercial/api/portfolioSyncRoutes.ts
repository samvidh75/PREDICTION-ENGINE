// src/commercial/api/portfolioSyncRoutes.ts
// Phase 36 — Multi-Broker Portfolio Sync API routes.
// Fetches holdings from all connected brokers and serves a unified view.

import type { FastifyInstance } from "fastify";
import { dbAdapter } from "../../db/DatabaseAdapter";

interface BrokerConnection {
  id: string;
  broker: string;
  access_token_enc: string;
  broker_user_id: string | null;
}

interface UnifiedHolding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentValue: number;
  pnl: number;
  broker: string;
}

interface UnifiedPortfolio {
  userId: string;
  brokers: { broker: string; status: string; holdingsCount: number }[];
  holdings: UnifiedHolding[];
  totals: {
    totalValue: number;
    totalInvested: number;
    totalPnl: number;
  };
  lastSynced: string | null;
}

/**
 * AES-256-GCM decryption of broker tokens stored in the database.
 */
async function decryptBrokerToken(encryptedHex: string): Promise<string> {
  const encryptionKey = process.env.BROKER_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("BROKER_ENCRYPTION_KEY not set");

  const { createHash, createDecipheriv } = await import("crypto");
  const key = createHash("sha256").update(encryptionKey).digest();

  const parts = encryptedHex.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

// ── Broker API fetchers (server-side, using fetch directly) ──────────

async function fetchUpstoxHoldings(accessToken: string): Promise<UnifiedHolding[]> {
  const res = await fetch("https://api.upstox.com/v2/portfolio/long-term-holdings", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Upstox API ${res.status}`);
  const data = (await res.json()) as { data?: any[] };
  return (data.data || []).map((h: any) => ({
    symbol: h.tradingsymbol?.replace(/-/g, "") || h.isin || "UNKNOWN",
    quantity: h.quantity || 0,
    avgPrice: h.average_price || 0,
    currentValue: (h.last_price || 0) * (h.quantity || 0),
    pnl: h.pnl || 0,
    broker: "upstox",
  }));
}

async function fetchZerodhaHoldings(apiKey: string, accessToken: string): Promise<UnifiedHolding[]> {
  const res = await fetch("https://api.kite.trade/portfolio/holdings", {
    headers: {
      "X-Kite-Version": "3",
      Authorization: `token ${apiKey}:${accessToken}`,
    },
  });
  if (!res.ok) throw new Error(`Zerodha API ${res.status}`);
  const data = (await res.json()) as { data?: any[] };
  return (data.data || []).map((h: any) => ({
    symbol: h.tradingsymbol?.replace(/-/g, "") || "UNKNOWN",
    quantity: h.quantity || 0,
    avgPrice: h.average_price || 0,
    currentValue: (h.last_price || 0) * (h.quantity || 0),
    pnl: h.pnl || 0,
    broker: "zerodha",
  }));
}

async function fetchBrokerHoldings(
  broker: string,
  accessToken: string,
  brokerUserId: string | null,
): Promise<UnifiedHolding[]> {
  switch (broker) {
    case "upstox":
      return fetchUpstoxHoldings(accessToken);
    case "zerodha": {
      // For Zerodha, the access token is stored as "apiKey:token"
      const parts = accessToken.match(/^([^:]+):(.+)$/);
      return fetchZerodhaHoldings(parts?.[1] || accessToken, parts?.[2] || accessToken);
    }
    default:
      throw new Error(`Unsupported broker: ${broker}`);
  }
}

/**
 * Attempt to refresh an expired broker token.
 * Returns the new access token if successful, or throws.
 */
async function tryRefreshBrokerToken(
  connId: string,
  broker: string,
  refreshTokenEnc: string | null,
  brokerUserId: string | null,
): Promise<string | null> {
  if (!refreshTokenEnc) return null;

  try {
    const refreshToken = await decryptBrokerToken(refreshTokenEnc);
    let newAccessToken: string | null = null;

    // Broker-specific refresh logic
    if (broker === "upstox") {
      const res = await fetch("https://api.upstox.com/v2/login/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        newAccessToken = data.access_token || null;
      }
    }
    // Zerodha tokens cannot be refreshed — needs re-login

    if (newAccessToken) {
      // Update stored token
      const { createHash, createCipheriv, randomBytes } = await import("crypto");
      const encryptionKey = process.env.BROKER_ENCRYPTION_KEY;
      if (!encryptionKey) return null;

      const key = createHash("sha256").update(encryptionKey).digest();
      const iv = randomBytes(16);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(newAccessToken, "utf-8"), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const encToken = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;

      await dbAdapter.query(
        `UPDATE broker_connections SET access_token_enc = $1, updated_at = NOW()
         WHERE id = $2`,
        [encToken, connId],
      );
      return newAccessToken;
    }

    return null;
  } catch {
    return null;
  }
}

// ── Routes ───────────────────────────────────────────────────────────

export async function registerPortfolioSyncRoutes(server: FastifyInstance): Promise<void> {
  // POST /api/v1/portfolio/sync/:userId — trigger sync across all connected brokers
  server.post("/api/v1/portfolio/sync/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    if (!userId) return reply.status(400).send({ error: "userId required" });

    try {
      // Get all active broker connections
      const connResult = await dbAdapter.query(
        `SELECT id, broker, access_token_enc, broker_user_id
         FROM broker_connections
         WHERE user_id = $1 AND status = 'active'`,
        [userId],
      );

      const connections = connResult.rows as BrokerConnection[];
      if (connections.length === 0) {
        return reply.send({ userId, synced: false, message: "No active broker connections found" });
      }

      const results: { broker: string; status: string; holdings: UnifiedHolding[] }[] = [];

      for (const conn of connections) {
        try {
          let accessToken = await decryptBrokerToken(conn.access_token_enc);
          let holdings: UnifiedHolding[];

          try {
            holdings = await fetchBrokerHoldings(conn.broker, accessToken, conn.broker_user_id);
          } catch (fetchErr: any) {
            // Auto-refresh on 401 / token expired
            if (fetchErr.message?.includes("expired") || fetchErr.message?.includes("401")) {
              const refreshed = await tryRefreshBrokerToken(
                conn.id, conn.broker, (conn as any).refresh_token_enc || null, conn.broker_user_id,
              );
              if (refreshed) {
                accessToken = refreshed;
                holdings = await fetchBrokerHoldings(conn.broker, accessToken, conn.broker_user_id);
              } else {
                throw fetchErr;
              }
            } else {
              throw fetchErr;
            }
          }

          // Store snapshot
          const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
          const totalInvested = holdings.reduce((s, h) => s + h.avgPrice * h.quantity, 0);
          const totalPnl = holdings.reduce((s, h) => s + h.pnl, 0);

          await dbAdapter.query(
            `IPSERT INTO user_portfolio_snapshots
               (user_id, broker, total_value, total_invested, total_pnl,
                holdings_count, holdings_json, status, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'success', datetime('now'))`,
            [
              userId, conn.broker, totalValue, totalInvested, totalPnl,
              holdings.length, JSON.stringify(holdings),
            ],
          );

          results.push({ broker: conn.broker, status: "success", holdings });
        } catch (err) {
          // Store failed snapshot
          await dbAdapter.query(
            `IPSERT INTO user_portfolio_snapshots
               (user_id, broker, total_value, total_invested, total_pnl,
                holdings_count, holdings_json, status, error_message, synced_at)
             VALUES ($1, $2, 0, 0, 0, 0, '[]', 'failed', $3, datetime('now'))`,
            [userId, conn.broker, err instanceof Error ? err.message : String(err)],
          );

          results.push({ broker: conn.broker, status: "failed", holdings: [] });
        }
      }

      return reply.send({
        userId,
        synced: true,
        brokers: results.map((r) => ({ broker: r.broker, status: r.status, holdingsCount: r.holdings.length })),
      });
    } catch (err: any) {
      return reply.status(500).send({ error: "Portfolio sync failed: " + (err.message || String(err)) });
    }
  });

  // GET /api/v1/portfolio/unified/:userId — return latest aggregated portfolio
  server.get("/api/v1/portfolio/unified/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    if (!userId) return reply.status(400).send({ error: "userId required" });

    try {
      // Using tenant-context query — RLS policy enforces user_id isolation
      const snapResult = await dbAdapter.queryWithTenantContext(
        `SELECT DISTINCT ON (broker)
           broker, total_value, total_invested, total_pnl,
           holdings_count, holdings_json, status, error_message, synced_at
         FROM user_portfolio_snapshots
         ORDER BY broker, synced_at DESC`,
        [],
        userId,
      );

      const snapshots = snapResult.rows;
      const brokers: { broker: string; status: string; holdingsCount: number }[] = [];
      const holdings: UnifiedHolding[] = [];
      let totalValue = 0;
      let totalInvested = 0;
      let totalPnl = 0;
      let lastSynced: string | null = null;

      for (const snap of snapshots) {
        brokers.push({
          broker: snap.broker,
          status: snap.status,
          holdingsCount: snap.holdings_count,
        });

        totalValue += parseFloat(snap.total_value) || 0;
        totalInvested += parseFloat(snap.total_invested) || 0;
        totalPnl += parseFloat(snap.total_pnl) || 0;

        if (snap.synced_at && (!lastSynced || snap.synced_at > lastSynced)) {
          lastSynced = snap.synced_at;
        }

        try {
          const parsed = JSON.parse(snap.holdings_json || "[]") as UnifiedHolding[];
          holdings.push(...parsed);
        } catch {
          // skip malformed JSON
        }
      }

      return reply.send({
        userId,
        brokers,
        holdings,
        totals: { totalValue, totalInvested, totalPnl },
        lastSynced,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: "Failed to retrieve unified portfolio" });
    }
  });
}
