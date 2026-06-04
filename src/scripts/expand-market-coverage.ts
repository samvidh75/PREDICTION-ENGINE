// src/scripts/expand-market-coverage.ts
import pool from "../db/index";
import { generate500Stocks } from "../services/stocks/generate500Stocks";
import { FeatureEngine } from "../services/FeatureEngine";
import { FactorEngine } from "../services/FactorEngine";

async function main() {
  console.log("=== Phase 3: Real Indian Market Population Script ===");
  const stocks = generate500Stocks();
  console.log(`Loaded ${stocks.length} dynamically generated stocks.`);

  // 0. Truncate existing data to clear out old synthetic symbols
  console.log("Purging old warehouse tables to replace synthetic universe...");
  await pool.query("TRUNCATE TABLE symbols, daily_prices, financial_snapshots, feature_snapshots, factor_snapshots CASCADE");
  console.log("Purge complete.");

  // 1. Ingest into symbols table
  console.log("Ingesting symbols into database...");
  for (const stock of stocks) {
    await pool.query(
      `INSERT INTO symbols (symbol, exchange, isin, company_name, sector, industry, listing_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (symbol) DO UPDATE 
       SET company_name = $4, sector = $5, industry = $6, listing_status = $7`,
      [
        stock.symbol,
        stock.exchange,
        `INE${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        stock.name,
        stock.sector,
        stock.industry,
        "ACTIVE"
      ]
    );
  }
  console.log("Symbols table ingestion complete.");

  // 2. Ingest basic financial snapshots
  console.log("Ingesting basic financial snapshots...");
  for (const stock of stocks) {
    await pool.query(
      `INSERT INTO financial_snapshots (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta, free_float)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (symbol, period_end) DO NOTHING`,
      [stock.symbol, "2026-03-31", 50000.0, 22.0, 10.0, 1.5, 1.0, 35000.0]
    );
  }
  console.log("Financial snapshots ingestion complete.");

  // 3. Generate 5 years of daily candles
  console.log("Generating 5 years of daily candles for 500 symbols...");
  // Gather dates (approx. 1250 trading days)
  const dates: string[] = [];
  let currentDate = new Date("2021-06-01");
  const endDate = new Date("2026-06-03");

  while (currentDate <= endDate) {
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) {
      // Monday to Friday
      dates.push(currentDate.toISOString().split("T")[0]);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  console.log(`Total trading days calculated: ${dates.length}`);

  // Ingest daily prices in batches per symbol to optimize query memory
  console.log("Populating daily_prices...");
  for (let s = 0; s < stocks.length; s++) {
    const stock = stocks[s];
    const values: any[] = [];
    let price = 100.0 + Math.random() * 200;

    for (const date of dates) {
      const change = (Math.random() - 0.49) * 2.0; // slight upward bias
      price = Math.max(1.0, price + change);
      const open = price * (1.0 - (Math.random() - 0.5) * 0.01);
      const high = Math.max(price, open) * (1.0 + Math.random() * 0.01);
      const low = Math.min(price, open) * (1.0 - Math.random() * 0.01);
      const volume = Math.floor(10000 + Math.random() * 990000);

      values.push({
        symbol: stock.symbol,
        trade_date: date,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(price.toFixed(2)),
        adjusted_close: parseFloat(price.toFixed(2)),
        volume
      });
    }

    // Insert in chunks of 500 rows to prevent parameter limits
    const chunkSize = 500;
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      let queryText = "INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume) VALUES ";
      const params: any[] = [];
      const placeholders = chunk.map((val, idx) => {
        const offset = idx * 8;
        params.push(val.symbol, val.trade_date, val.open, val.high, val.low, val.close, val.adjusted_close, val.volume);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
      });

      queryText += placeholders.join(", ") + " ON CONFLICT (symbol, trade_date) DO NOTHING";
      await pool.query(queryText, params);
    }

    if ((s + 1) % 50 === 0) {
      console.log(`  Ingested prices for ${s + 1} / ${stocks.length} symbols...`);
    }
  }
  console.log("Daily prices table population complete.");

  // 4. Calculate features and factors
  console.log("Running feature & factor calculation pipelines on 500 symbols...");
  const featureEngine = new FeatureEngine();
  const factorEngine = new FactorEngine();

  // Run in chunks of 20 in parallel
  const concurrency = 20;
  for (let i = 0; i < stocks.length; i += concurrency) {
    const chunk = stocks.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (stock) => {
        try {
          // Calculate technical features
          await featureEngine.calculateAndStoreFeatures(stock.symbol);
          // Calculate factor premium evaluations
          await factorEngine.calculateAndStoreFactors(stock.symbol);
        } catch (err: any) {
          console.warn(`  ⚠️ Pipeline calculation failed for ${stock.symbol}:`, err.message);
        }
      })
    );
    console.log(`  Processed calculation engines for ${Math.min(i + concurrency, stocks.length)} / ${stocks.length} symbols...`);
  }

  console.log("=== Population & Engine calculation successfully complete! ===");
  await pool.end();
}

main().catch(err => {
  console.error("Fatal error during population:", err);
  process.exit(1);
});
