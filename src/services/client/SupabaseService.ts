import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
const supabaseKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseService {
  static async searchStocks(criteria: {
    pe_max?: number;
    roe_min?: number;
    industry?: string;
  }) {
    let query = supabase.from('stocks').select('*');

    if (criteria.pe_max) {
      query = query.lte('pe_ratio', criteria.pe_max);
    }

    if (criteria.roe_min) {
      query = query.gte('roe', criteria.roe_min);
    }

    if (criteria.industry) {
      query = query.eq('industry', criteria.industry);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;
    return data;
  }

  static async vectorSearch(embedding: number[], limit = 10) {
    const { data, error } = await supabase.rpc('match_stocks', {
      embedding,
      match_count: limit,
    });

    if (error) throw error;
    return data;
  }

  static async logSearch(query: string, method: string, results: any) {
    await supabase.from('search_history').insert({
      query,
      method,
      results,
    });
  }
}
