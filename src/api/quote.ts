import { Router } from 'express';
import { quoteService } from '@/services';

const router = Router();

router.get('/:symbol', async (req, res) => {
  try {
    const quote = await quoteService.getQuoteWithCache(req.params.symbol);
    res.json({ success: true, data: quote, timestamp: new Date() });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: { code: 'QUOTE_NOT_FOUND', message: error.message },
      timestamp: new Date(),
    });
  }
});

export default router;
