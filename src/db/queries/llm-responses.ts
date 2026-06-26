import { db } from '../init';

export const llmResponsesQueries = {
  async insertResponse(
    cacheKey: string,
    responseType: string,
    content: any,
    tokenCount: number,
    costEstimate: number,
    routedTo: 'weak' | 'strong',
    ttlHours: number = 24
  ) {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    return db.query(
      `INSERT INTO llm_responses (cache_key, response_type, content, token_count, cost_estimate, routed_to, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (cache_key) DO UPDATE SET content=$3, expires_at=$7`,
      [cacheKey, responseType, JSON.stringify(content), tokenCount, costEstimate, routedTo, expiresAt]
    );
  },

  async getResponse(cacheKey: string): Promise<any | null> {
    const res = await db.query(
      `SELECT content FROM llm_responses WHERE cache_key = $1 AND expires_at > now()`,
      [cacheKey]
    );
    return res.rows[0]?.content ?? null;
  },

  async getMetrics(period: '1h' | '24h' | '7d'): Promise<any> {
    const periodHours = { '1h': 1, '24h': 24, '7d': 168 }[period];
    return db.query(
      `SELECT
        COUNT(*) as total_queries,
        COUNT(*) FILTER (WHERE routed_to='weak') as routed_to_weak,
        COUNT(*) FILTER (WHERE routed_to='strong') as routed_to_strong,
        COALESCE(SUM(cost_estimate), 0) as total_cost,
        COALESCE(AVG(cost_estimate), 0) as avg_cost_per_query
       FROM llm_responses
       WHERE created_at > now() - interval '${periodHours} hours'`
    );
  },

  async cleanupExpired() {
    return db.query('DELETE FROM llm_responses WHERE expires_at < now()');
  },

  async logCall(params: {
    service: string;
    method: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    costEstimate: number;
    routedTo: 'weak' | 'strong';
    success: boolean;
    errorMessage?: string;
  }) {
    return db.query(
      `INSERT INTO llm_call_logs (service, method, input_tokens, output_tokens, latency_ms, cost_estimate, routed_to, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [params.service, params.method, params.inputTokens, params.outputTokens,
       params.latencyMs, params.costEstimate, params.routedTo, params.success, params.errorMessage || null]
    );
  },

  async getThesis(symbol: string): Promise<string | null> {
    const res = await db.query(
      `SELECT thesis FROM thesis_cache WHERE symbol = $1 AND expires_at > now()`,
      [symbol]
    );
    return res.rows[0]?.thesis ?? null;
  },

  async cacheThesis(symbol: string, thesis: string, score: number, ttlHours = 24) {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    return db.query(
      `INSERT INTO thesis_cache (symbol, thesis, score, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (symbol) DO UPDATE SET thesis=$2, score=$3, expires_at=$4`,
      [symbol, thesis, score, expiresAt]
    );
  },
};
