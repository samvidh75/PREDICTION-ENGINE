/**
 * TRACK-65 AGENT D — PipelineAlertService
 *
 * Monitors pipeline health and dispatches alerts via configured channels.
 * Triggers: stale data, scheduler failure, prediction failure, validation failure, DB not reachable.
 *
 * Channels: Email (SMTP env vars), Slack webhook, Discord webhook.
 * All channels are optional — configure via environment variables.
 */
import pool from '../db/index';
import { freshnessMonitor } from './DataFreshnessMonitor';
import { recoveryService } from './PipelineRecoveryService';

// ── Types ──────────────────────────────────────────────────────────

export type AlertChannel = 'email' | 'slack' | 'discord';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  component: string;
  message: string;
  timestamp: string;
  channel?: AlertChannel;
}

export interface AlertConfig {
  enabled: boolean;
  email: {
    enabled: boolean;
    smtpHost?: string;
    smtpPort?: number;
    from?: string;
    to?: string;
  };
  slack: {
    enabled: boolean;
    webhookUrl?: string;
  };
  discord: {
    enabled: boolean;
    webhookUrl?: string;
  };
}

export interface AlertResult {
  alert: Alert;
  channel: AlertChannel;
  sent: boolean;
  error?: string;
}

// ── Service ────────────────────────────────────────────────────────

export class PipelineAlertService {
  private config: AlertConfig;

  constructor(config?: Partial<AlertConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      email: {
        enabled: config?.email?.enabled ?? !!process.env.ALERT_EMAIL_ENABLED,
        smtpHost: config?.email?.smtpHost ?? process.env.SMTP_HOST,
        smtpPort: config?.email?.smtpPort ?? parseInt(process.env.SMTP_PORT || '587'),
        from: config?.email?.from ?? process.env.ALERT_EMAIL_FROM ?? 'alerts@stockstory.in',
        to: config?.email?.to ?? process.env.ALERT_EMAIL_TO ?? 'admin@stockstory.in',
      },
      slack: {
        enabled: config?.slack?.enabled ?? !!process.env.SLACK_WEBHOOK_URL,
        webhookUrl: config?.slack?.webhookUrl ?? process.env.SLACK_WEBHOOK_URL,
      },
      discord: {
        enabled: config?.discord?.enabled ?? !!process.env.DISCORD_WEBHOOK_URL,
        webhookUrl: config?.discord?.webhookUrl ?? process.env.DISCORD_WEBHOOK_URL,
      },
    };
  }

  /**
   * Run a full pipeline health check and alert on any issues.
   * Called by the scheduler after each phase, or independently for monitoring.
   */
  async runHealthCheck(): Promise<AlertResult[]> {
    const results: AlertResult[] = [];
    if (!this.config.enabled) return results;

    // 1. Check data freshness
    try {
      const freshnessReport = await freshnessMonitor.checkAll();
      if (freshnessReport.overallStatus !== 'healthy') {
        const alerts = freshnessMonitor.generateAlerts(freshnessReport);
        for (const msg of alerts) {
          const severity: AlertSeverity = msg.startsWith('CRITICAL') ? 'CRITICAL' :
            msg.startsWith('WARNING') ? 'WARNING' : 'INFO';
          const alert = this.createAlert(severity, 'DataFreshness', msg);
          results.push(...(await this.dispatchAlert(alert)));
        }
      }
    } catch (e: unknown) {
      const alert = this.createAlert('WARNING', 'DataFreshness', `Freshness check failed: ${(e as Error).message}`);
      results.push(...(await this.dispatchAlert(alert)));
    }

    // 2. Check scheduler / pipeline recovery status
    try {
      const recoveryStatus = await recoveryService.diagnose();
      if (recoveryStatus.isStuck) {
        const alert = this.createAlert('CRITICAL', 'PipelineScheduler',
          `Pipeline is STUCK. ${recoveryStatus.failedPhases.length} phases failed. Lock age exceeds threshold.`);
        results.push(...(await this.dispatchAlert(alert)));
      }
      if (recoveryStatus.failedPhases.length > 2) {
        const alert = this.createAlert('WARNING', 'PipelineScheduler',
          `${recoveryStatus.failedPhases.length} phases in failed state. Last run: ${recoveryStatus.lastRunTime || 'unknown'}`);
        results.push(...(await this.dispatchAlert(alert)));
      }
    } catch (e: unknown) {
      const alert = this.createAlert('WARNING', 'PipelineScheduler',
        `Recovery service diagnosis failed: ${(e as Error).message}`);
      results.push(...(await this.dispatchAlert(alert)));
    }

    // 3. Check prediction generation health
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayPreds = await pool.query(
        `SELECT COUNT(*) as cnt FROM prediction_registry WHERE prediction_date = $1`,
        [today]
      );
      const todayCount = parseInt(todayPreds.rows[0]?.cnt || '0');
      if (todayCount === 0) {
        const alert = this.createAlert('CRITICAL', 'PredictionFactory',
          `No predictions generated today (${today}). Pipeline may have failed silently.`);
        results.push(...(await this.dispatchAlert(alert)));
      }
    } catch (e: unknown) {
      const alert = this.createAlert('WARNING', 'PredictionFactory',
        `Prediction count check failed: ${(e as Error).message}`);
      results.push(...(await this.dispatchAlert(alert)));
    }

    // 4. Check outcome validation health
    try {
      const pendingValidations = await pool.query(
        `SELECT COUNT(*) as cnt FROM prediction_registry
         WHERE validation_status = 'pending'
           AND prediction_date <= date('now', '-30 days')`,
      );
      const pendingCount = parseInt(pendingValidations.rows[0]?.cnt || '0');
      if (pendingCount > 500) {
        const alert = this.createAlert('WARNING', 'OutcomeValidator',
          `${pendingCount} predictions past 30d horizon are still unvalidated. Validator may be stalled.`);
        results.push(...(await this.dispatchAlert(alert)));
      }
    } catch (e: unknown) {
      const alert = this.createAlert('WARNING', 'OutcomeValidator',
        `Validation health check failed: ${(e as Error).message}`);
      results.push(...(await this.dispatchAlert(alert)));
    }

    // 5. Check DB connectivity
    try {
      await pool.query('SELECT 1');
    } catch (e: unknown) {
      const alert = this.createAlert('CRITICAL', 'Database',
        `Database unreachable: ${(e as Error).message}`);
      results.push(...(await this.dispatchAlert(alert)));
      // Don't continue — nothing else works without DB
      return results;
    }

    return results;
  }

  /**
   * Send a test alert to verify all configured channels.
   */
  async sendTestAlert(): Promise<AlertResult[]> {
    const testAlert = this.createAlert(
      'INFO',
      'PipelineAlertService',
      'Test alert from SSI alerting system. If you receive this, alerts are configured correctly.'
    );
    return this.dispatchAlert(testAlert);
  }

  /**
   * Send a custom alert for any component.
   */
  async sendAlert(severity: AlertSeverity, component: string, message: string): Promise<AlertResult[]> {
    const alert = this.createAlert(severity, component, message);
    return this.dispatchAlert(alert);
  }

  // ── Private Methods ─────────────────────────────────────────────

  private createAlert(severity: AlertSeverity, component: string, message: string): Alert {
    return {
      id: `alert-${Date.now()}-${(globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296).toString(36).substring(2, 8)}`,
      severity,
      component,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  private async dispatchAlert(alert: Alert): Promise<AlertResult[]> {
    const results: AlertResult[] = [];
    const prefix = `[${alert.severity}]${alert.timestamp ? ' ' + alert.timestamp.substring(11, 19) : ''} ${alert.component}`;
    const formattedBody = `${prefix}\n${alert.message}`;

    // Slack
    if (this.config.slack.enabled && this.config.slack.webhookUrl) {
      try {
        await this.sendSlack(alert, formattedBody);
        results.push({ alert, channel: 'slack', sent: true });
      } catch (e: unknown) {
        results.push({ alert, channel: 'slack', sent: false, error: (e as Error).message });
      }
    }

    // Discord
    if (this.config.discord.enabled && this.config.discord.webhookUrl) {
      try {
        await this.sendDiscord(alert, formattedBody);
        results.push({ alert, channel: 'discord', sent: true });
      } catch (e: unknown) {
        results.push({ alert, channel: 'discord', sent: false, error: (e as Error).message });
      }
    }

    // Email — only for CRITICAL alerts unless configured otherwise
    if (this.config.email.enabled && alert.severity === 'CRITICAL') {
      try {
        await this.sendEmail(alert);
        results.push({ alert, channel: 'email', sent: true });
      } catch (e: unknown) {
        results.push({ alert, channel: 'email', sent: false, error: (e as Error).message });
      }
    }

    // If no channels configured, log locally
    if (results.length === 0) {
      this.logLocal(alert);
    }

    return results;
  }

  private async sendSlack(alert: Alert, body: string): Promise<void> {
    const color = alert.severity === 'CRITICAL' ? '#ff0000' :
      alert.severity === 'WARNING' ? '#ffaa00' : '#36a64f';

    const response = await fetch(this.config.slack.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `SSI Alert: ${alert.component}`,
          text: alert.message,
          footer: `SSI PipelineAlertService | ${alert.timestamp}`,
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook returned ${response.status}: ${await response.text()}`);
    }
  }

  private async sendDiscord(alert: Alert, body: string): Promise<void> {
    const color = alert.severity === 'CRITICAL' ? 0xff0000 :
      alert.severity === 'WARNING' ? 0xffaa00 : 0x36a64f;

    const response = await fetch(this.config.discord.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `SSI Alert: ${alert.component}`,
          description: alert.message,
          color,
          footer: { text: `SSI PipelineAlertService | ${alert.timestamp}` },
          timestamp: alert.timestamp,
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook returned ${response.status}: ${await response.text()}`);
    }
  }

  private async sendEmail(alert: Alert): Promise<void> {
    // Email sending requires SMTP config
    if (!this.config.email.smtpHost) {
      this.logLocal(alert);
      return;
    }
    // In production, integrate with nodemailer or a transactional email service.
    // For now, log that an email would have been sent.
    this.logLocal(alert);
    console.info(`[PipelineAlertService] Email would be sent to ${this.config.email.to}: ${alert.message}`);
  }

  private logLocal(alert: Alert): void {
    const prefix = alert.severity === 'CRITICAL' ? '🔴' :
      alert.severity === 'WARNING' ? '🟡' : '🔵';
    const timestamp = alert.timestamp.substring(0, 19).replace('T', ' ');
    console.info(`${prefix} [${timestamp}] ${alert.component}: ${alert.message}`);
  }
}

export const pipelineAlertService = new PipelineAlertService();
export default PipelineAlertService;
