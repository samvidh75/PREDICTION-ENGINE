import { Router } from 'express';
import { IndianAPIProvider, YahooProvider, ScreenerProvider, UpstoxProvider } from '@/providers';
import { llmGateway } from '@/services/AI';

const SGLANG_URL = process.env.SGLANG_URL || 'http://localhost:30000';
const ROUTELLM_URL = process.env.ROUTELLM_URL || 'http://localhost:8000';

const router = Router();

router.get('/', async (_req, res) => {
  const providers = [
    new IndianAPIProvider(),
    new YahooProvider(),
    new ScreenerProvider(),
    new UpstoxProvider(),
  ];

  const statuses = await Promise.all(
    providers.map(async (p) => ({
      name: p.name,
      available: await p.isAvailable(),
    }))
  );

  res.json({
    success: true,
    data: { status: 'ok', providers: statuses },
    timestamp: new Date(),
  });
});

router.get('/llm-health', async (_req, res) => {
  const health = await llmGateway.health();
  const allHealthy = health.sglang && health.routellm;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    services: {
      sglang: { status: health.sglang ? 'ok' : 'down', url: SGLANG_URL },
      routellm: { status: health.routellm ? 'ok' : 'down', url: ROUTELLM_URL },
    },
    timestamp: new Date(),
  });
});

export default router;
