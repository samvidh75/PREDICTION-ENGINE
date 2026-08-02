// D1 API — Stock search proxy (replaces SupabaseService frontend calls)
// Deployed as a Cloudflare Pages Function

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (request.method === 'GET' && action === 'search') {
    const pe_max = url.searchParams.get('pe_max');
    const roe_min = url.searchParams.get('roe_min');
    const industry = url.searchParams.get('industry');

    let query = 'SELECT * FROM stocks WHERE 1=1';
    const params: unknown[] = [];

    if (pe_max) {
      query += ' AND pe_ratio <= ?';
      params.push(parseFloat(pe_max));
    }
    if (roe_min) {
      query += ' AND roe >= ?';
      params.push(parseFloat(roe_min));
    }
    if (industry) {
      query += ' AND industry = ?';
      params.push(industry);
    }
    query += ' LIMIT 100';

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return Response.json({ data: results, error: null });
  }

  if (request.method === 'POST' && action === 'log-search') {
    const body: { query: string; method: string; results: unknown } = await request.json();
    await env.DB.prepare(
      'INSERT INTO search_history (query, method, results) VALUES (?, ?, ?)'
    ).bind(body.query, body.method, JSON.stringify(body.results)).run();
    return Response.json({ success: true });
  }

  if (action === 'vector-search') {
    // FTS5 full-text search — free Vectorize alternative
    // Uses porter stemmer + unicode61 tokenizer for Indian stock names
    const q = url.searchParams.get('q') || '';
    if (!q) return Response.json({ data: [], error: null });

    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10'), 1), 50);
    const { results } = await env.DB.prepare(
      `SELECT e.*, rank
       FROM knowledge_fts f
       JOIN knowledge_entries e ON e.id = f.rowid
       WHERE knowledge_fts MATCH ?
       ORDER BY rank
       LIMIT ?`
    ).bind(q, limit).all();
    return Response.json({ data: results, error: null });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
};
