/**
 * Rich Screener.in ingestion for company fundamentals and statement tables.
 * Usage:
 *   npx tsx scripts/ingest-screener.ts RELIANCE TCS
 *   npx tsx scripts/ingest-screener.ts --all
 *   npx tsx scripts/ingest-screener.ts --output ./tmp/screener.json RELIANCE
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ScreenerParser } from '../src/services/providers/parsers/ScreenerParser';

interface ScreenerIngestionRecord {
  symbol: string;
  url: string;
  fetchedAt: string;
  companyName: string;
  sector: string;
  industry: string;
  isin?: string;
  ratios: Record<string, string>;
  quarterlyResults: Array<Record<string, string>>;
  annualProfitLoss: Array<Record<string, string>>;
  balanceSheet: Array<Record<string, string>>;
  cashFlow: Array<Record<string, string>>;
  shareholding: {
    promoterHolding: string | null;
    institutionalHolding: string | null;
    publicHolding: string | null;
    pledgedPromoterHolding: string | null;
  };
  corporateActions: Array<{
    actionType: string;
    exDate: string;
    recordDate: string | null;
    valueText: string | null;
  }>;
}

const DEFAULT_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'ITC', 'SBIN', 'BHARTIARTL',
  'LT', 'KOTAKBANK', 'AXISBANK', 'SUNPHARMA',
];

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8377;|₹/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseHtmlTable(tableHtml: string): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      row.push(decodeHtml(stripTags(cellMatch[1])));
    }
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

function findTableNearHeading(html: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`${escaped}[\\s\\S]{0,5000}?<table[^>]*class="[^"]*data-table[^"]*"[^>]*>([\\s\\S]*?)<\\/table>`, 'i'));
  return match?.[1] ?? null;
}

function rowsToRecords(rows: string[][]): Array<Record<string, string>> {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header || `col${index}`] = row[index] ?? '';
    });
    return record;
  });
}

async function fetchScreenerPage(symbol: string): Promise<{ url: string; html: string }> {
  const candidates = [
    `https://www.screener.in/company/${symbol}/consolidated/`,
    `https://www.screener.in/company/${symbol}/`,
  ];

  for (const url of candidates) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockStory/1.0; +https://stockstory-india.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.ok) {
      return { url, html: await response.text() };
    }
  }

  throw new Error(`No Screener page returned for ${symbol}`);
}

function parseRecord(symbol: string, url: string, html: string): ScreenerIngestionRecord {
  const parser = new ScreenerParser();
  const parsed = parser.parseRatiosPage(html);
  const quarterlyResults = rowsToRecords(parseHtmlTable(findTableNearHeading(html, 'Quarterly Results') ?? ''));
  const annualProfitLoss = rowsToRecords(parseHtmlTable(findTableNearHeading(html, 'Profit & Loss') ?? ''));
  const balanceSheet = rowsToRecords(parseHtmlTable(findTableNearHeading(html, 'Balance Sheet') ?? ''));
  const cashFlow = rowsToRecords(parseHtmlTable(findTableNearHeading(html, 'Cash Flow') ?? ''));
  return {
    symbol,
    url,
    fetchedAt: new Date().toISOString(),
    companyName: parsed.companyName,
    sector: parsed.sector,
    industry: parsed.industry,
    isin: parsed.isin,
    ratios: parsed.ratios,
    quarterlyResults: quarterlyResults.length > 0 ? quarterlyResults : parsed.quarterlyResults,
    annualProfitLoss: annualProfitLoss.length > 0 ? annualProfitLoss : parsed.profitLoss,
    balanceSheet: balanceSheet.length > 0 ? balanceSheet : parsed.balanceSheet,
    cashFlow: cashFlow.length > 0 ? cashFlow : parsed.cashFlow,
    shareholding: parser.parseShareholding(html),
    corporateActions: parser.parseCorporateActions(html),
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  let outputPath = '';
  if (outputIndex !== -1) {
    outputPath = args[outputIndex + 1] ?? '';
    args.splice(outputIndex, 2);
  }

  const all = args.includes('--all');
  const symbols = all
    ? DEFAULT_SYMBOLS
    : args.filter((value) => !value.startsWith('--')).map((value) => value.toUpperCase());

  return { outputPath, symbols };
}

async function main(): Promise<void> {
  const { outputPath, symbols } = parseArgs();
  if (symbols.length === 0) {
    console.error('Usage: npx tsx scripts/ingest-screener.ts [symbol1 symbol2 ...] --all --output ./path.json');
    process.exit(1);
  }

  const records: ScreenerIngestionRecord[] = [];

  for (const symbol of symbols) {
    process.stdout.write(`Fetching ${symbol}... `);
    try {
      const { url, html } = await fetchScreenerPage(symbol);
      const record = parseRecord(symbol, url, html);
      records.push(record);
      console.log(`OK (${Object.keys(record.ratios).length} ratios, ${record.annualProfitLoss.length} annual rows, ${record.quarterlyResults.length} quarterly rows)`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.log(`FAIL (${detail.slice(0, 80)})`);
    }

    if (symbols.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  const output = JSON.stringify(records, null, 2);
  if (outputPath) {
    const abs = resolve(outputPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, output, 'utf8');
    console.log(`\nWrote ${records.length} records to ${abs}`);
  } else {
    console.log(`\n${output}`);
  }

  console.log(`\nDone. ${records.length}/${symbols.length} symbols ingested.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
