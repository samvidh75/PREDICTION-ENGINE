import { Router } from 'express';
import { historicalService } from '@/services';

const router = Router();

router.get('/:symbol', async (req, res) => {
  try {
    const range = (req.query.range as string) || '1Y';
    const data = await historicalService.getHistoryWithCache(req.params.symbol, range);
    res.json({ success: true, data, timestamp: new Date() });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: { code: 'HISTORY_NOT_FOUND', message: error.message },
      timestamp: new Date(),
    });
  }
});

export default router;
