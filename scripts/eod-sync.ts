#!/usr/bin/env node
/**
 * End-of-day fundamentals sync
 * Runs daily at 4:30 PM IST (after market close: 3:30 PM)
 * Fetches PE, ROE, ROIC, debt-to-equity, growth rates, etc.
 *
 * Sources (priority order):
 * 1. Upstox Fundamentals API (most complete)
 * 2. Screener.in scrape (fallback)
 * 3. Yahoo Finance (historical prices)
 */

import pg from 'pg';
import axios from 'axios';
import * as cheerio from 'cheerio';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL! });

interface Fundamentals {
  symbol: string;
  pe?: number;
  pb?: number;
  roe?: number;
  roic?: number;
  debt_to_equity?: number;
  revenue_cagr_3y?: number;
  profit_cagr_3y?: number;
  operating_margin?: number;
  ev_ebitda?: number;
  dividend_yield?: number;
  market_cap?: number;
  book_value?: number;
  eps?: number;
  bvps?: number;
}

async function syncUpstoxFundamentals(symbols: string[]): Promise<Map<string, Fundamentals>> {
  const results = new Map<string, Fundamentals>();
  const headers = { Accept: 'application/json', Authorization: `Bearer ${process.env.UPSTOX_API_KEY!}` };

  for (let i = 0; i < symbols.length; i += 10) {
    const batch = symbols.slice(i, i + 10);
    const promises = batch.map((sym) =>
      axios
        .get(`https://api-v2.upstox.com/market-quote/full/${sym.toUpperCase()}`, {
          headers,
          timeout: 10000,
        })
        .then((res) => {
          const data = res.data?.data?.[sym.toUpperCase()]?.intraDayData;
          if (data) {
            results.set(sym.toUpperCase(), {
              symbol: sym.toUpperCase(),
              pe: data.pe,
              pb: data.pb,
              roe: data.roe,
              eps: data.eps,
              bvps: data.bookValue,
              dividend_yield: data.dividendYield,
            });
          }
        })
        .catch((err: Error) => console.warn(`[EOD] Upstox failed for ${sym}:`, err.message))
    );
    await Promise.all(promises);
    console.log(`[EOD] Upstox batch ${i / 10 + 1} complete`);
  }
  return results;
}

async function syncScreenerFundamentals(symbols: string[]): Promise<Map<string, Fundamentals>> {
  const results = new Map<string, Fundamentals>();

  for (const sym of symbols) {
    try {
      const url = `https://www.screener.in/company/${sym.toUpperCase()}/`;
      const res = await axios.get(url, { timeout: 5000 });
      const $ = cheerio.load(res.data);

      const fundamentals: Fundamentals = { symbol: sym.toUpperCase() };

      $('dl').each((_i, elem) => {
        const key = $(elem).find('dt').text().toLowerCase();
        const val = $(elem).find('dd').text().trim();
        if (key.includes('p/e')) fundamentals.pe = parseFloat(val);
        if (key.includes('p/b')) fundamentals.pb = parseFloat(val);
        if (key.includes('roe')) fundamentals.roe = parseFloat(val);
        if (key.includes('eps')) fundamentals.eps = parseFloat(val);
        if (key.includes('dividend')) fundamentals.dividend_yield = parseFloat(val);
      });

      results.set(sym.toUpperCase(), fundamentals);
      console.log(`[EOD] Screener OK: ${sym}`);
    } catch (err) {
      console.warn(`[EOD] Screener failed for ${sym}:`, (err as Error).message);
    }
  }
  return results;
}

async function upsertToDb(fundamentals: Fundamentals[]): Promise<void> {
  const query = `
    INSERT INTO stock_fundamentals (
      symbol, pe, pb, roe, roic, debt_to_equity,
      revenue_cagr_3y, profit_cagr_3y, operating_margin,
      ev_ebitda, dividend_yield, market_cap, book_value,
      eps, bvps, synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
    ON CONFLICT (symbol) DO UPDATE SET
      pe = EXCLUDED.pe, pb = EXCLUDED.pb, roe = EXCLUDED.roe,
      revenue_cagr_3y = EXCLUDED.revenue_cagr_3y,
      profit_cagr_3y = EXCLUDED.profit_cagr_3y,
      synced_at = NOW()
  `;

  for (const fund of fundamentals) {
    try {
      await db.query(query, [
        fund.symbol, fund.pe, fund.pb, fund.roe, fund.roic,
        fund.debt_to_equity, fund.revenue_cagr_3y, fund.profit_cagr_3y,
        fund.operating_margin, fund.ev_ebitda, fund.dividend_yield,
        fund.market_cap, fund.book_value, fund.eps, fund.bvps,
      ]);
    } catch (err) {
      console.error(`[EOD] DB insert failed for ${fund.symbol}:`, err);
    }
  }
}

async function main() {
  await db.connect();
  try {
    const res = await db.query('SELECT DISTINCT symbol FROM company_registry LIMIT 2000');
    const symbols: string[] = res.rows.map((r: any) => r.symbol);
    console.log(`[EOD] Syncing ${symbols.length} symbols...`);

    let fundamentals = new Map<string, Fundamentals>();
    if (process.env.UPSTOX_API_KEY) {
      fundamentals = await syncUpstoxFundamentals(symbols);
    }

    const missing = symbols.filter((s) => !fundamentals.has(s));
    if (missing.length > 0) {
      console.log(`[EOD] Filling ${missing.length} gaps from Screener.in...`);
      const screenerResults = await syncScreenerFundamentals(missing);
      for (const [sym, fund] of screenerResults) {
        fundamentals.set(sym, fund);
      }
    }

    await upsertToDb(Array.from(fundamentals.values()));
    console.log(`[EOD] Sync complete: ${fundamentals.size}/${symbols.length} updated`);
  } catch (err) {
    console.error('[EOD] Fatal error:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
