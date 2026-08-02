import type { FastifyInstance } from 'fastify';
import { multiLegAlertEngine, type MultiLegAlertRule, type AlertEvaluationContext } from '../../../services/alerts/MultiLegAlertEngine.js';
import { webhookService } from '../../../services/alerts/WebhookService.js';
import type { WebhookConfig } from '../../../services/alerts/WebhookService.js';

export async function registerAlertsRoutes(app: FastifyInstance) {
  // Prefixed with /multileg/: this file's create/rules/evaluate routes
  // collide with unifiedAlertsRoutes.ts (registered earlier in
  // startServer.ts, has a pinning test) — two genuinely different alert
  // engines (multi-leg condition rules + webhooks here, vs. thesis-status
  // alerts there) sharing plain-English URL names. Fastify throws
  // FST_ERR_DUPLICATED_ROUTE on the real duplicate registration.
  app.post('/api/alerts/multileg/create', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const conditions = body.conditions;
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return reply.status(400).send({ error: 'conditions array required' });
    }
    const rule = multiLegAlertEngine.createRule({
      name: String(body.name ?? 'Alert Rule'),
      symbol: String(body.symbol ?? '').toUpperCase(),
      conditions: conditions as MultiLegAlertRule['conditions'],
      logic: (body.logic as 'AND' | 'OR') ?? 'AND',
      cooldownMinutes: Number(body.cooldownMinutes ?? 60),
      webhookUrl: body.webhookUrl ? String(body.webhookUrl) : undefined,
      enabled: body.enabled !== false,
    });
    return rule;
  });

  app.get('/api/alerts/multileg/rules', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    return multiLegAlertEngine.listRules(query.symbol);
  });

  app.post('/api/alerts/multileg/evaluate', async (request, reply) => {
    const body = request.body as AlertEvaluationContext | null;
    if (!body || !body.symbol || !body.currentValues) {
      return reply.status(400).send({ error: 'symbol and currentValues required' });
    }
    return multiLegAlertEngine.evaluate(body);
  });

  app.delete('/api/alerts/rules/:id', async (request, reply) => {
    const { id } = request.params as Record<string, string>;
    const deleted = multiLegAlertEngine.deleteRule(id);
    if (!deleted) return reply.status(404).send({ error: 'Rule not found' });
    return { deleted: true };
  });

  app.post('/api/alerts/webhook/register', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const url = String(body.url ?? '').trim();
    if (!url) return reply.status(400).send({ error: 'url is required' });
    const events = body.events;
    if (!Array.isArray(events) || events.length === 0) {
      return reply.status(400).send({ error: 'events array required' });
    }
    const webhook = webhookService.registerWebhook({
      name: String(body.name ?? 'Webhook'),
      url,
      method: (body.method as WebhookConfig['method']) ?? 'POST',
      headers: (body.headers as Record<string, string>) ?? {},
      retryCount: Number(body.retryCount ?? 3),
      timeoutMs: Number(body.timeoutMs ?? 5000),
      enabled: body.enabled !== false,
      events: events as string[],
    });
    return webhook;
  });

  app.get('/api/alerts/webhooks', async (_request, _reply) => {
    return webhookService.listWebhooks();
  });

  app.post('/api/alerts/webhook/test', async (request, _reply) => {
    const body = (request.body ?? {}) as Record<string, string>;
    const event = body.event ?? 'test';
    return webhookService.fireEvent(event, { test: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/alerts/deliveries', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    return webhookService.getDeliveries(query.webhookId, Number(query.limit ?? 50));
  });
}
