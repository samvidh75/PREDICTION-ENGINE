export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers: Record<string, string>;
  secret?: string;
  retryCount: number;
  timeoutMs: number;
  enabled: boolean;
  events: string[];
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  status: 'pending' | 'success' | 'failed';
  statusCode: number | null;
  attempt: number;
  errorMessage: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export class WebhookService {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveries: WebhookDelivery[] = [];

  registerWebhook(input: Omit<WebhookConfig, 'id' | 'createdAt'>): WebhookConfig {
    const webhook: WebhookConfig = {
      ...input,
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  updateWebhook(id: string, updates: Partial<WebhookConfig>): WebhookConfig | null {
    const existing = this.webhooks.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id: existing.id };
    this.webhooks.set(id, updated);
    return updated;
  }

  deleteWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  getWebhook(id: string): WebhookConfig | null {
    return this.webhooks.get(id) ?? null;
  }

  listWebhooks(): WebhookConfig[] {
    return [...this.webhooks.values()].filter(w => w.enabled);
  }

  async fireEvent(event: string, payload: unknown): Promise<WebhookDelivery[]> {
    const matching = this.listWebhooks().filter(w => w.events.includes(event));
    const results: WebhookDelivery[] = [];

    for (const webhook of matching) {
      const delivery = await this.deliver(webhook, event, payload);
      results.push(delivery);
    }

    return results;
  }

  getDeliveries(webhookId?: string, limit: number = 50): WebhookDelivery[] {
    let result = [...this.deliveries];
    if (webhookId) result = result.filter(d => d.webhookId === webhookId);
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  private async deliver(
    webhook: WebhookConfig,
    event: string,
    payload: unknown,
  ): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      webhookId: webhook.id,
      event,
      payload,
      status: 'pending',
      statusCode: null,
      attempt: 0,
      errorMessage: null,
      deliveredAt: null,
      createdAt: new Date().toISOString(),
    };

    for (let attempt = 1; attempt <= webhook.retryCount + 1; attempt++) {
      delivery.attempt = attempt;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), webhook.timeoutMs);

        const options: RequestInit = {
          method: webhook.method,
          headers: {
            'Content-Type': 'application/json',
            ...webhook.headers,
          },
          signal: controller.signal,
        };

        if (webhook.method !== 'GET') {
          options.body = JSON.stringify({
            event,
            payload,
            timestamp: new Date().toISOString(),
            webhookId: webhook.id,
          });
        }

        const response = await fetch(webhook.url, options);
        clearTimeout(timeout);

        delivery.statusCode = response.status;
        delivery.status = response.ok ? 'success' : 'failed';
        delivery.deliveredAt = new Date().toISOString();

        if (response.ok) break;
        delivery.errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      } catch (error) {
        delivery.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        delivery.status = 'failed';
      }
    }

    this.deliveries.push(delivery);
    if (this.deliveries.length > 1000) {
      this.deliveries = this.deliveries.slice(-500);
    }

    return delivery;
  }
}

export const webhookService = new WebhookService();
