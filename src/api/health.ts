import { Router } from 'express';
import { IndianAPIProvider, YahooProvider, ScreenerProvider, UpstoxProvider } from '@/providers';

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

export default router;
