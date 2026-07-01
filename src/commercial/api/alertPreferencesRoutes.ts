// src/commercial/api/alertPreferencesRoutes.ts
// Phase 32 — Alert Preferences API routes for managing user notification settings.
// Supports SMS, Email, and Telegram channels with granular alert type toggles.

import type { FastifyInstance } from "fastify";
import { dbAdapter } from "../../db/DatabaseAdapter";

interface AlertPreferences {
  user_id: string;
  sms_enabled: boolean;
  email_enabled: boolean;
  telegram_enabled: boolean;
  phone_number: string | null;
  email_address: string | null;
  telegram_chat_id: string | null;
  breakout_alerts: boolean;
  volume_spike_alerts: boolean;
  trend_change_alerts: boolean;
  earnings_alerts: boolean;
  price_target_alerts: boolean;
  frequency: "real_time" | "daily_digest" | "weekly_summary";
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

/**
 * Register alert preferences routes on the Fastify server.
 */
export async function registerAlertPreferencesRoutes(server: FastifyInstance): Promise<void> {
  // ── GET /api/alert-preferences/:userId ──────────────────────
  // Fetch alert preferences for a user
  server.get("/api/alert-preferences/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    if (!userId || typeof userId !== "string") {
      return reply.status(400).send({ error: "userId param required" });
    }

    try {
      const result = await dbAdapter.query(
        `SELECT * FROM user_alert_preferences WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        // Return default preferences for new users
        const defaults: AlertPreferences = {
          user_id: userId,
          sms_enabled: false,
          email_enabled: false,
          telegram_enabled: false,
          phone_number: null,
          email_address: null,
          telegram_chat_id: null,
          breakout_alerts: true,
          volume_spike_alerts: true,
          trend_change_alerts: false,
          earnings_alerts: false,
          price_target_alerts: false,
          frequency: "real_time",
          quiet_hours_start: null,
          quiet_hours_end: null,
        };
        return defaults;
      }

      const row = result.rows[0];
      const prefs: AlertPreferences = {
        user_id: row.user_id,
        sms_enabled: Boolean(row.sms_enabled),
        email_enabled: Boolean(row.email_enabled),
        telegram_enabled: Boolean(row.telegram_enabled),
        phone_number: row.phone_number,
        email_address: row.email_address,
        telegram_chat_id: row.telegram_chat_id,
        breakout_alerts: Boolean(row.breakout_alerts),
        volume_spike_alerts: Boolean(row.volume_spike_alerts),
        trend_change_alerts: Boolean(row.trend_change_alerts),
        earnings_alerts: Boolean(row.earnings_alerts),
        price_target_alerts: Boolean(row.price_target_alerts),
        frequency: row.frequency,
        quiet_hours_start: row.quiet_hours_start,
        quiet_hours_end: row.quiet_hours_end,
      };

      return prefs;
    } catch (err: any) {
      console.error("[alert-preferences] GET error:", err);
      return reply.status(500).send({ error: "Failed to fetch alert preferences" });
    }
  });

  // ── PUT /api/alert-preferences/:userId ──────────────────────
  // Update alert preferences for a user (upsert)
  server.put("/api/alert-preferences/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    if (!userId || typeof userId !== "string") {
      return reply.status(400).send({ error: "userId param required" });
    }

    const body = request.body as Partial<AlertPreferences>;
    if (!body || typeof body !== "object") {
      return reply.status(400).send({ error: "Request body required" });
    }

    try {
      // Validate frequency
      const validFrequencies = ["real_time", "daily_digest", "weekly_summary"];
      const frequency = validFrequencies.includes(body.frequency ?? "") ? body.frequency : "real_time";

      // Validate phone number format (optional)
      const phoneNumber = body.phone_number ?? null;
      if (phoneNumber && !/^\+?\d{10,15}$/.test(phoneNumber.replace(/\s/g, ""))) {
        return reply.status(400).send({ error: "Invalid phone number format. Use +91XXXXXXXXXX" });
      }

      // Validate email format (optional)
      const emailAddress = body.email_address ?? null;
      if (emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
        return reply.status(400).send({ error: "Invalid email address" });
      }

      // Validate quiet hours format (optional)
      const quietStart = body.quiet_hours_start ?? null;
      const quietEnd = body.quiet_hours_end ?? null;
      if (quietStart && !/^\d{2}:\d{2}$/.test(quietStart)) {
        return reply.status(400).send({ error: "Invalid quiet hours format. Use HH:MM" });
      }
      if (quietEnd && !/^\d{2}:\d{2}$/.test(quietEnd)) {
        return reply.status(400).send({ error: "Invalid quiet hours format. Use HH:MM" });
      }

      // Upsert preferences
      await dbAdapter.query(
        `INSERT INTO user_alert_preferences
           (user_id, sms_enabled, email_enabled, telegram_enabled,
            phone_number, email_address, telegram_chat_id,
            breakout_alerts, volume_spike_alerts, trend_change_alerts,
            earnings_alerts, price_target_alerts,
            frequency, quiet_hours_start, quiet_hours_end, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, datetime('now'))
         ON CONFLICT (user_id)
         DO UPDATE SET
           sms_enabled = EXCLUDED.sms_enabled,
           email_enabled = EXCLUDED.email_enabled,
           telegram_enabled = EXCLUDED.telegram_enabled,
           phone_number = EXCLUDED.phone_number,
           email_address = EXCLUDED.email_address,
           telegram_chat_id = EXCLUDED.telegram_chat_id,
           breakout_alerts = EXCLUDED.breakout_alerts,
           volume_spike_alerts = EXCLUDED.volume_spike_alerts,
           trend_change_alerts = EXCLUDED.trend_change_alerts,
           earnings_alerts = EXCLUDED.earnings_alerts,
           price_target_alerts = EXCLUDED.price_target_alerts,
           frequency = EXCLUDED.frequency,
           quiet_hours_start = EXCLUDED.quiet_hours_start,
           quiet_hours_end = EXCLUDED.quiet_hours_end,
           updated_at = datetime('now')`,
        [
          userId,
          body.sms_enabled ? 1 : 0,
          body.email_enabled ? 1 : 0,
          body.telegram_enabled ? 1 : 0,
          phoneNumber,
          emailAddress,
          body.telegram_chat_id ?? null,
          body.breakout_alerts !== false ? 1 : 0,
          body.volume_spike_alerts !== false ? 1 : 0,
          body.trend_change_alerts ? 1 : 0,
          body.earnings_alerts ? 1 : 0,
          body.price_target_alerts ? 1 : 0,
          frequency,
          quietStart,
          quietEnd,
        ]
      );

      return { success: true, message: "Alert preferences saved" };
    } catch (err: any) {
      console.error("[alert-preferences] PUT error:", err);
      return reply.status(500).send({ error: "Failed to save alert preferences" });
    }
  });

  // ── GET /api/alert-delivery-log/:userId ─────────────────────
  // Fetch recent alert delivery log for a user
  server.get("/api/alert-delivery-log/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { limit } = request.query as { limit?: string };
    if (!userId || typeof userId !== "string") {
      return reply.status(400).send({ error: "userId param required" });
    }

    const maxResults = Math.min(parseInt(limit ?? "50", 10) || 50, 100);

    try {
      const result = await dbAdapter.query(
        `SELECT * FROM alert_delivery_log
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, maxResults]
      );

      return { logs: result.rows || [] };
    } catch (err: any) {
      console.error("[alert-delivery-log] GET error:", err);
      return reply.status(500).send({ error: "Failed to fetch delivery log" });
    }
  });
}
