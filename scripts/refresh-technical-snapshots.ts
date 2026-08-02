/**
 * refresh-technical-snapshots.ts
 *
 * Runs TechnicalSnapshotRefresh (src/stockstory/ingestion/) against real
 * EODHD historical OHLCV for the verified PSE universe (MasterCompanyRegistry)
 * and persists the results to technical_snapshots (migration 053).
 *
 * TechnicalSnapshotRefresh already computed real momentum (1m/3m/6m),
 * volatility, drawdown, RSI, MACD, ATR, and ADX from genuine high/low/close
 * data — it just had no PriceProvider or persistence wired to it. This
 * script is that wiring.
 *
 * Usage:
 *   tsx scripts/refresh-technical-snapshots.ts [--limit=50] [--dry-run]
 */
import 'dotenv/config';
import pool from '../src/db/index';
import MasterCompanyRegistry from '../src/services/data/MasterCompanyRegistry';
import { eodhdCandleProvider } from '../src/services/providers/EodhdCandleProvider';
import {
  TechnicalSnapshotRefresh,
  type TechnicalSnapshotFields,
} from '../src/stockstory/ingestion/TechnicalSnapshotRefresh';

class PersistedTechnicalSnapshotRefresh extends TechnicalSnapshotRefresh {
  protected async persistSnapshot(symbol: string, data: TechnicalSnapshotFields): Promise<void> {
    const tradeDate = new Date().toISOString().split('T')[0];
    await pool.query(
      `INSERT INTO technical_snapshots (
         symbol, trade_date, last_price, change_1d, momentum_1m, momentum_3m,
         momentum_6m, volatility_30d, drawdown_from_high, volume_trend,
         rsi_14, macd, macd_signal, atr_14, adx_14, price_vs_52w_high, price_vs_200dma
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (symbol, trade_date) DO UPDATE SET
         last_price = EXCLUDED.last_price, change_1d = EXCLUDED.change_1d,
         momentum_1m = EXCLUDED.momentum_1m, momentum_3m = EXCLUDED.momentum_3m,
         momentum_6m = EXCLUDED.momentum_6m, volatility_30d = EXCLUDED.volatility_30d,
         drawdown_from_high = EXCLUDED.drawdown_from_high, volume_trend = EXCLUDED.volume_trend,
         rsi_14 = EXCLUDED.rsi_14, macd = EXCLUDED.macd, macd_signal = EXCLUDED.macd_signal,
         atr_14 = EXCLUDED.atr_14, adx_14 = EXCLUDED.adx_14,
         price_vs_52w_high = EXCLUDED.price_vs_52w_high, price_vs_200dma = EXCLUDED.price_vs_200dma,
         computed_at = NOW()`,
      [
        symbol, tradeDate, data.lastPrice, data.change1d, data.momentum1m, data.momentum3m,
        data.momentum6m, data.volatility30d, data.drawdownFromHigh, data.volumeTrend,
        data.rsi14, data.macd, data.macdSignal, data.atr14, data.adx14,
        data.priceVs52wHigh, data.priceVs200Dma,
      ],
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;

  const symbols = MasterCompanyRegistry.getInstance().getAll().map((c) => c.symbol);

  const job = new PersistedTechnicalSnapshotRefresh(eodhdCandleProvider);
  const result = await job.run({ symbols, limit, dryRun });

  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[refresh-technical-snapshots] Fatal error:', err);
  process.exitCode = 1;
});
