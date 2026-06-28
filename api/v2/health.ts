// api/v2/health.ts
// Unified provider health dashboard
// GET /api/v2/health

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ProviderHealthResult {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTimeMs: number;
  failureCount: number;
  successRate: number;
  lastError?: string;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const providers: ProviderHealthResult[] = [];
  const now = Date.now();

  // Check Trendlyne (best-effort)
  try {
    const start = Date.now();
    const resp = await fetch('https://trendlyne.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
    });
    providers.push({
      name: 'trendlyne',
      status: resp.ok ? 'healthy' : 'down',
      lastCheck: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      failureCount: 0,
      successRate: resp.ok ? 1 : 0,
      lastError: resp.ok ? undefined : `HTTP ${resp.status}`,
    });
  } catch (err) {
    providers.push({
      name: 'trendlyne',
      status: 'down',
      lastCheck: new Date().toISOString(),
      responseTimeMs: Date.now() - now,
      failureCount: 1,
      successRate: 0,
      lastError: err instanceof Error ? err.message : String(err),
    });
  }

  const overall: 'healthy' | 'degraded' | 'down' =
    providers.some(h => h.status === 'down') ? 'down' :
    providers.some(h => h.status === 'degraded') ? 'degraded' : 'healthy';

  return res.status(200).json({
    success: true,
    overall,
    providers,
    timestamp: new Date().toISOString(),
  });
}
