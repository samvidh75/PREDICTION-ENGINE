import type { FastifyInstance } from 'fastify';
import { ideaSharingService } from '../../../services/community/IdeaSharingService.js';
import { leaderboardService } from '../../../services/community/LeaderboardService.js';
import { analyzeCommunityMessage, buildEducationalReframe } from '../../../services/community/communityQualityEngine.js';

export async function registerCommunityRoutes(app: FastifyInstance) {
  app.post('/api/ideas/create', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, string | number | string[]>;
    const title = String(body.title ?? '').trim();
    const symbol = String(body.symbol ?? '').trim().toUpperCase();
    if (!title || !symbol) {
      return reply.status(400).send({ error: 'title and symbol are required' });
    }
    const idea = ideaSharingService.createIdea({
      title,
      description: String(body.description ?? ''),
      symbol,
      thesis: String(body.thesis ?? ''),
      convictionScore: Number(body.convictionScore ?? 0),
      riskFactors: Array.isArray(body.riskFactors) ? body.riskFactors as string[] : [],
      authorId: String(body.authorId ?? 'anonymous'),
      authorName: String(body.authorName ?? 'Anonymous'),
      tags: Array.isArray(body.tags) ? body.tags as string[] : [],
      status: 'active',
    });
    return idea;
  });

  app.get('/api/ideas/trending', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    const limit = Number(query.limit ?? 10);
    return ideaSharingService.getTrendingIdeas(limit);
  });

  app.get('/api/ideas/list', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    return ideaSharingService.getIdeas({
      symbol: query.symbol,
      authorId: query.authorId,
      sortBy: query.sortBy as 'newest' | 'top' | 'most_discussed',
      limit: Number(query.limit ?? 50),
    });
  });

  app.post('/api/ideas/:ideaId/vote', async (request, reply) => {
    const { ideaId } = request.params as Record<string, string>;
    const body = (request.body ?? {}) as Record<string, string>;
    const userId = String(body.userId ?? 'anonymous');
    const vote = body.vote as 'up' | 'down';
    if (vote !== 'up' && vote !== 'down') {
      return reply.status(400).send({ error: 'vote must be "up" or "down"' });
    }
    const result = ideaSharingService.voteIdea(ideaId, userId, vote);
    if (!result) return reply.status(404).send({ error: 'Idea not found' });
    return result;
  });

  app.post('/api/ideas/:ideaId/comment', async (request, reply) => {
    const { ideaId } = request.params as Record<string, string>;
    const body = (request.body ?? {}) as Record<string, string>;
    if (!body.text) return reply.status(400).send({ error: 'text is required' });
    const comment = ideaSharingService.addComment(
      ideaId,
      String(body.authorId ?? 'anonymous'),
      String(body.authorName ?? 'Anonymous'),
      body.text,
    );
    if (!comment) return reply.status(404).send({ error: 'Idea not found' });
    return comment;
  });

  app.get('/api/ideas/:ideaId/comments', async (request, _reply) => {
    const { ideaId } = request.params as Record<string, string>;
    return ideaSharingService.getComments(ideaId);
  });

  app.get('/api/leaderboard', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    const period = (query.period ?? 'all_time') as 'weekly' | 'monthly' | 'all_time';
    const limit = Number(query.limit ?? 20);
    return leaderboardService.getLeaderboard(period, limit);
  });

  app.post('/api/community/analyze', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, string>;
    const text = String(body.text ?? '').trim();
    if (!text) return reply.status(400).send({ error: 'text is required' });
    const analysis = analyzeCommunityMessage(text);
    return analysis;
  });

  app.post('/api/community/reframe', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, string>;
    const text = String(body.text ?? '').trim();
    if (!text) return reply.status(400).send({ error: 'text is required' });
    const experienceLevel = (body.experienceLevel ?? 'beginner') as 'beginner' | 'intermediate';
    const analysis = analyzeCommunityMessage(text);
    return buildEducationalReframe(text, analysis, experienceLevel);
  });
}
