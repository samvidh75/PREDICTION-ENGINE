import express, { Request, Response } from 'express';
import { supabase } from '@/backend/db/client';
import { OrderBookAggregator } from '@/services/microstructure/OrderBookAggregator';
import { rateLimit } from '@/backend/middlewares/rateLimit';

const router = express.Router();
const aggregator = new OrderBookAggregator([{ name: 'upstox' }]);

// GET /api/orderbook/:ticker - Get current order book snapshot
router.get('/orderbook/:ticker', rateLimit(1000), async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;

    if (!ticker || ticker.length === 0) {
      return res.status(400).json({ error: 'Missing ticker parameter' });
    }

    const snapshot = aggregator.getSnapshot(ticker.toUpperCase());

    if (!snapshot) {
      return res.status(404).json({ error: `No order book for ${ticker}` });
    }

    return res.json(snapshot);
  } catch (error) {
    console.error('Error fetching order book:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orderbook/:ticker/history - Get order book history
router.get('/orderbook/:ticker/history', rateLimit(100), async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    if (!ticker) {
      return res.status(400).json({ error: 'Missing ticker' });
    }

    const { data, error, count } = await supabase
      .from('order_book_history')
      .select('*', { count: 'exact' })
      .eq('ticker', ticker.toUpperCase())
      .order('timestamp', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    return res.json({
      data,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: count,
      },
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orderbook/:ticker/depth - Get full depth (L2)
router.get('/orderbook/:ticker/depth', rateLimit(500), async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const orderBook = aggregator.getOrderBook(ticker.toUpperCase());

    if (!orderBook) {
      return res.status(404).json({ error: `No order book for ${ticker}` });
    }

    return res.json({
      ticker: orderBook.ticker,
      timestamp: orderBook.timestamp,
      bid: orderBook.bid.slice(0, 20), // Return top 20 levels
      ask: orderBook.ask.slice(0, 20),
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/microstructure/anomalies - Get recent anomalies
router.get('/microstructure/anomalies', rateLimit(200), async (req: Request, res: Response) => {
  try {
    const { ticker, severity, limit = 100 } = req.query;

    let query = supabase.from('anomalies').select('*');

    if (ticker) {
      query = query.eq('ticker', (ticker as string).toUpperCase());
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(Number(limit));

    if (error) {
      throw error;
    }

    return res.json(data);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
