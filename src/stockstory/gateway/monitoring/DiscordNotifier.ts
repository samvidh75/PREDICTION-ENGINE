/**
 * DiscordNotifier — Zero-cost alert webhook for Node.js/TypeScript layers.
 *
 * Fires formatted error embeds to a private Discord channel when a pipeline
 * or gateway component fails.  Falls back to console.warn if the webhook
 * URL is not configured, so there is zero crash risk.
 *
 * Usage:
 *   import { DiscordNotifier } from './monitoring/DiscordNotifier';
 *   await DiscordNotifier.sendErrorAlert('MY_SERVICE', error);
 */

const WEBHOOK_URL = process.env.MONITORING_DISCORD_WEBHOOK_URL || '';

export class DiscordNotifier {
  /**
   * Post a structured error embed to the configured Discord webhook.
   * Always safe to call — rejects gracefully if the URL is missing or
   * the network request fails.
   */
  static async sendErrorAlert(serviceName: string, error: unknown): Promise<void> {
    console.error(`[Sentinel] Error intercepted in ${serviceName}:`, error);

    if (!WEBHOOK_URL) {
      console.warn('[Sentinel] MONITORING_DISCORD_WEBHOOK_URL not set — skipping alert.');
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack =
      error instanceof Error && error.stack
        ? error.stack.substring(0, 1200)
        : 'No stack trace captured.';

    const payload = {
      username: 'StockStory Gateway Sentinel',
      embeds: [
        {
          title: '🛑 GATEWAY EXCEPTION',
          color: 16737792, // Orange
          fields: [
            { name: '⚡ Service', value: `\`${serviceName}\``, inline: true },
            {
              name: '🌐 Environment',
              value: `\`${process.env.NODE_ENV || 'production'}\``,
              inline: true,
            },
            {
              name: '💥 Message',
              value: `\`\`\`\n${errorMessage}\n\`\`\``,
              inline: false,
            },
            {
              name: '📋 Stack',
              value: `\`\`\`\n${errorStack}\n\`\`\``,
              inline: false,
            },
          ],
          footer: { text: 'Gateway Mesh Layer • Failover Safe' },
        },
      ],
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[Sentinel] Discord rejected alert: ${response.status}`);
      }
    } catch (netErr) {
      console.error('[Sentinel] Failed to send webhook:', netErr);
    }
  }
}
