#!/usr/bin/env node
/**
 * verify-production-intelligence.ts
 *
 * Production verification script for StockStory India intelligence engines.
 * Runs a full integrity check against the deployed production API.
 *
 * Usage:
 *   npx tsx scripts/intelligence/verify-production-intelligence.ts
 *   npx tsx scripts/intelligence/verify-production-intelligence.ts --url https://stockstory-api.onrender.com
 *   npx tsx scripts/intelligence/verify-production-intelligence.ts --symbols RELIANCE,TCS,INFY
 */

const PRODUCTION_URL = process.env.PRODUCTION_URL ?? 'https://stockstory-api.onrender.com';
const TEST_SYMBOLS = (process.env.TEST_SYMBOLS ?? 'RELIANCE,TCS,HDFCBANK,INFY,HAL').split(',');

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
  durationMs?: number;
}

async function checkEndpoint(url: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const duration = Date.now() - start;
    if (!res.ok) {
      return { name: `GET ${url}`, status: 'fail', detail: `HTTP ${res.status}`, durationMs: duration };
    }
    const body = await res.json();
    return { name: `GET ${url}`, status: 'pass', detail: `${res.status} — ${JSON.stringify(body).slice(0, 100)}`, durationMs: duration };
  } catch (err: any) {
    return { name: `GET ${url}`, status: 'fail', detail: err.message ?? String(err), durationMs: Date.now() - start };
  }
}

async function checkEngine(url: string, engineName: string, symbol: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}?symbol=${symbol}`, { signal: AbortSignal.timeout(15000) });
    const duration = Date.now() - start;
    if (!res.ok) {
      return { name: engineName, status: 'fail', detail: `HTTP ${res.status} for ${symbol}`, durationMs: duration };
    }
    const body = await res.json();
    // Check for score field (most engines return score)
    if (body.score !== undefined || body.composite?.score !== undefined) {
      const score = body.score ?? body.composite?.score;
      return { name: engineName, status: 'pass', detail: `${symbol}: score=${score}`, durationMs: duration };
    }
    if (body.ok === true && body.data) {
      const s = body.data.compositeScore?.score ?? body.data.score;
      return { name: engineName, status: 'pass', detail: `${symbol}: score=${s}`, durationMs: duration };
    }
    return { name: engineName, status: 'warn', detail: `${symbol}: unexpected response shape`, durationMs: duration };
  } catch (err: any) {
    return { name: engineName, status: 'fail', detail: `${symbol}: ${err.message}`, durationMs: Date.now() - start };
  }
}

async function main() {
  const url = process.argv.includes('--url')
    ? process.argv[process.argv.indexOf('--url') + 1]
    : PRODUCTION_URL;

  const symbolsArg = process.argv.includes('--symbols')
    ? process.argv[process.argv.indexOf('--symbols') + 1]
    : undefined;

  const symbols = symbolsArg ? symbolsArg.split(',') : TEST_SYMBOLS;
  const sampleSymbol = symbols[0];

  console.log(`\n🔍 StockStory India — Production Verification`);
  console.log(`   URL:     ${url}`);
  console.log(`   Symbols: ${symbols.join(', ')}\n`);

  const results: CheckResult[] = [];

  // 1. Health checks
  console.log('── Health Endpoints ──');
  for (const path of ['/healthz', '/readyz', '/version']) {
    const r = await checkEndpoint(`${url}${path}`);
    results.push(r);
    console.log(`  ${r.status === 'pass' ? '✅' : '❌'} ${r.name}: ${r.detail} (${r.durationMs}ms)`);
  }

  // 2. Full intelligence report
  console.log('\n── Full Stock Analysis ──');
  const stockResult = await checkEndpoint(`${url}/api/intelligence/stock?symbol=${sampleSymbol}`);
  results.push(stockResult);
  console.log(`  ${stockResult.status === 'pass' ? '✅' : '❌'} Stock ${sampleSymbol}: ${stockResult.detail} (${stockResult.durationMs}ms)`);

  // 3. Individual engines
  console.log('\n── Individual Engines ──');
  const engines = ['financial', 'technical', 'valuation', 'risk', 'sector', 'news', 'earnings', 'events', 'rag'];
  for (const engine of engines) {
    const r = await checkEngine(`${url}/api/intelligence/${engine}`, engine, sampleSymbol);
    results.push(r);
    console.log(`  ${r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌'} ${r.name}: ${r.detail} (${r.durationMs}ms)`);
  }

  // 4. Multi-symbol check (just stock endpoint for remaining symbols)
  console.log('\n── Multi-Symbol Check ──');
  for (let i = 1; i < symbols.length; i++) {
    const r = await checkEndpoint(`${url}/api/intelligence/stock?symbol=${symbols[i]}`);
    results.push(r);
    console.log(`  ${r.status === 'pass' ? '✅' : '❌'} ${symbols[i]}: ${r.detail} (${r.durationMs}ms)`);
  }

  // Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const totalTime = results.reduce((acc, r) => acc + (r.durationMs ?? 0), 0);

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  ✅ Pass: ${passed}  ❌ Fail: ${failed}  ⚠️ Warn: ${warned}`);
  console.log(`  Total: ${results.length} checks in ${totalTime}ms`);
  console.log(`═══════════════════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
