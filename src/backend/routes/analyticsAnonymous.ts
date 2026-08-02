import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

interface AnonymousEventBody {
  sessionId: string;
  events: Array<{
    event: string;
    timestamp: number;
    metadata?: Record<string, string | number | boolean>;
  }>;
  sentAt: number;
}

export async function analyticsAnonymousRoutes(app: FastifyInstance) {
  app.post<{ Body: AnonymousEventBody }>(
    '/api/analytics/anonymous',
    async (request, reply) => {
      const { sessionId, events } = request.body;

      if (!sessionId || !events || !Array.isArray(events)) {
        return reply.status(400).send({ error: 'Invalid payload' });
      }

      const rows = events.map((e) => ({
        session_id: sessionId,
        event_name: e.event,
        event_timestamp: new Date(e.timestamp).toISOString(),
        metadata: e.metadata || null,
      }));

      const { error } = await supabase.from('anonymous_events').insert(rows);
      if (error) {
        console.error('analytics insert error:', error);
        return reply.status(500).send({ error: 'Insert failed' });
      }

      return reply.status(200).send({ ok: true });
    }
  );

  app.get('/api/analytics/trends', async (_request, reply) => {
    const { data, error } = await supabase
      .from('stock_trends_weekly')
      .select('*')
      .order('week', { ascending: false })
      .limit(50);

    if (error) {
      console.error('analytics trends error:', error);
      return reply.status(500).send({ error: 'Query failed' });
    }

    return reply.status(200).send({ trends: data });
  });
}
