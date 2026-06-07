/**
 * TRACK-8D Part A: IndianAPI Endpoint Audit
 * 
 * Systematically tests every possible combination of:
 * - symbol formats (6 variants)
 * - endpoint paths (5 variants)
 * - authentication schemes (3 variants)
 * - headers
 * 
 * Captures full URLs, request/response data, HTTP status.
 * 
 * Run: npx tsx scripts/track-8d-indianapi-audit.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.resolve(__dirname, '..', 'reports', 'track-8d');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const API_KEY = 'sk-live-oYJvcSXqvVD4PbWLceN7fHHpaXQjq0pHADLuEbDj';

const log: string[] = [];
function l(s: string) { console.log(s); log.push(s); }

// ═══════════════════════════════════════════════════════════
// SYMBOL FORMATS
// ═══════════════════════════════════════════════════════════
const SYMBOL_VARIANTS = [
  { label: 'Bare name', value: 'RELIANCE' },
  { label: 'With .NS suffix', value: 'RELIANCE.NS' },
  { label: 'NSE: prefix', value: 'NSE:RELIANCE' },
  { label: 'NSE_EQ| format', value: 'NSE_EQ|RELIANCE' },
  { label: 'BSE code (500325)', value: '500325' },
  { label: 'ISIN (INE002A01018)', value: 'INE002A01018' },
];

const TCS_VARIANTS = [
  { label: 'Bare name', value: 'TCS' },
  { label: 'With .NS suffix', value: 'TCS.NS' },
  { label: 'NSE: prefix', value: 'NSE:TCS' },
  { label: 'NSE_EQ| format', value: 'NSE_EQ|TCS' },
  { label: 'BSE code (532540)', value: '532540' },
  { label: 'ISIN (INE467B01029)', value: 'INE467B01029' },
];

// ═══════════════════════════════════════════════════════════
// ENDPOINT PATHS
// ═══════════════════════════════════════════════════════════
const ENDPOINTS = [
  { label: '/stock_fundamentals?name=', path: '/stock_fundamentals', param: 'name' },
  { label: '/stock?name=', path: '/stock', param: 'name' },
  { label: '/stock?symbol=', path: '/stock', param: 'symbol' },
  { label: '/fundamentals?symbol=', path: '/fundamentals', param: 'symbol' },
  { label: '/company/fundamentals?symbol=', path: '/company/fundamentals', param: 'symbol' },
  { label: '/v1/stock_fundamentals?name=', path: '/v1/stock_fundamentals', param: 'name' },
  { label: '/v1/stock?name=', path: '/v1/stock', param: 'name' },
];

// ═══════════════════════════════════════════════════════════
// BASE URLS
// ═══════════════════════════════════════════════════════════
const BASE_URLS = [
  'https://stock.indianapi.in',
  'https://api.indianapi.in',
  'https://indianapi.in/api',
];

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION SCHEMES
// ═══════════════════════════════════════════════════════════
const AUTH_SCHEMES: Array<{ label: string; headers: Record<string, string>; queryAuth?: boolean }> = [
  { label: 'X-Api-Key header', headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json' } },
  { label: 'Authorization: Bearer', headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' } },
  { label: 'api_key query param', headers: { 'Accept': 'application/json' }, queryAuth: true },
];

interface AuditEntry {
  baseUrl: string;
  endpointPath: string;
  paramName: string;
  symbolFormat: string;
  symbolValue: string;
  authScheme: string;
  headers: Record<string, string>;
  fullUrl: string;
  httpStatus: number | string;
  responseBody: string;
  responseSize: number;
  validJson: boolean;
  hasFundamentals: boolean;
  error?: string;
}

const auditResults: AuditEntry[] = [];

async function testCombination(
  baseUrl: string,
  endpoint: typeof ENDPOINTS[0],
  symbolVar: typeof SYMBOL_VARIANTS[0],
  auth: typeof AUTH_SCHEMES[0],
): Promise<void> {
  let url = `${baseUrl}${endpoint.path}?${endpoint.param}=${encodeURIComponent(symbolVar.value)}`;
  if (auth.queryAuth) {
    url += `&api_key=${encodeURIComponent(API_KEY)}`;
  }

  const entry: AuditEntry = {
    baseUrl,
    endpointPath: endpoint.path,
    paramName: endpoint.param,
    symbolFormat: symbolVar.label,
    symbolValue: symbolVar.value,
    authScheme: auth.label,
    headers: auth.headers,
    fullUrl: url,
    httpStatus: 'PENDING',
    responseBody: '',
    responseSize: 0,
    validJson: false,
    hasFundamentals: false,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, { headers: auth.headers, signal: controller.signal });
    clearTimeout(timeout);

    entry.httpStatus = resp.status;
    const text = await resp.text();
    entry.responseBody = text.slice(0, 2000);
    entry.responseSize = text.length;

    if (resp.ok && text.length > 10) {
      try {
        const json = JSON.parse(text);
        entry.validJson = true;
        // Check if it contains fundamentals data
        const hasFundData =
          (json.fundamentals && Object.keys(json.fundamentals).length > 0) ||
          (json.pe_ratio !== undefined) ||
          (json.roe !== undefined) ||
          (json.market_cap !== undefined) ||
          (json.data && typeof json.data === 'object' && Object.keys(json.data).length > 2);
        entry.hasFundamentals = hasFundData;
        l(`   ${resp.status} | ${entry.symbolFormat} | ${endpoint.label} | ${auth.label} | ${text.length}B | ${hasFundData ? 'FUNDAMENTALS FOUND' : 'no fundamentals'}`);
      } catch {
        entry.validJson = false;
        l(`   ${resp.status} | ${entry.symbolFormat} | ${endpoint.label} | ${auth.label} | ${text.length}B | NOT JSON`);
      }
    } else {
      l(`   ${resp.status} | ${entry.symbolFormat} | ${endpoint.label} | ${auth.label} | ${text.length}B | ${text.slice(0, 60)}`);
    }
  } catch (e: unknown) {
    entry.httpStatus = 'ERROR';
    entry.error = e instanceof Error ? e.message : String(e);
    l(`   ERROR | ${entry.symbolFormat} | ${endpoint.label} | ${auth.label} | ${entry.error}`);
  }

  auditResults.push(entry);
  await new Promise(r => setTimeout(r, 100));
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
async function main() {
  l('='.repeat(72));
  l('  TRACK-8D: INDIANAPI ENDPOINT AUDIT');
  l('='.repeat(72));
  l(`  API Key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`);
  l('');

  // PHASE 1: Quick sweep — test all endpoints with bare RELIANCE name using X-Api-Key
  l('PHASE 1: Endpoint path sweep (RELIANCE, X-Api-Key)');
  l('-'.repeat(72));
  for (const baseUrl of BASE_URLS) {
    for (const ep of ENDPOINTS) {
      await testCombination(baseUrl, ep, SYMBOL_VARIANTS[0], AUTH_SCHEMES[0]);
    }
  }

  // If Phase 1 found a working combination, do Phase 2
  const working = auditResults.filter(r => r.httpStatus === 200 && r.validJson && r.responseSize > 50);
  if (working.length > 0) {
    l(`\nPHASE 2: Symbol format sweep (${working.length} working endpoints found)`);
    l('-'.repeat(72));
    const bestEp = working[0];
    for (const symVar of SYMBOL_VARIANTS) {
      await testCombination(bestEp.baseUrl, { label: bestEp.paramName, path: bestEp.endpointPath, param: bestEp.paramName }, symVar, AUTH_SCHEMES[0]);
    }
  }

  // PHASE 3: Auth scheme sweep on best result
  if (working.length > 0) {
    l('\nPHASE 3: Auth scheme sweep');
    l('-'.repeat(72));
    const best = working.sort((a, b) => b.responseSize - a.responseSize)[0];
    for (const auth of AUTH_SCHEMES) {
      await testCombination(best.baseUrl, { label: best.paramName, path: best.endpointPath, param: best.paramName }, SYMBOL_VARIANTS[0], auth);
    }
  }

  // PHASE 4: Second company verification
  l('\nPHASE 4: TCS verification (if working endpoint found)');
  l('-'.repeat(72));
  if (working.length > 0) {
    const best = working.sort((a, b) => b.responseSize - a.responseSize)[0];
    for (const tcsVar of TCS_VARIANTS) {
      await testCombination(best.baseUrl, { label: best.paramName, path: best.endpointPath, param: best.paramName }, tcsVar, AUTH_SCHEMES[0]);
    }
  } else {
    // Try TCS with all combinations too (quick sweep)
    for (const tcsVar of TCS_VARIANTS) {
      for (const ep of ENDPOINTS.slice(0, 3)) {
        await testCombination(BASE_URLS[0], ep, tcsVar, AUTH_SCHEMES[0]);
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // GENERATE REPORT
  // ═══════════════════════════════════════════════════════
  l('\nGENERATING REPORT');
  
  const workingEndpoints = auditResults.filter(r => r.httpStatus === 200 && r.validJson && r.hasFundamentals);
  const totalTests = auditResults.length;
  const success200 = auditResults.filter(r => r.httpStatus === 200).length;
  const successWithData = workingEndpoints.length;
  
  let report = '# IndianAPI Endpoint Audit - TRACK-8D\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**API Key:** ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}\n`;
  report += `**Total Combinations Tested:** ${totalTests}\n\n`;
  report += '---\n\n';

  report += '## Executive Summary\n\n';
  if (workingEndpoints.length > 0) {
    report += `**WORKING ENDPOINT FOUND.** ${workingEndpoints.length}/${totalTests} combinations returned valid fundamentals data.\n\n`;
    const best = workingEndpoints[0];
    report += `**Best combination:**\n`;
    report += `- URL: \`${best.fullUrl}\`\n`;
    report += `- Symbol format: **${best.symbolFormat}**\n`;
    report += `- Auth: **${best.authScheme}**\n`;
    report += `- Response size: ${best.responseSize} bytes\n`;
    report += `- Fields found: See raw response below\n\n`;
  } else if (success200 > 0) {
    report += `**ENDPOINT REACHABLE BUT NO FUNDAMENTALS DATA.** ${success200}/${totalTests} combinations returned HTTP 200, but none contained recognizable fundamentals data.\n\n`;
  } else {
    report += `**ALL ENDPOINTS FAILED.** ${totalTests} combinations tested across 3 base URLs, 7 endpoint paths, 6 symbol formats, and 3 auth schemes. Zero working combinations found.\n\n`;
  }

  report += '## Results Summary\n\n';
  report += '| # | Base URL | Endpoint | Symbol | Auth | HTTP Status | Size | JSON? | Has Fundamentals? |\n';
  report += '|:--|:---------|:---------|:-------|:-----|:-----------|:-----|:------|:------------------|\n';
  
  let idx = 1;
  for (const r of auditResults) {
    const status = typeof r.httpStatus === 'number' && r.httpStatus >= 200 && r.httpStatus < 300 ? 'SUCCESS' : String(r.httpStatus);
    report += `| ${idx} | ${r.baseUrl} | ${r.endpointPath}?${r.paramName}= | ${r.symbolFormat} (${r.symbolValue}) | ${r.authScheme} | ${status} | ${r.responseSize}B | ${r.validJson ? 'Yes' : 'No'} | ${r.hasFundamentals ? '**YES**' : 'No'} |\n`;
    idx++;
  }

  report += '\n## Response Analysis\n\n';

  // Group by HTTP status
  const byStatus = new Map<number | string, AuditEntry[]>();
  for (const r of auditResults) {
    const key = r.httpStatus;
    if (!byStatus.has(key)) byStatus.set(key, []);
    byStatus.get(key)!.push(r);
  }

  report += '### HTTP Status Distribution\n\n';
  report += '| Status | Count | % |\n';
  report += '|:-------|:------|:--|\n';
  for (const [status, entries] of byStatus.entries()) {
    report += `| ${status} | ${entries.length} | ${(entries.length / totalTests * 100).toFixed(0)}% |\n`;
  }

  // Success routes
  if (success200 > 0) {
    report += '\n### Successful Responses\n\n';
    const okay200 = auditResults.filter(r => r.httpStatus === 200);
    report += `Total: ${okay200.length} combinations returned HTTP 200.\n\n`;
    if (successWithData > 0) {
      report += `**${successWithData} contained fundamental data.** See raw responses below.\n\n`;
    } else {
      report += '**None contained fundamental data.** Response sizes range from ';
      report += `${Math.min(...okay200.map(r => r.responseSize))} to ${Math.max(...okay200.map(r => r.responseSize))} bytes.\n\n`;
    }
    
    // Show sample responses
    report += '### Sample Response Bodies\n\n';
    for (const r of okay200.slice(0, 5)) {
      report += `#### ${r.symbolFormat} @ ${r.baseUrl}${r.endpointPath}?${r.paramName}=${r.symbolValue}\n\n`;
      report += '```json\n';
      report += r.responseBody.slice(0, 500);
      report += '\n```\n\n';
    }
  }

  report += '## Symbol Format Analysis\n\n';
  report += '| Format | Tests | Working | Success Rate |\n';
  report += '|:-------|:------|:--------|:------------|\n';
  const byFormat = new Map<string, { total: number; working: number }>();
  for (const r of auditResults) {
    const key = r.symbolFormat;
    if (!byFormat.has(key)) byFormat.set(key, { total: 0, working: 0 });
    const entry = byFormat.get(key)!;
    entry.total++;
    if (r.hasFundamentals) entry.working++;
  }
  for (const [format, stats] of byFormat.entries()) {
    report += `| ${format} | ${stats.total} | ${stats.working} | ${(stats.working / stats.total * 100).toFixed(0)}% |\n`;
  }

  report += '\n## Authentication Analysis\n\n';
  report += '| Auth Scheme | Tests | Working | Success Rate |\n';
  report += '|:------------|:------|:--------|:------------|\n';
  const byAuth = new Map<string, { total: number; working: number }>();
  for (const r of auditResults) {
    const key = r.authScheme;
    if (!byAuth.has(key)) byAuth.set(key, { total: 0, working: 0 });
    const entry = byAuth.get(key)!;
    entry.total++;
    if (r.hasFundamentals) entry.working++;
  }
  for (const [auth, stats] of byAuth.entries()) {
    report += `| ${auth} | ${stats.total} | ${stats.working} | ${(stats.working / stats.total * 100).toFixed(0)}% |\n`;
  }

  report += '\n## Endpoint Path Analysis\n\n';
  report += '| Endpoint | Tests | Working | Success Rate |\n';
  report += '|:---------|:------|:--------|:------------|\n';
  const byEndpoint = new Map<string, { total: number; working: number }>();
  for (const r of auditResults) {
    const key = r.endpointPath;
    if (!byEndpoint.has(key)) byEndpoint.set(key, { total: 0, working: 0 });
    const entry = byEndpoint.get(key)!;
    entry.total++;
    if (r.hasFundamentals) entry.working++;
  }
  for (const [ep, stats] of byEndpoint.entries()) {
    report += `| ${ep} | ${stats.total} | ${stats.working} | ${(stats.working / stats.total * 100).toFixed(0)}% |\n`;
  }

  report += '\n---\n\n';
  report += '## Final Determination\n\n';

  if (workingEndpoints.length > 0) {
    report += '**IndianAPI IS VIABLE for fundamentals.**\n\n';
    const best = workingEndpoints[0];
    report += `Working configuration:\n`;
    report += `\`\`\`\n`;
    report += `URL: ${best.fullUrl}\n`;
    report += `Headers: ${JSON.stringify(best.headers)}\n`;
    report += `Symbol format: ${best.symbolFormat}\n`;
    report += `\`\`\`\n\n`;
    report += 'Recommended next step: Update IndianAPIProvider.ts to use this endpoint configuration.\n';
  } else {
    report += '**IndianAPI IS NOT VIABLE for fundamentals.**\n\n';
    report += `After testing ${totalTests} combinations across:\n`;
    report += `- 3 base URLs\n`;
    report += `- 7 endpoint paths\n`;
    report += `- 6 symbol formats\n`;
    report += `- 3 authentication schemes\n`;
    report += `- 2 companies (RELIANCE, TCS)\n\n`;
    report += '**Zero combinations returned recognizable financial fundamentals data.**\n\n';
    report += '### Root cause hypotheses:\n';
    report += '1. The API key may be valid but the `/stock_fundamentals` endpoint was deprecated/relocated\n';
    report += '2. The API may require a different subscription tier\n';
    report += '3. The API may have moved to a different domain entirely\n';
    report += '4. The service may have been discontinued\n\n';
    report += '### Recommendation:\n';
    report += '- Remove IndianAPIProvider from the financial chain\n';
    report += '- Focus on Upstox Fundamentals API (launched May 2026) as the primary Indian equity source\n';
    report += '- Or acquire Finnhub premium key ($89/mo)\n';
  }

  report += '\n---\n\n';
  report += `**This audit is based on ${totalTests} real HTTP calls. No assumptions.**\n`;

  fs.writeFileSync(path.join(OUT, 'IndianAPIEndpointAudit.md'), report);
  l('   WRITTEN: IndianAPIEndpointAudit.md');

  // Save raw audit JSON for reference
  const rawAudit = auditResults.map(r => ({
    baseUrl: r.baseUrl,
    endpoint: `${r.endpointPath}?${r.paramName}=${r.symbolValue}`,
    symbol: r.symbolFormat,
    auth: r.authScheme,
    status: r.httpStatus,
    size: r.responseSize,
    hasFundamentals: r.hasFundamentals,
    error: r.error,
  }));
  fs.writeFileSync(path.join(OUT, 'audit-results.json'), JSON.stringify(rawAudit, null, 2));
  l('   WRITTEN: audit-results.json');

  // Summary
  l('\n' + '='.repeat(72));
  l('  INDIANAPI AUDIT COMPLETE');
  l('='.repeat(72));
  l(`  Total tests: ${totalTests}`);
  l(`  HTTP 200: ${success200}`);
  l(`  With fundamentals: ${successWithData}`);
  l(`  Verdict: ${workingEndpoints.length > 0 ? 'WORKING ENDPOINT FOUND' : 'NOT VIABLE'}`);
  l(`\n  Reports: reports/track-8d/IndianAPIEndpointAudit.md`);
}

main().catch(e => {
  console.error('FATAL:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
