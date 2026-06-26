import { Router } from 'express';
import { newsService } from '@/services';

const router = Router();

router.get('/:symbol', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const items = await newsService.getNews(req.params.symbol, limit);
    res.json({ success: true, data: items, timestamp: new Date() });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'NEWS_ERROR', message: error.message },
      timestamp: new Date(),
    });
  }
});

export default router;
