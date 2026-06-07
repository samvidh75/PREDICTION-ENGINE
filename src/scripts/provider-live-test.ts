#!/usr/bin/env tsx
// src/scripts/provider-live-test.ts

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { YahooProvider } from '../services/providers/YahooProvider';
import { FinnhubProvider } from '../services/providers/FinnhubProvider';
import { IndianMarketProvider } from '../services/providers/IndianMarketProvider';
import { ProviderCoordinator } from '../services/providers/ProviderCoordinator';
import { DataValidationEngine } from '../services/data/DataValidationEngine';

dotenv.config();

const requiredEnvVars = ['FINNHUB_KEY', 'INDIANAPI_KEY', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Critical Error: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SYMBOLS = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'HAL.NS'];
const REPORTS_DIR = join(__dirname, '..', '..', 'reports');

function ensureReportsDir() {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

function writeReport(name: string, data: any) {
  const path = join(REPORTS_DIR, name);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Report written: ${path}`);
}

interface TestResult {
  symbol: string;
  provider: string;
  endpoint: string;
  requestTime: string;
  durationMs: number;
  success: boolean;
  recordsReturned: number;
  error?: string;
  sample?: any;
}

async function runTest(
  providerName: string,
  symbol: string,
  endpoint: string,
  fn: () => Promise<any>,
): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await fn();
    const records = Array.isArray(result) ? result.length : result ? 1 : 0;
    return {
      symbol,
      provider: providerName,
      endpoint,
      requestTime: new Date().toISOString(),
      durationMs: Date.now() - start,
      success: true,
      recordsReturned: records,
      sample: Array.isArray(result) ? result.slice(0, 2) : result,
    };
  } catch (err: any) {
    return {
      symbol,
      provider: providerName,
      endpoint,
      requestTime: new Date().toISOString(),
      durationMs: Date.now() - start,
      success: false,
      recordsReturned: 0,
      error: err?.message || String(err),
    };
  }
}

async function testYahoo(): Promise<TestResult[]> {
  const yahoo = new YahooProvider();
  const results: TestResult[] = [];
  for (const sym of SYMBOLS) {
    results.push(await runTest('YahooProvider', sym, 'getQuote', () => yahoo.getQuote(sym)));
    results.push(await runTest('YahooProvider', sym, 'getMetadata', () => yahoo.getMetadata(sym)));
    results.push(await runTest('YahooProvider', sym, 'getHistorical', () => yahoo.getHistorical(sym, '1M')));
    await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

async function testFinnhub(): Promise<TestResult[]> {
  const finnhub = new FinnhubProvider();
  const results: TestResult[] = [];
  for (const sym of SYMBOLS) {
    results.push(await runTest('FinnhubProvider', sym, 'getMetadata', () => finnhub.getMetadata(sym)));
    results.push(await runTest('FinnhubProvider', sym, 'getFinancials', () => finnhub.getFinancials(sym)));
    results.push(await runTest('FinnhubProvider', sym, 'getNews', () => finnhub.getNews(sym)));
    await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

async function testIndianMarket(): Promise<TestResult[]> {
  const indian = new IndianMarketProvider();
  const results: TestResult[] = [];
  for (const sym of SYMBOLS) {
    results.push(await runTest('IndianMarketProvider', sym, 'getQuote', () => indian.getQuote(sym)));
    results.push(await runTest('IndianMarketProvider', sym, 'getMetadata', () => indian.getMetadata(sym)));
    results.push(await runTest('IndianMarketProvider', sym, 'getHistorical', () => indian.getHistorical(sym, '1M')));
    await new Promise((r) => setTimeout(r, 1000));
  }
  return results;
}

async function main() {
  ensureReportsDir();

  const yahooResults = await testYahoo();
  writeReport('YAHOO_EXECUTION_REPORT.json', yahooResults);

  const finnhubResults = await testFinnhub();
  writeReport('FINNHUB_EXECUTION_REPORT.json', finnhubResults);

  const indianResults = await testIndianMarket();
  writeReport('INDIAN_PROVIDER_EXECUTION_REPORT.json', indianResults);

  const coordinator = new ProviderCoordinator();
  const coordResults: TestResult[] = [];

  for (const sym of SYMBOLS) {
    coordResults.push(await runTest('ProviderCoordinator', sym, 'getQuote', () => coordinator.getQuote(sym)));
    coordResults.push(await runTest('ProviderCoordinator', sym, 'getMetadata', () => coordinator.getMetadata(sym)));
    coordResults.push(await runTest('ProviderCoordinator', sym, 'getHistorical', () => coordinator.getHistory(sym, '1M')));
    coordResults.push(await runTest('ProviderCoordinator', sym, 'getNews', () => coordinator.getNews(sym)));
    coordResults.push(await runTest('ProviderCoordinator', sym, 'getFinancials', () => coordinator.getFinancials(sym)));
    await new Promise((r) => setTimeout(r, 500));
  }

  writeReport('PROVIDER_CHAIN_REPORT.json', {
    results: coordResults,
    traceLog: coordinator.getTraceLog(),
    chainOrder: {
      quotes: 'Yahoo',
      metadata: 'Yahoo -> Finnhub',
      historical: 'Yahoo',
      financials: 'UpstoxFundamentals -> Finnhub -> Yahoo',
      news: 'Finnhub -> GoogleNewsRss',
    },
  });

  const liveResults = SYMBOLS.map((sym) => {
    const quoteRes = coordResults.find((r) => r.symbol === sym && r.endpoint === 'getQuote');
    const metaRes = coordResults.find((r) => r.symbol === sym && r.endpoint === 'getMetadata');
    const histRes = coordResults.find((r) => r.symbol === sym && r.endpoint === 'getHistorical');
    const newsRes = coordResults.find((r) => r.symbol === sym && r.endpoint === 'getNews');
    const finRes = coordResults.find((r) => r.symbol === sym && r.endpoint === 'getFinancials');
    const validation = DataValidationEngine.validate(
      sym,
      quoteRes?.sample || null,
      metaRes?.sample || null,
      histRes?.sample || null,
      finRes?.sample || null,
    );

    return {
      symbol: sym,
      success: !!(quoteRes?.success && metaRes?.success && histRes?.success),
      recordsReturned:
        (quoteRes?.recordsReturned || 0) +
        (metaRes?.recordsReturned || 0) +
        (histRes?.recordsReturned || 0) +
        (newsRes?.recordsReturned || 0) +
        (finRes?.recordsReturned || 0),
      requestTimestamp: new Date().toISOString(),
      validationStatus: validation.validationStatus,
    };
  });

  writeReport('LIVE_PROVIDER_RESULTS.json', liveResults);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
