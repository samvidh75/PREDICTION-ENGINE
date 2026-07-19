import type { FastifyInstance } from 'fastify';
import { earningsCalendarService } from '../../../services/earnings/EarningsCalendarService.js';
import { newsSentimentAggregator } from '../../../services/news/NewsSentimentAggregator.js';
import type { EarningsEvent } from '../../../services/earnings/EarningsCalendarService.js';

export async function registerEarningsRoutes(app: FastifyInstance) {
  app.get('/api/earnings/calendar', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    const days = Number(query.days ?? 30);
    return earningsCalendarService.getUpcomingEvents(days);
  });

  app.get('/api/earnings/recent', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    const days = Number(query.days ?? 7);
    return earningsCalendarService.getRecentEvents(days);
  });

  app.get('/api/earnings/history/:symbol', async (request, _reply) => {
    const { symbol } = request.params as Record<string, string>;
    return earningsCalendarService.getEventsBySymbol(symbol.toUpperCase());
  });

  app.post('/api/earnings/event', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, string | number>;
    const symbol = String(body.symbol ?? '').trim().toUpperCase();
    const quarter = String(body.fiscalQuarter ?? '');
    if (!symbol || !quarter) {
      return reply.status(400).send({ error: 'symbol and fiscalQuarter required' });
    }
    const event: Omit<EarningsEvent, 'id'> = {
      symbol,
      companyName: String(body.companyName ?? symbol),
      fiscalQuarter: quarter,
      fiscalYear: Number(body.fiscalYear ?? new Date().getFullYear()),
      reportDate: String(body.reportDate ?? new Date().toISOString()),
      estimatedEps: Number(body.estimatedEps ?? 0),
      priorYearEps: Number(body.priorYearEps ?? 0),
      estimatedRevenue: Number(body.estimatedRevenue ?? 0),
      priorYearRevenue: Number(body.priorYearRevenue ?? 0),
      status: (body.status as EarningsEvent['status']) ?? 'estimated',
      actualEps: body.actualEps !== undefined ? Number(body.actualEps) : undefined,
      actualRevenue: body.actualRevenue !== undefined ? Number(body.actualRevenue) : undefined,
    };
    return earningsCalendarService.addEvent(event);
  });

  app.get('/api/earnings/surprise/:symbol/:quarter', async (request, reply) => {
    const { symbol, quarter } = request.params as Record<string, string>;
    const result = earningsCalendarService.computeEpsSurprise(symbol.toUpperCase(), quarter);
    if (!result) return reply.status(404).send({ error: 'No EPS data found' });
    return result;
  });

  app.post('/api/news/article', async (request, _reply) => {
    const body = (request.body ?? {}) as Record<string, string | number | string[]>;
    return newsSentimentAggregator.addArticle({
      symbol: String(body.symbol ?? '').toUpperCase(),
      title: String(body.title ?? ''),
      source: String(body.source ?? ''),
      url: String(body.url ?? ''),
      publishedAt: String(body.publishedAt ?? new Date().toISOString()),
      summary: String(body.summary ?? ''),
      sentiment: Number(body.sentiment ?? 0),
      relevance: Number(body.relevance ?? 0.5),
      topics: Array.isArray(body.topics) ? body.topics as string[] : [],
    });
  });
}
