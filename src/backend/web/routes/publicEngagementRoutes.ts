import type { FastifyInstance } from 'fastify';

export interface PublicEngagementRouteDeps {
  dbQuery: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, any>[]; rowCount: number }>;
}

export async function registerPublicEngagementRoutes(server: FastifyInstance, deps: PublicEngagementRouteDeps) {
  server.post('/api/waitlist', async (req, reply) => {
    const { email, name } = req.body as { email?: string; name?: string };
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return reply.status(400).send({ error: 'A valid email is required' });
    }

    try {
      const existing = await deps.dbQuery(
        'SELECT id, status, position FROM waitlist_entries WHERE email = $1',
        [email.toLowerCase().trim()],
      );
      if (existing.rowCount > 0) {
        return reply.status(409).send({
          error: 'already_on_waitlist',
          entry: existing.rows[0],
        });
      }

      const countResult = await deps.dbQuery('SELECT COUNT(*) AS cnt FROM waitlist_entries');
      const position = Number(countResult.rows[0]?.cnt ?? 0) + 1;

      const result = await deps.dbQuery(
        `IPSERT INTO waitlist_entries (email, name, position)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, status, position, created_at`,
        [email.toLowerCase().trim(), name?.trim() ?? null, position],
      );

      return reply.status(201).send(result.rows[0]);
    } catch (err: any) {
      req.log.error({ err }, 'Failed to join waitlist');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  server.post('/api/feedback', async (req, reply) => {
    const { category, title, body, pageUrl, email } = req.body as {
      category?: string;
      title?: string;
      body?: string;
      pageUrl?: string;
      email?: string;
    };

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return reply.status(400).send({ error: 'title is required' });
    }
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return reply.status(400).send({ error: 'body is required' });
    }

    const validCategories = ['bug', 'feature-request', 'accuracy', 'ux', 'data-quality', 'content', 'other'];
    const cat = validCategories.includes(category ?? '') ? category : 'other';

    try {
      const result = await deps.dbQuery(
        `IPSERT INTO feedback_entries (category, title, body, page_url, email)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, category, status, created_at`,
        [cat, title.trim(), body.trim(), pageUrl?.trim() ?? null, email?.trim() ?? null],
      );

      return reply.status(201).send(result.rows[0]);
    } catch (err: any) {
      req.log.error({ err }, 'Failed to submit feedback');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
