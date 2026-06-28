/**
 * Analyst API Routes
 */

import type { FastifyInstance } from 'fastify';
import { analystDeskService } from '../AnalystDeskService';
import { defaultResearchReviewQueue } from '../review/ResearchReviewQueue';
import { defaultAuditTrailService } from '../audit/ResearchAuditTrailService';
import { defaultAnalystTaskStore } from '../tasks/AnalystTaskStore';

async function requireInternalAuth(req: any, reply: any) {
  const key = req.headers['x-internal-key'];
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected || key !== expected) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
}

export async function registerAnalystRoutes(server: FastifyInstance): Promise<void> {
  server.get('/api/analyst/company/:symbol/deep-dive', async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol || !/^[A-Z0-9&.-]{1,20}$/i.test(symbol)) {
      return reply.status(400).send({ error: 'Valid symbol required' });
    }
    try {
      const result = await analystDeskService.getDeepDive(symbol.toUpperCase());
      reply.header('Cache-Control', 'public, s-maxage=300');
      return { ok: true, symbol: symbol.toUpperCase(), data: result.publicOutput };
    } catch {
      return reply.status(200).send({
        ok: false,
        symbol: symbol.toUpperCase(),
        data: { summary: 'Research deep dive unavailable.', limitations: ['Limited information'] },
      });
    }
  });

  server.get('/api/analyst/company/:symbol/earnings-note', async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol) return reply.status(400).send({ error: 'Valid symbol required' });
    try {
      const result = await analystDeskService.getEarningsNote(symbol.toUpperCase());
      return { ok: true, symbol: symbol.toUpperCase(), data: result.publicOutput };
    } catch {
      return reply.status(200).send({
        ok: false,
        symbol: symbol.toUpperCase(),
        data: { headline: 'Results note unavailable', limitations: ['Limited information'] },
      });
    }
  });

  server.get('/api/analyst/company/:symbol/filing-briefs', async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol) return reply.status(400).send({ error: 'Valid symbol required' });
    const result = await analystDeskService.getFilingBriefs(symbol.toUpperCase(), []);
    return { ok: true, symbol: symbol.toUpperCase(), ...result };
  });

  server.get('/api/analyst/sector/:sector/brief', async (req, reply) => {
    const { sector } = req.params as { sector: string };
    if (!sector) return reply.status(400).send({ error: 'Valid sector required' });
    const result = await analystDeskService.getSectorBrief(decodeURIComponent(sector));
    return { ok: true, sector, data: result.publicOutput };
  });

  server.post('/api/analyst/qa', async (req, reply) => {
    const body = req.body as { question?: string; symbol?: string; sector?: string };
    if (!body?.question || typeof body.question !== 'string') {
      return reply.status(400).send({ error: 'Question is required' });
    }
    const result = await analystDeskService.answerQuestion({
      question: body.question.slice(0, 500),
      symbol: body.symbol?.toUpperCase(),
      sector: body.sector,
    });
    return { ok: true, data: result.publicOutput };
  });

  server.get('/api/analyst/company/:symbol/memos', async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const memo = analystDeskService.buildMemoFromDeepDive(symbol.toUpperCase());
    const { publicOutput } = analystPublicFromMemo(memo);
    return { ok: true, symbol: symbol.toUpperCase(), memos: [publicOutput] };
  });

  server.get('/api/internal/analyst/tasks', { preHandler: requireInternalAuth }, async (_req, reply) => {
    const tasks = await defaultAnalystTaskStore.list();
    return { ok: true, tasks };
  });

  server.get('/api/internal/analyst/review-queue', { preHandler: requireInternalAuth }, async (_req, reply) => {
    return { ok: true, items: defaultResearchReviewQueue.list() };
  });

  server.post('/api/internal/analyst/review/:id/approve', { preHandler: requireInternalAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const item = defaultResearchReviewQueue.approve(id);
    if (!item) return reply.status(404).send({ error: 'Not found' });
    return { ok: true, item };
  });

  server.post('/api/internal/analyst/review/:id/reject', { preHandler: requireInternalAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const item = defaultResearchReviewQueue.reject(id);
    if (!item) return reply.status(404).send({ error: 'Not found' });
    return { ok: true, item };
  });

  server.get('/api/internal/analyst/audit/:outputId', { preHandler: requireInternalAuth }, async (req, reply) => {
    const { outputId } = req.params as { outputId: string };
    const record = defaultAuditTrailService.get(outputId);
    if (!record) return reply.status(404).send({ error: 'Not found' });
    return { ok: true, audit: record };
  });
}

function analystPublicFromMemo(memo: { title?: unknown; summary?: unknown; limitations?: unknown; generatedAt?: unknown; disclaimer?: unknown }) {
  const { disclaimer, title, summary, limitations, generatedAt } = memo;
  return {
    publicOutput: { title, summary, limitations, generatedAt, disclaimer },
  };
}
