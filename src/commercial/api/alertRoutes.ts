import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface ScannerTriggerBody {
  ticker: string;
  signalType: string;
  signalDescription: string;
  currentPrice: number;
  strength: number;
}

const alertDedup = new Map<string, number>();

function isDuplicate(ticker: string, signalType: string): boolean {
  const key = `${ticker}:${signalType}`;
  const lastSent = alertDedup.get(key);
  const now = Date.now();
  if (lastSent && now - lastSent < 4 * 60 * 60 * 1000) {
    return true;
  }
  alertDedup.set(key, now);
  if (alertDedup.size > 1000) {
    const oldest = Date.now() - 24 * 60 * 60 * 1000;
    for (const [k, v] of alertDedup) {
      if (v < oldest) alertDedup.delete(k);
    }
  }
  return false;
}

async function sendTwilioWhatsApp(to: string, message: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

  if (!sid || !token) return false;

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: `whatsapp:${to}`, From: from, Body: message }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function sendTelegramAlert(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

function formatScannerAlert(
  ticker: string, desc: string, price: number, strength: number,
): string {
  const badge = strength >= 80 ? "🔴" : strength >= 60 ? "🟡" : "🟢";
  return (
    `${badge} StockStory Alert\n`
    + `Ticker: ${ticker}\n`
    + `Signal: ${desc}\n`
    + `CMP: \u20b9${price}\n`
    + `Strength: ${strength}/100\n`
    + `View: https://stockstory.in/${ticker}`
  );
}

export async function registerAlertRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/alerts/scanner-trigger",
    async (req: FastifyRequest<{ Body: ScannerTriggerBody }>, reply: FastifyReply) => {
      const { ticker, signalType, signalDescription, currentPrice, strength } = req.body;

      if (!ticker || !signalType) {
        return reply.status(400).send({ success: false, error: "ticker and signalType required" });
      }

      if (isDuplicate(ticker, signalType)) {
        return reply.send({
          success: true,
          sent: 0,
          skipped: "duplicate_suppressed",
        });
      }

      try {
        const { dbAdapter } = await import("../../db/DatabaseAdapter");

        const recipients = await dbAdapter.query(
          `SELECT phone_number FROM user_subscriptions
           WHERE status = 'active'
             AND tier IN ('plus', 'pro')
             AND phone_number IS NOT NULL
             AND notification_preference = 'WHATSAPP'`,
        );

        const phones: string[] = (recipients.rows ?? []).map((r: any) => r.phone_number);

        if (phones.length === 0) {
          return reply.send({ success: true, sent: 0, skipped: "no_eligible_recipients" });
        }

        const message = formatScannerAlert(ticker, signalDescription, currentPrice, strength);

        let sent = 0;
        let errors = 0;

        for (const phone of phones) {
          const ok = await sendTwilioWhatsApp(phone, message);
          if (ok) sent++;
          else errors++;
        }

        await sendTelegramAlert(message);

        return reply.send({ success: true, sent, errors });
      } catch (err) {
        req.log.error({ err }, "Scanner alert broadcast failed");
        return reply.status(500).send({ success: false, error: "Alert broadcast failed" });
      }
    },
  );
}
