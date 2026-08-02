import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export async function cohortAnalyticsRoutes(app: FastifyInstance) {
  app.get('/api/analytics/cohorts', async (_request, reply) => {
    const { data, error } = await supabase.rpc('get_cohort_retention');
    if (error) {
      console.error('cohort query error:', error);
      return reply.status(500).send({ error: 'Cohort query failed' });
    }
    return reply.status(200).send({ cohorts: data });
  });

  app.get('/api/analytics/funnel', async (_request, reply) => {
    const { data, error } = await supabase.rpc('get_analytics_funnel');
    if (error) {
      console.error('funnel query error:', error);
      return reply.status(500).send({ error: 'Funnel query failed' });
    }
    return reply.status(200).send({ funnel: data });
  });
}
