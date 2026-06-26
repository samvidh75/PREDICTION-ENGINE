import { Router } from 'express';
import { screenerService } from '@/services';
import { UnifiedEngine } from '@/engines';
import { NIFTY_50_SYMBOLS } from '@/config/providers';
import type { Quote } from '@/types';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const results: Array<{
      symbol: string; score: number; scoreState: string; price: number;
      change: number; changePercent: number; sector: string; marketCap: number | null;
    }> = [];

    for (const symbol of NIFTY_50_SYMBOLS) {
      const fundamentals = await screenerService.getFundamentals(symbol);
      if (!fundamentals) continue;

      const mockQuote: Quote = {
        symbol, price: 0, change: 0, changePercent: 0,
        open: null, high: null, low: null, volume: null,
        timestamp: new Date(), source: 'indianapi',
      };

      const engineOutput = UnifiedEngine.evaluate({
        fundamentals,
        quote: mockQuote,
      });

      results.push({
        symbol,
        score: engineOutput.score,
        scoreState: UnifiedEngine.getStateLabel(engineOutput.score),
        price: 0,
        change: 0,
        changePercent: 0,
        sector: fundamentals.sector ?? '',
        marketCap: fundamentals.marketCap,
      });
    }

    results.sort((a, b) => b.score - a.score);

    res.json({ success: true, data: results, timestamp: new Date() });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SCANNER_ERROR', message: error.message },
      timestamp: new Date(),
    });
  }
});

export default router;
