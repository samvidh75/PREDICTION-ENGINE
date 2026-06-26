import { Router } from 'express';
import { sglangService } from '../services/AI/SGLangService';

const SGLANG_API = process.env.SGLANG_URL || 'http://localhost:30000';

const router = Router();

router.get('/llm-health', async (_req, res) => {
  const sglangHealthy = await sglangService.health();

  res.status(sglangHealthy ? 200 : 503).json({
    status: sglangHealthy ? 'ok' : 'degraded',
    services: {
      sglang: {
        status: sglangHealthy ? 'ok' : 'down',
        url: SGLANG_API,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
