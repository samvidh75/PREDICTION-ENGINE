import { Router } from 'express';
import { quoteService, historicalService, screenerService } from '@/services';
import { UnifiedEngine } from '@/engines';

const router = Router();

function computeRsi(closes: number[]): number | null {
  if (closes.length < 14) return null;
  const gains = [0]; const losses = [0];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const [quote, fundamentals, history] = await Promise.all([
      quoteService.getQuoteWithCache(symbol),
      screenerService.getFundamentals(symbol),
      historicalService.getHistoryWithCache(symbol, '1Y'),
    ]);

    const closes = history.map(h => h.close);
    const rsi = computeRsi(closes);

    const engineOutput = UnifiedEngine.evaluate({
      fundamentals,
      quote,
      technicals: { rsi, macd: null, macdSignal: null, macdHistogram: null, adx: null, atr: null, volatility: null, trendStrength: null },
    });

    res.json({
      success: true,
      data: {
        symbol,
        quote,
        fundamentals,
        score: engineOutput.score,
        scoreState: UnifiedEngine.getStateLabel(engineOutput.score),
        factors: engineOutput.components,
        confidence: engineOutput.confidence,
      },
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SNAPSHOT_ERROR', message: error.message },
      timestamp: new Date(),
    });
  }
});

export default router;
