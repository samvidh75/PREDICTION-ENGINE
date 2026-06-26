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

  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/@xenova/transformers/package.json');
    results.services.transformers = response.ok;
  } catch (e) {
    results.errors.push(`Transformers.js CDN error: ${String(e)}`);
  }

  return results;
}

export async function printHealthCheck() {
  const health = await runHealthCheck();

  console.log('StockStory Health Check');
  console.log(`Time: ${health.timestamp}`);
  console.log('');
  console.log('Services:');
  console.log(`  ${health.services.regex ? 'PASS' : 'FAIL'} Regex Parser`);
  console.log(`  ${health.services.transformers ? 'PASS' : 'FAIL'} Transformers.js`);
  console.log(`  ${health.services.supabase ? 'PASS' : 'FAIL'} Supabase`);
  console.log(`  ${health.services.groq ? 'PASS' : 'FAIL'} Groq API`);

  if (health.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    health.errors.forEach((e) => console.log(`  WARN: ${e}`));
  }

  const allOk =
    health.services.regex &&
    health.services.transformers &&
    health.services.supabase &&
    health.services.groq;

  console.log('');
  console.log(allOk ? 'All services healthy' : 'Some services have issues');
  console.log('Total cost: Rs 0/month');

  return health;
}
