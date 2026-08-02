export {};
/**
 * probe-yahoo-provider.ts — TypeScript-only probe for Yahoo Finance data availability.
 *
 * Performs:
 *   - DNS resolution of query1.finance.yahoo.com
 *   - HTTPS connection to Yahoo v8 chart endpoint for RELIANCE.NS and TCS.NS
 *   - Response code & body inspection
 *   - Timeout behavior
 *   - User-agent requirement verification
 *
 * Returns a health classification:
 *   healthy    – all checks pass, data returns correctly
 *   degraded   – resolves DNS but returns empty/error responses
 *   blocked    – DNS resolves but HTTP fails (302/403/999) = geo-blocked / rate-limited
 *   unreachable– DNS fails or TCP connection fails
 */

import { Resolver } from 'dns/promises';
import https from 'https';
import http from 'http';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type HealthStatus = 'healthy' | 'degraded' | 'blocked' | 'unreachable';

interface CheckResult {
  status: HealthStatus;
  detail: string;
  elapsedMs: number;
}

interface YahooProbeReport {
  probe: string;
  timestamp: string;
  dns: CheckResult;
  connection: CheckResult;
  symbolChecks: Record<string, CheckResult>;
  overall: HealthStatus;
  summary: string;
}

// ---------------------------------------------------------------------------
// DNS resolution
// ---------------------------------------------------------------------------
async function checkDns(hostname: string): Promise<CheckResult> {
  const start = Date.now();
  const resolver = new Resolver();
  try {
    const addresses = await resolver.resolve4(hostname);
    const elapsed = Date.now() - start;
    return {
      status: 'healthy',
      detail: `Resolved ${hostname} → ${addresses.join(', ')}`,
      elapsedMs: elapsed,
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      status: 'unreachable',
      detail: `DNS resolution failed for ${hostname}: ${err.code ?? err.message}`,
      elapsedMs: elapsed,
    };
  }
}

// ---------------------------------------------------------------------------
// HTTPS connection check
// ---------------------------------------------------------------------------
async function checkConnection(
  hostname: string,
  path: string,
  timeoutMs: number = 10_000,
): Promise<CheckResult> {
  const start = Date.now();

  return new Promise<CheckResult>(resolve => {
    const req = https.get(
      `https://${hostname}${path}`,
      {
        timeout: timeoutMs,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        rejectUnauthorized: false,
      },
      res => {
        const elapsed = Date.now() - start;
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
          if (body.length > 4096) {
            req.destroy();
          }
        });
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          if (status === 200) {
            let parsed: any = null;
            try {
              parsed = JSON.parse(body);
            } catch {
              // body is not JSON — might still be OK if it's a different format
            }
            resolve({
              status: 'healthy',
              detail: `HTTP ${status}, ${body.length} bytes received`,
              elapsedMs: elapsed,
            });
          } else if (status === 302 || status === 301) {
            resolve({
              status: 'blocked',
              detail: `HTTP ${status} redirect → ${res.headers.location ?? 'unknown'} (geo-blocked)`,
              elapsedMs: elapsed,
            });
          } else if (status === 403) {
            resolve({
              status: 'blocked',
              detail: 'HTTP 403 Forbidden (rate-limited / blocked)',
              elapsedMs: elapsed,
            });
          } else if (status === 429) {
            resolve({
              status: 'blocked',
              detail: 'HTTP 429 Too Many Requests (rate-limited)',
              elapsedMs: elapsed,
            });
          } else if (status === 999) {
            resolve({
              status: 'blocked',
              detail: 'HTTP 999 (Yahoo rate-limit / bot detection)',
              elapsedMs: elapsed,
            });
          } else {
            resolve({
              status: 'degraded',
              detail: `HTTP ${status}, ${body.length} bytes`,
              elapsedMs: elapsed,
            });
          }
        });
      },
    );

    req.on('error', (err: NodeJS.ErrnoException) => {
      const elapsed = Date.now() - start;
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
        resolve({
          status: 'unreachable',
          detail: `DNS resolution failed during connection: ${err.message}`,
          elapsedMs: elapsed,
        });
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
        resolve({
          status: 'unreachable',
          detail: `TCP connection failed: ${err.code} — ${err.message}`,
          elapsedMs: elapsed,
        });
      } else {
        resolve({
          status: 'blocked',
          detail: `Connection error: ${err.code ?? err.message}`,
          elapsedMs: elapsed,
        });
      }
    });

    req.on('timeout', () => {
      req.destroy();
      const elapsed = Date.now() - start;
      resolve({
        status: 'degraded',
        detail: `Timeout after ${timeoutMs}ms`,
        elapsedMs: elapsed,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Yahoo Finance v8 chart endpoint data check
// ---------------------------------------------------------------------------
async function checkYahooSymbol(
  symbol: string,
  timeoutMs: number = 15_000,
): Promise<CheckResult> {
  const hostname = 'query1.finance.yahoo.com';
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
  const baseCheck = await checkConnection(hostname, path, timeoutMs);

  if (baseCheck.status !== 'healthy') {
    return baseCheck;
  }

  // If we got a 200, try to parse the response
  const start = Date.now();
  return new Promise<CheckResult>(resolve => {
    const req = https.get(
      `https://${hostname}${path}`,
      {
        timeout: timeoutMs,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        rejectUnauthorized: false,
      },
      res => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
          if (body.length > 32_768) {
            req.destroy();
          }
        });
        res.on('end', () => {
          const elapsed = Date.now() - start;
          try {
            const parsed = JSON.parse(body);
            const chart = parsed?.chart;
            if (!chart) {
              resolve({
                status: 'degraded',
                detail: 'Response missing .chart field',
                elapsedMs: elapsed,
              });
              return;
            }
            const result = chart?.result?.[0];
            if (!result) {
              const errInfo = chart?.error;
              resolve({
                status: 'degraded',
                detail: errInfo
                  ? `Yahoo error: ${JSON.stringify(errInfo)}`
                  : 'Empty chart result (possible symbol not found)',
                elapsedMs: elapsed,
              });
              return;
            }
            const timestamps = result?.timestamp ?? [];
            const quotes = result?.indicators?.quote?.[0] ?? {};
            const closeCount = quotes?.close?.filter((v: number | null) => v !== null).length ?? 0;
            resolve({
              status: 'healthy',
              detail: `${symbol}: ${timestamps.length} trading days, ${closeCount} close prices`,
              elapsedMs: elapsed,
            });
          } catch (parseErr: any) {
            resolve({
              status: 'degraded',
              detail: `JSON parse error: ${parseErr.message.slice(0, 100)}`,
              elapsedMs: elapsed,
            });
          }
        });
      },
    );

    req.on('error', (err: NodeJS.ErrnoException) => {
      const elapsed = Date.now() - start;
      resolve({
        status: 'blocked',
        detail: `Symbol fetch error: ${err.code ?? err.message}`,
        elapsedMs: elapsed,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const elapsed = Date.now() - start;
      resolve({
        status: 'degraded',
        detail: `Timeout after ${timeoutMs}ms fetching ${symbol}`,
        elapsedMs: elapsed,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// User-agent dependency check — try without user-agent to confirm requirement
// ---------------------------------------------------------------------------
async function checkWithoutUserAgent(timeoutMs: number = 8_000): Promise<CheckResult> {
  const start = Date.now();
  return new Promise<CheckResult>(resolve => {
    const req = https.get(
      'https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS?range=1d&interval=1d',
      {
        timeout: timeoutMs,
        headers: { Accept: 'application/json' },
        rejectUnauthorized: false,
      },
      res => {
        const elapsed = Date.now() - start;
        const status = res.statusCode ?? 0;
        if (status === 200) {
          resolve({
            status: 'degraded',
            detail: `HTTP ${status} — User-Agent NOT required (unexpected)`,
            elapsedMs: elapsed,
          });
        } else if (status === 403 || status === 999) {
          resolve({
            status: 'healthy',
            detail: `HTTP ${status} — User-Agent IS required (expected)`,
            elapsedMs: elapsed,
          });
        } else {
          resolve({
            status: 'healthy',
            detail: `HTTP ${status} — User-Agent requirement confirmed`,
            elapsedMs: elapsed,
          });
        }
      },
    );

    req.on('error', (err: NodeJS.ErrnoException) => {
      const elapsed = Date.now() - start;
      resolve({
        status: 'degraded',
        detail: `No-UA request failed: ${err.message.slice(0, 100)}`,
        elapsedMs: elapsed,
      });
    });

    req.on('timeout', () => {
      const elapsed = Date.now() - start;
      req.destroy();
      resolve({
        status: 'degraded',
        detail: 'No-UA request timed out',
        elapsedMs: elapsed,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`=== Yahoo Finance Provider Probe ===  ${timestamp}\n`);

  // 1. DNS
  const dns = await checkDns('query1.finance.yahoo.com');
  console.log(`[DNS]       ${dns.status.padEnd(12)} ${dns.detail} (${dns.elapsedMs}ms)`);

  // 2. Connection
  const conn = await checkConnection('query1.finance.yahoo.com', '/v8/finance/chart/RELIANCE.NS?range=1d&interval=1d');
  console.log(`[CONN]      ${conn.status.padEnd(12)} ${conn.detail} (${conn.elapsedMs}ms)`);

  // 3. Symbol checks
  const reliance = await checkYahooSymbol('RELIANCE.NS');
  console.log(`[RELIANCE]  ${reliance.status.padEnd(12)} ${reliance.detail} (${reliance.elapsedMs}ms)`);

  const tcs = await checkYahooSymbol('TCS.NS');
  console.log(`[TCS]       ${tcs.status.padEnd(12)} ${tcs.detail} (${tcs.elapsedMs}ms)`);

  // 4. User-agent requirement
  const uaCheck = await checkWithoutUserAgent();
  console.log(`[UA-CHECK]  ${uaCheck.status.padEnd(12)} ${uaCheck.detail} (${uaCheck.elapsedMs}ms)`);

  // 5. Overall classification
  const allChecks = [dns, conn, reliance, tcs, uaCheck];
  const statuses = allChecks.map(c => c.status);

  let overall: HealthStatus;
  let summary: string;

  if (statuses.includes('unreachable')) {
    overall = 'unreachable';
    summary = 'Yahoo Finance is unreachable — check DNS / firewall / VPN';
  } else if (statuses.includes('blocked')) {
    overall = 'blocked';
    summary = 'Yahoo Finance is geo-blocked or rate-limited';
  } else if (statuses.every(s => s === 'healthy')) {
    overall = 'healthy';
    summary = 'All checks pass — Yahoo Finance is fully accessible';
  } else {
    overall = 'degraded';
    summary = 'Yahoo Finance is reachable but some endpoints return errors';
  }

  console.log(`\n=== Overall: ${overall.toUpperCase()} ===`);
  console.log(summary);

  const report: YahooProbeReport = {
    probe: 'yahoo-finance',
    timestamp,
    dns,
    connection: conn,
    symbolChecks: { 'RELIANCE.NS': reliance, 'TCS.NS': tcs },
    overall,
    summary,
  };

  // Print machine-readable JSON last
  console.log('\n' + JSON.stringify(report, null, 2));

  process.exitCode = overall === 'unreachable' ? 2 : overall === 'blocked' ? 1 : 0;
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});
