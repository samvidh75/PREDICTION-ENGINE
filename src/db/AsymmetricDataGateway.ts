/**
 * AsymmetricDataGateway — zero-cost web data ingestion cache layer.
 *
 * Bridges free public web endpoints (Yahoo Finance, Screener.in) into
 * the canonical Neon PostgreSQL cache tables (asset_historical_candles,
 * asset_fundamental_ratios). Checks Postgres first; only hits the web
 * when the cache is stale or missing.
 *
 * Tables:  039_asymmetric_cache.sql migration
 * Adapter: src/db/DatabaseAdapter.ts (canonical DatabaseAdapter)
 */
import { dbAdapter } from "./DatabaseAdapter";

interface MarketCachePayload {
  ticker: string;
  price: number;
  change_pct: number;
  context_snippet: string;
}

export class AsymmetricDataGateway {
  private static CACHE_WINDOW_SECONDS = 60;

  /**
   * Core transactional gateway. Checks Neon Postgres cache for a fresh
   * asset profile snapshot; if missing or stale, fetches from Yahoo Finance
   * and upserts the results back into the cache tables.
   */
  public static async getSynchronizedMarketPacket(
    ticker: string,
  ): Promise<MarketCachePayload> {
    const symbol = ticker.toUpperCase().trim();
    const currentUnixTime = Math.floor(Date.now() / 1000);

    try {
      // 1. Check Neon Postgres cache for fresh fundamental ratios
      const cachedRatios = await dbAdapter.query(
        `SELECT *, EXTRACT(EPOCH FROM last_updated) AS updated_epoch
         FROM asset_fundamental_ratios
         WHERE ticker = $1`,
        [symbol],
      );

      // 2. Fetch the single most recent candle close from history table
      const latestCandle = await dbAdapter.query(
        `SELECT close FROM asset_historical_candles
         WHERE ticker = $1
         ORDER BY timestamp DESC
         LIMIT 1`,
        [symbol],
      );

      const rows = cachedRatios.rows as Record<string, unknown>[];
      const candleRows = latestCandle.rows as Record<string, unknown>[];
      const hasFreshCache =
        rows.length > 0 &&
        typeof rows[0].updated_epoch === "number" &&
        currentUnixTime - (rows[0].updated_epoch as number) <
          this.CACHE_WINDOW_SECONDS;

      if (hasFreshCache && candleRows.length > 0) {
        const row = rows[0];
        return {
          ticker: symbol,
          price: Number(candleRows[0].close),
          change_pct: 1.25,
          context_snippet: [
            `M-Cap: ${row.market_cap_cr}Cr`,
            `P/E: ${row.pe_ratio}`,
            `D/E: ${row.debt_to_equity}`,
            `Pledge: ${row.promoter_pledged_pct}%`,
            `Auditor: ${row.auditor_remarks}`,
          ].join(" | "),
        };
      }

      // 3. Cache stale or missing — execute free web extraction
      return await this.executeWebIngestionSync(symbol);
    } catch (error) {
      console.error(
        `[asymmetric] Database error querying cache for ${symbol}:`,
        error,
      );
      return {
        ticker: symbol,
        price: 0,
        change_pct: 0,
        context_snippet: "Data sync line currently re-routing.",
      };
    }
  }

  /**
   * Fetches live data from Yahoo Finance public endpoint and upserts
   * the result into the Neon Postgres cache tables. No auth required.
   */
  private static async executeWebIngestionSync(
    ticker: string,
  ): Promise<MarketCachePayload> {
    const yahooWebUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.NS?interval=1d&range=1mo`;

    try {
      const response = await fetch(yahooWebUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        throw new Error(`Yahoo returned HTTP ${response.status}`);
      }
      const webData = (await response.json()) as Record<string, unknown>;

      const chart = (webData as any).chart?.result?.[0];
      if (!chart) throw new Error("No chart result in Yahoo response");

      const meta = chart.meta;
      const currentPrice: number = meta.regularMarketPrice ?? 0;
      const prevClose: number = meta.chartPreviousClose ?? currentPrice;
      const changePct =
        prevClose > 0
          ? ((currentPrice - prevClose) / prevClose) * 100
          : 0;

      // Upsert baseline fundamental parameters into the cache table
      // Only update if no existing data (Python scripts are the source of truth for fundamentals)
      await dbAdapter.query(
        `INSERT INTO asset_fundamental_ratios
           (ticker, market_cap_cr, pe_ratio, debt_to_equity,
            promoter_pledged_pct, auditor_remarks, last_updated)
         VALUES ($1, NULL, NULL, NULL, NULL, 'Pending background ingestion', NOW())
         ON CONFLICT (ticker) DO NOTHING`,
        [ticker],
      );

      // Seed a historical candle node to maintain chart parity
      await dbAdapter.query(
        `INSERT INTO asset_historical_candles
           (ticker, timestamp, open, high, low, close, volume)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (ticker, timestamp) DO NOTHING`,
        [
          ticker,
          meta.regularMarketTime ?? Math.floor(Date.now() / 1000),
          currentPrice,
          currentPrice,
          currentPrice,
          currentPrice,
          meta.regularMarketVolume ?? 0,
        ],
      );

      return {
        ticker,
        price: currentPrice,
        change_pct: Number(changePct.toFixed(2)),
        context_snippet:
          "Fundamentals pending background ingestion. Price data sourced from Yahoo Finance.",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`External unauthenticated cloud parsing failure: ${message}`, { cause: err });
    }
  }

  /**
   * Phase 42: Client-contributed cache loop.
   *
   * Returns fresh cache data, or signals the client browser to fetch
   * live public data and push it back via /api/v1/sync-cache.
   */
  public static async processMarketRequest(
    ticker: string,
  ): Promise<{
    status: "success" | "stale";
    source: string;
    payload?: Record<string, any>;
    message?: string;
  }> {
    const symbol = ticker.toUpperCase().trim();
    const cacheWindowSeconds = 60;
    const currentUnix = Math.floor(Date.now() / 1000);

    try {
      const result = await dbAdapter.query(
        `SELECT *, EXTRACT(EPOCH FROM last_updated) as updated_epoch
         FROM asset_fundamental_ratios WHERE ticker = $1`,
        [symbol],
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const updatedEpoch = Number(row.updated_epoch || 0);
        const isFresh = currentUnix - updatedEpoch < cacheWindowSeconds;

        if (isFresh) {
          return {
            status: "success",
            source: "server_postgres_cache",
            payload: row,
          };
        }
      }

      return {
        status: "stale",
        source: "client_execution_required",
        message:
          "Database record expired. Client browser required to fetch public web metrics and update core cache.",
      };
    } catch {
      return {
        status: "stale",
        source: "client_execution_required",
        message: "Cache unavailable. Client-side fetch required.",
      };
    }
  }

  /**
   * Upserts data contributed by a client browser after a live web fetch.
   * Called by the POST /api/v1/sync-cache endpoint.
   */
  public static async handleClientCacheContribution(
    ticker: string,
    payload: {
      price: number;
      change_pct: number;
      market_cap_cr?: number;
      pe_ratio?: number;
      debt_to_equity?: number;
      close?: number;
      volume?: number;
    },
  ): Promise<{ status: string }> {
    const symbol = ticker.toUpperCase().trim();
    const currentPrice = payload.price || payload.close || 0;
    const volume = payload.volume || 0;
    const now = Math.floor(Date.now() / 1000);

    // Upsert fundamentals
    await dbAdapter.query(
      `INSERT INTO asset_fundamental_ratios
         (ticker, market_cap_cr, pe_ratio, debt_to_equity, last_updated)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (ticker) DO UPDATE SET
         market_cap_cr = COALESCE(EXCLUDED.market_cap_cr, asset_fundamental_ratios.market_cap_cr),
         pe_ratio = COALESCE(EXCLUDED.pe_ratio, asset_fundamental_ratios.pe_ratio),
         debt_to_equity = COALESCE(EXCLUDED.debt_to_equity, asset_fundamental_ratios.debt_to_equity),
         last_updated = NOW()`,
      [symbol, payload.market_cap_cr ?? null, payload.pe_ratio ?? null, payload.debt_to_equity ?? null],
    );

    // Upsert candle
    await dbAdapter.query(
      `INSERT INTO asset_historical_candles (ticker, timestamp, open, high, low, close, volume)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (ticker, timestamp) DO UPDATE SET
         close = EXCLUDED.close, volume = EXCLUDED.volume`,
      [symbol, now, currentPrice, currentPrice, currentPrice, currentPrice, volume],
    );

    return { status: "ok" };
  }
}
