// src/services/market/websocketDataProducer.ts
// WebSocket data producer — polls Postgres for latest prices and broadcasts to connected clients.
// Runs as a background interval on the server side.

import { dbAdapter } from "../../db/DatabaseAdapter";

const POLL_INTERVAL_MS = 5_000; // 5 seconds
const BATCH_SIZE = 50; // tickers per batch

let producerInterval: ReturnType<typeof setInterval> | null = null;
let lastPollTime = 0;

interface TickerTick {
  ticker: string;
  price: number;
  change_pct: number;
}

/**
 * Query the latest candle prices from PostgreSQL for a batch of tickers.
 */
async function fetchLatestPrices(): Promise<TickerTick[]> {
  try {
    // Get the most recent candle for each ticker
    // We query a wider set and let the database handle deduplication
    // DISTINCT ON is Postgres-only (SQLite — the local/offline fallback
    // dbAdapter can use — throws "near ON: syntax error" on it). Rewritten
    // with ROW_NUMBER() OVER (PARTITION BY ...), which both dialects support
    // (already the pattern used in MarketActionService.ts).
    const result = await dbAdapter.query(
      `WITH ranked AS (
        SELECT
          ticker,
          close as price,
          ROUND(((close - open) / NULLIF(open, 0)) * 100, 2) as change_pct,
          ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY date DESC) AS rn
        FROM asset_historical_candles
        WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      )
      SELECT ticker, price, change_pct FROM ranked WHERE rn = 1 LIMIT $1`,
      [BATCH_SIZE]
    );

    return (result.rows || []) as unknown as TickerTick[];
  } catch (err) {
    console.error("[ws-producer] Failed to fetch latest prices:", err);
    return [];
  }
}

/**
 * Start the WebSocket data producer.
 * Polls PostgreSQL periodically and broadcasts price ticks to all connected WebSocket clients.
 */
export function startWebSocketDataProducer(broadcastFn: (ticker: string, price: number, changePct: number) => void): void {
  if (producerInterval) return; // already running


  producerInterval = setInterval(async () => {
    const now = Date.now();
    if (now - lastPollTime < POLL_INTERVAL_MS) return;
    lastPollTime = now;

    try {
      const ticks = await fetchLatestPrices();
      if (ticks.length === 0) return;

      for (const tick of ticks) {
        broadcastFn(tick.ticker, tick.price, tick.change_pct);
      }
    } catch (err) {
      console.error("[ws-producer] Error in poll cycle:", err);
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the WebSocket data producer.
 */
export function stopWebSocketDataProducer(): void {
  if (producerInterval) {
    clearInterval(producerInterval);
    producerInterval = null;
  }
}
