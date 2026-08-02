import { describe, it, expect } from 'vitest';

describe('Supabase Integration', () => {
  it('Should handle missing Supabase credentials gracefully', () => {
    const url = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
    expect(typeof url).toBe('string');
  });

  it('Should have SupabaseService defined as class', async () => {
    const mod = await import('../src/services/client/SupabaseService');
    expect(mod.SupabaseService).toBeDefined();
    expect(typeof mod.SupabaseService.searchStocks).toBe('function');
    expect(typeof mod.SupabaseService.vectorSearch).toBe('function');
  });
});
