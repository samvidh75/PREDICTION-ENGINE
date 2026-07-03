#!/usr/bin/env node
/**
 * Sync all NSE symbols to company_registry
 * Runs weekly (Sunday 6:30 PM IST)
 * Covers NIFTY 500, MidCap, SmallCap indices
 */

import pg from 'pg';
import axios from 'axios';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL! });

interface Company {
  symbol: string;
  name: string;
  sector: string;
  market_cap?: number;
  listed_date?: string;
  isin?: string;
}

async function fetchNSESymbols(): Promise<Company[]> {
  const companies: Company[] = [];

  try {
    const res = await axios.get(
      'https://www.nseindia.com/content/indices/ind_nifty500list.csv',
      { timeout: 10000 }
    );

    const lines = res.data.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 2) continue;
      companies.push({
        symbol: parts[0].trim(),
        name: parts[1].trim(),
        sector: parts[3] || 'Unknown',
        isin: parts[2] || undefined,
      });
    }
  } catch (err) {
    console.warn('[Universe] NSE CSV failed, trying Upstox...', (err as Error).message);
    try {
      const res = await axios.get(
        'https://api-v2.upstox.com/market/instruments/?instrument_type=EQUITY',
        {
          timeout: 10000,
          headers: { Authorization: `Bearer ${process.env.UPSTOX_API_KEY!}` },
        }
      );

      for (const item of res.data.data || []) {
        if (item.exchange === 'NSE') {
          companies.push({
            symbol: item.symbol,
            name: item.name,
            sector: item.sector || 'Unknown',
            isin: item.isin,
          });
        }
      }
    } catch (err2) {
      console.error('[Universe] Both sources failed:', err2);
      throw err2;
    }
  }

  return companies;
}

async function upsertRegistry(companies: Company[]): Promise<void> {
  const query = `
    INSERT INTO company_registry (
      symbol, name, sector, market_cap, listed_date, isin
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (symbol) DO UPDATE SET
      name = EXCLUDED.name,
      sector = EXCLUDED.sector,
      updated_at = NOW()
  `;

  let count = 0;
  for (const co of companies) {
    try {
      await db.query(query, [
        co.symbol, co.name, co.sector, co.market_cap, co.listed_date, co.isin,
      ]);
      count++;
    } catch (err) {
      console.error(`[Universe] Insert failed for ${co.symbol}:`, err);
    }
  }
  console.log(`[Universe] Upserted ${count}/${companies.length} companies`);
}

async function validateCHENNPETRO(): Promise<boolean> {
  const res = await db.query(
    "SELECT symbol FROM company_registry WHERE symbol = 'CHENNPETRO'"
  );
  return res.rows.length > 0;
}

async function main() {
  await db.connect();
  try {
    console.log('[Universe] Fetching NSE symbols...');
    const companies = await fetchNSESymbols();
    console.log(`[Universe] Fetched ${companies.length} companies`);

    await upsertRegistry(companies);

    const hasChennpetro = await validateCHENNPETRO();
    if (hasChennpetro) {
      console.log('[Universe] CHENNPETRO verified in registry');
    } else {
      console.warn('[Universe] CHENNPETRO not found!');
    }
  } catch (err) {
    console.error('[Universe] Fatal error:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
