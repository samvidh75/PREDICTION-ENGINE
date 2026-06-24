/**
 * Daily provider accuracy check.
 *
 * Verifies quote price, company name, sector, industry, market cap, volume,
 * and updated timestamp for 10 major Indian stocks.
 */

import { writeFileSync } from 'node:fs';
import { MetadataProviderCoordinator } from '../services/providers/MetadataProviderCoordinator';
import { ProviderCoordinator } from '../services/providers/ProviderCoordinator';
import { DataIntegrityEngine } from '../services/data/DataIntegrityEngine';

const TARGET_SYMBOLS = [
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'SBIN',
  'ICICIBANK',
  'BHARTIARTL',
  'ITC',
  'HINDUNILVR',
  'LT',
];

function pass(value: boolean): 'PASS' | 'FAIL' {
  return value ? 'PASS' : 'FAIL';
}

function formatMarketCap(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'N/A';
  return `₹${(value / 10_000_000).toFixed(0)} Cr`;
}

async function runHealthCheck(): Promise<void> {
  const coordinator = new ProviderCoordinator();
  const integrity = new DataIntegrityEngine();
  const results: any[] = [];

  for (const symbol of TARGET_SYMBOLS) {
    let meta: any = null;
    let quote: any = null;
    let metadataError: string | null = null;
    let quoteError: string | null = null;

    try {
      meta = await MetadataProviderCoordinator.getMetadata(symbol);
    } catch (error) {
      metadataError = error instanceof Error ? error.message : 'Unknown metadata error';
    }

    try {
      quote = await coordinator.getQuote(symbol);
    } catch (error) {
      quoteError = error instanceof Error ? error.message : 'Unknown quote error';
    }

    const checks = {
      companyName: !!meta?.companyName && meta.companyName !== symbol && !meta.companyName.includes('BSE Listed Security Code'),
      sector: !!meta?.sector,
      industry: !!meta?.industry,
      marketCap: typeof meta?.marketCap === 'number' && meta.marketCap > 0,
      price: typeof quote?.price === 'number' && quote.price > 0,
      volume: typeof quote?.volume === 'number' && quote.volume >= 0,
      updatedAt: !!quote?.updatedAt && !Number.isNaN(new Date(quote.updatedAt).getTime()),
    };

    results.push({
      symbol,
      companyName: meta?.companyName || 'N/A',
      sector: meta?.sector || 'N/A',
      industry: meta?.industry || 'N/A',
      marketCap: meta?.marketCap ?? null,
      price: quote?.price ?? null,
      volume: quote?.volume ?? null,
      updatedAt: quote?.updatedAt || 'N/A',
      integrityStatus: meta ? integrity.scoreIntegrity(meta, meta.isin) : 'INVALID',
      checks,
      metadataError,
      quoteError,
    });
  }

  const timestamp = new Date().toISOString();
  const passedRows = results.filter((row) => Object.values(row.checks).every(Boolean)).length;

  let md = `# Daily Provider Health Report\n\n`;
  md += `Execution timestamp: ${timestamp}\n\n`;
  md += `Tested universe: ${TARGET_SYMBOLS.length} major Indian stocks\n\n`;
  md += `Overall result: ${passedRows}/${results.length} rows fully passed\n\n`;
  md += `| Symbol | Name | Sector | Industry | Market Cap | Price | Volume | Updated | Integrity | Row |\n`;
  md += `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;

  for (const row of results) {
    const rowPassed = Object.values(row.checks).every(Boolean);
    const price = typeof row.price === 'number' ? `₹${row.price.toFixed(2)}` : 'N/A';
    const volume = typeof row.volume === 'number' ? row.volume.toLocaleString('en-IN') : 'N/A';
    md += `| ${row.symbol} | ${row.companyName} | ${row.sector} | ${row.industry} | ${formatMarketCap(row.marketCap)} | ${price} | ${volume} | ${row.updatedAt} | ${row.integrityStatus} | ${pass(rowPassed)} |\n`;
  }

  md += `\n## Field Checks\n\n`;
  for (const row of results) {
    md += `### ${row.symbol}\n`;
    md += `- Company name: ${pass(row.checks.companyName)}\n`;
    md += `- Sector: ${pass(row.checks.sector)}\n`;
    md += `- Industry: ${pass(row.checks.industry)}\n`;
    md += `- Market cap: ${pass(row.checks.marketCap)}\n`;
    md += `- Quote price: ${pass(row.checks.price)}\n`;
    md += `- Volume: ${pass(row.checks.volume)}\n`;
    md += `- Updated time: ${pass(row.checks.updatedAt)}\n`;
    if (row.metadataError) md += `- Metadata error: ${row.metadataError}\n`;
    if (row.quoteError) md += `- Quote error: ${row.quoteError}\n`;
    md += `\n`;
  }

  writeFileSync('DailyProviderHealthReport.md', md, 'utf8');
  console.log(`DailyProviderHealthReport.md written. Fully passed rows: ${passedRows}/${results.length}`);
}

runHealthCheck().catch((error) => {
  console.error('Provider health check failed:', error);
  process.exitCode = 1;
});
