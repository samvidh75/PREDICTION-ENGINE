/**
 * System health routes — TRACK-35 Group D
 * GET /api/providers/health
 * GET /api/system/health
 * GET /api/stockstory/:symbol/explanation
 */
import { Router, Request, Response } from 'express';
import { getSystemHealthEngine } from '../../../ops/SystemHealthEngine';
import { getEnvironmentHealthEngine } from '../../../ops/EnvironmentHealthEngine';
import { getProviderMonitor } from '../../../monitoring/ProviderMonitor';
import { getRankingExplanationEngine } from '../../../explainability/RankingExplanationEngine';
import pool from '../../../db/index';

const router = Router();

router.get('/providers/health', async (_req: Request, res: Response) => {
  try {
    const stats = getProviderMonitor().getAllStats();
    let dbOk = false;
    try { await pool.query('SELECT 1'); dbOk = true; } catch {}
    res.json({
      status: dbOk ? 'ok' : 'degraded',
      providers: stats,
      database: dbOk ? 'connected' : 'unavailable',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({ status: 'degraded', message: 'Database unavailable', timestamp: new Date().toISOString() });
  }
});

router.get('/system/health', async (_req: Request, res: Response) => {
  try {
    const systemHealth = await getSystemHealthEngine().check();
    const envHealth = getEnvironmentHealthEngine().check();
    let dbOk = false;
    try { await pool.query('SELECT 1'); dbOk = true; } catch {}
    res.json({
      system: systemHealth,
      environment: envHealth,
      database: dbOk ? 'connected' : 'unavailable',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({ status: 'degraded', message: 'System health check failed', timestamp: new Date().toISOString() });
  }
});

router.get('/stockstory/:symbol/explanation', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
    const explanation = await getRankingExplanationEngine().explain(symbol);
    if (!explanation) {
      return res.status(404).json({ error: 'Symbol not found', symbol });
    }
    res.json(explanation);
  } catch (err: any) {
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: 'Symbol not found', symbol: req.params.symbol });
    }
    res.status(503).json({ status: 'degraded', message: err.message || 'Database unavailable', timestamp: new Date().toISOString() });
  }
});

export default router;
