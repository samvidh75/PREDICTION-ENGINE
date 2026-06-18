export {};
/**
 * verify-broker-instrument-map.ts
 *
 * Verifies all 30 verified symbols have valid provider instrument mappings.
 * Checks Dhan security_id, Upstox instrument_key, Yahoo ticker availability.
 *
 * Usage:
 *   npx tsx scripts/verify-broker-instrument-map.ts
 *
 * Exits non-zero only for code failure, not for expected missing mappings.
 */

import { getVerifiedSymbols, getMapping, getDhanSecurityId, getUpstoxInstrumentKey } from '../src/providers/instruments/instrumentMap';
import { DhanProvider } from '../src/providers/marketData/dhanProvider';
import { UpstoxProvider } from '../src/providers/marketData/upstoxProvider';
import { YahooFallbackProvider } from '../src/providers/marketData/yahooFallbackProvider';

interface MappingResult {
  symbol: string;
  dhanMapped: boolean;
  upstoxMapped: boolean;
  yahooTicker: string;
  dhanHealthy: boolean | null;
  upstoxHealthy: boolean | null;
  yahooHealthy: boolean | null;
  status: 'complete' | 'partial' | 'missing';
  notes: string[];
}

async function main(): Promise<void> {
  console.log("=== Broker Instrument Map Verification ===\n");

  const symbols = getVerifiedSymbols();
  console.log(`Verified symbols: ${symbols.length}`);
  console.log("");

  // Provider health
  const dhanProv = new DhanProvider();
  const upstoxProv = new UpstoxProvider();
  const yahooProv = new YahooFallbackProvider();

  let dhanHealthy: boolean | null = null;
  let upstoxHealthy: boolean | null = null;
  let yahooHealthy: boolean | null = null;

  try {
    const dh = await dhanProv.checkHealth();
    dhanHealthy = dh.status === 'healthy';
    console.log(`Dhan health: ${dh.status}`);
  } catch { console.log("Dhan health: check_error"); }
  
  try {
    const uh = await upstoxProv.checkHealth();
    upstoxHealthy = uh.status === 'healthy';
    console.log(`Upstox health: ${uh.status}`);
  } catch { console.log("Upstox health: check_error"); }

  try {
    const yh = await yahooProv.checkHealth();
    yahooHealthy = yh.status === 'healthy';
    console.log(`Yahoo health: ${yh.status}`);
  } catch { console.log("Yahoo health: check_error"); }

  console.log("");

  const results: MappingResult[] = [];
  let complete = 0, partial = 0, missing = 0;

  for (const symbol of symbols) {
    const mapping = getMapping(symbol);
    const dhanId = getDhanSecurityId(symbol);
    const upstoxKey = getUpstoxInstrumentKey(symbol);

    const res: MappingResult = {
      symbol,
      dhanMapped: !!dhanId,
      upstoxMapped: !!upstoxKey,
      yahooTicker: mapping?.yahooTicker ?? `${symbol}.NS`,
      dhanHealthy: null,
      upstoxHealthy: null,
      yahooHealthy: null,
      status: 'complete',
      notes: [],
    };

    const details: string[] = [];
    if (res.dhanMapped) details.push(`Dhan=${dhanId}`);
    else { details.push('Dhan=missing'); res.notes.push('No Dhan security_id'); }
    if (res.upstoxMapped) details.push(`Upstox=${upstoxKey}`);
    else { details.push('Upstox=missing'); res.notes.push('No Upstox instrument key'); }
    details.push(`Yahoo=${res.yahooTicker}`);

    // Check against healthy providers if possible
    if (dhanHealthy && res.dhanMapped) {
      try {
        await dhanProv.getQuote(symbol);
        res.dhanHealthy = true;
      } catch { res.dhanHealthy = false; res.notes.push('Dhan quote failed'); }
    }
    if (upstoxHealthy && res.upstoxMapped) {
      try {
        await upstoxProv.getQuote(symbol);
        res.upstoxHealthy = true;
      } catch { res.upstoxHealthy = false; res.notes.push('Upstox quote failed'); }
    }

    if (!res.dhanMapped && !res.upstoxMapped) {
      res.status = 'missing';
      missing++;
    } else if (res.dhanHealthy === false && res.upstoxHealthy === false) {
      res.status = 'partial';
      partial++;
    } else {
      complete++;
    }

    results.push(res);
    const icon = res.status === 'complete' ? '✓' : res.status === 'partial' ? '△' : '✗';
    console.log(`${icon} ${symbol.padEnd(14)} ${details.join(', ')}${res.notes.length > 0 ? `  notes: ${res.notes.join('; ')}` : ''}`);
  }

  console.log(`\nSummary: ${complete} complete, ${partial} partial, ${missing} missing`);

  // Check for duplicates/conflicts
  const allDhanIds = new Map<string, string>();
  const allUpstoxKeys = new Map<string, string>();
  let conflicts = 0;

  for (const sym of symbols) {
    const dId = getDhanSecurityId(sym);
    if (dId) {
      if (allDhanIds.has(dId)) {
        console.log(`  CONFLICT: Dhan security_id ${dId} shared by ${allDhanIds.get(dId)} and ${sym}`);
        conflicts++;
      }
      allDhanIds.set(dId, sym);
    }
    const uKey = getUpstoxInstrumentKey(sym);
    if (uKey) {
      if (allUpstoxKeys.has(uKey)) {
        console.log(`  CONFLICT: Upstox instrument_key ${uKey} shared by ${allUpstoxKeys.get(uKey)} and ${sym}`);
        conflicts++;
      }
      allUpstoxKeys.set(uKey, sym);
    }
  }

  if (conflicts === 0) {
    console.log("  No duplicate/conflicting mappings found");
  }

  process.exitCode = 0;
}

main().catch((err) => {
  console.error("Instrument verification failed:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
