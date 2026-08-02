// D1Service — Frontend adapter for D1 database (replaces SupabaseService)
// Calls Cloudflare Pages Functions which have D1 bindings

const D1_API = '/api/d1/stocks';

export class D1Service {
  static async searchStocks(criteria: {
    pe_max?: number;
    roe_min?: number;
    industry?: string;
  }) {
    const params = new URLSearchParams({ action: 'search' });
    if (criteria.pe_max) params.set('pe_max', String(criteria.pe_max));
    if (criteria.roe_min) params.set('roe_min', String(criteria.roe_min));
    if (criteria.industry) params.set('industry', criteria.industry);

    const res = await fetch(`${D1_API}?${params}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  }

  static async vectorSearch(query: string, limit = 10) {
    // FTS5 full-text search on knowledge_entries (free Vectorize alternative)
    const res = await fetch(`${D1_API}?action=vector-search&q=${encodeURIComponent(query)}&limit=${limit}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  }

  static async logSearch(query: string, method: string, results: unknown) {
    await fetch(`${D1_API}?action=log-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, method, results }),
    });
  }
}
