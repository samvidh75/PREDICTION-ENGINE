export async function runHealthCheck() {
  const results = {
    timestamp: new Date().toISOString(),
    services: {
      supabase: false,
      groq: false,
      transformers: false,
      regex: true,
    },
    errors: [] as string[],
  };

  const supabaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
  const supabaseKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';
  const groqKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GROQ_API_KEY) || '';

  try {
    if (supabaseUrl && supabaseKey) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/stocks?limit=1`,
        { headers: { apikey: supabaseKey } }
      );
      results.services.supabase = response.ok;
    }
  } catch (e) {
    results.errors.push(`Supabase error: ${String(e)}`);
  }

  try {
    if (groqKey) {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey}` },
      });
      results.services.groq = response.ok;
    }
  } catch (e) {
    results.errors.push(`Groq error: ${String(e)}`);
  }

  results.services.transformers = false;

  return results;
}

export async function printHealthCheck() {
  const health = await runHealthCheck();

  return health;
}
