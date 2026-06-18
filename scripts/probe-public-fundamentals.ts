export {};
/**
 * probe-public-fundamentals.ts — Probes all available public fundamentals sources.
 *
 * Calls Python probes (nsepython) to discover which financial data
 * functions are available and what fields they return. nselib archived — see docs.
 * Reports results as JSON.
 * No scraping, no credentials, no fake data.
 *
 * Usage:
 *   npx tsx scripts/probe-public-fundamentals.ts
 *   npx tsx scripts/probe-public-fundamentals.ts --symbol=TCS
 *   npx tsx scripts/probe-public-fundamentals.ts --save-sample
 */

import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProbeResult {
  source: string;
  status: "healthy" | "import_failed" | "endpoint_failed" | "timeout" | "no_data";
  detail: unknown;
  elapsedSec?: number;
}

interface SourceReport {
  source: string;
  working: boolean;
  endpoints: ProbeResult[];
  fieldsAvailable: string[];
}

function getSymbol(): string {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--symbol=")) return arg.split("=")[1].trim().toUpperCase();
  }
  return "RELIANCE";
}

function shouldSaveSample(): boolean {
  return process.argv.slice(2).some((a) => a === "--save-sample");
}

function runPython(script: string, timeoutSec = 60): string {
  try {
    return execSync(`python3 "${script}"`, {
      encoding: "utf-8",
      timeout: timeoutSec * 1000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout")) throw new Error(`Python probe timed out after ${timeoutSec}s`);
    throw new Error(`Python probe failed: ${msg.slice(0, 300)}`);
  }
}

function probeNsepythonFinancialResults(symbol: string): ProbeResult {
  const start = Date.now();
  const script = `
import json, sys
try:
    import nsepython
except Exception as e:
    print(json.dumps({"status": "import_failed", "detail": str(e)[:200]}))
    sys.exit(0)
try:
    # Try nse_results first
    r = nsepython.nse_results("${symbol}")
    if isinstance(r, dict) and len(r) > 0:
        keys = list(r.keys())[:30]
        sample = {k: str(r[k])[:80] for k in keys[:8]}
        field_count = len([k for k in r if isinstance(r[k], (int, float)) and not isinstance(r[k], bool)])
        print(json.dumps({"status": "healthy", "data_type": "dict", "keys": keys, "sample": sample, "field_count": field_count, "total_keys": len(r)}))
    elif isinstance(r, list) and len(r) > 0:
        first = r[0] if isinstance(r[0], dict) else {}
        print(json.dumps({"status": "healthy", "data_type": "list", "count": len(r), "first_item_keys": list(first.keys())[:20] if first else []}))
    elif r is not None:
        print(json.dumps({"status": "healthy", "data_type": type(r).__name__, "sample": str(r)[:300]}))
    else:
        print(json.dumps({"status": "no_data", "detail": "nse_results returned None"}))
except Exception as e:
    print(json.dumps({"status": "endpoint_failed", "detail": str(e)[:200]}))
`.trim();
  try {
    const output = execSync(`python3 -c ${JSON.stringify(script)}`, {
      encoding: "utf-8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    const parsed = JSON.parse(output.trim());
    return { source: "nsepython.nse_results", ...parsed, elapsedSec: (Date.now() - start) / 1000 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout")) return { source: "nsepython.nse_results", status: "timeout", detail: `timed out after 30s`, elapsedSec: (Date.now() - start) / 1000 };
    return { source: "nsepython.nse_results", status: "endpoint_failed", detail: msg.slice(0, 200), elapsedSec: (Date.now() - start) / 1000 };
  }
}

function probeNsepythonPastResults(symbol: string): ProbeResult {
  const start = Date.now();
  try {
    const output = execSync(`python3 -c "
import json, sys
try:
    import nsepython
    r = nsepython.nse_past_results('${symbol}')
    if isinstance(r, dict) and len(r) > 0:
        keys = list(r.keys())[:30]
        print(json.dumps({'status': 'healthy', 'data_type': 'dict', 'keys': keys, 'total_keys': len(r)}))
    elif isinstance(r, list) and len(r) > 0:
        print(json.dumps({'status': 'healthy', 'data_type': 'list', 'count': len(r)}))
    elif r is not None:
        print(json.dumps({'status': 'healthy', 'data_type': type(r).__name__, 'sample': str(r)[:300]}))
    else:
        print(json.dumps({'status': 'no_data', 'detail': 'nse_past_results returned None'}))
except Exception as e:
    print(json.dumps({'status': 'endpoint_failed', 'detail': str(e)[:200]}))
"`, { encoding: "utf-8", timeout: 30_000, maxBuffer: 1024 * 1024 });
    return { source: "nsepython.nse_past_results", ...JSON.parse(output.trim()), elapsedSec: (Date.now() - start) / 1000 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout")) return { source: "nsepython.nse_past_results", status: "timeout", detail: "timed out after 30s", elapsedSec: (Date.now() - start) / 1000 };
    return { source: "nsepython.nse_past_results", status: "endpoint_failed", detail: msg.slice(0, 200), elapsedSec: (Date.now() - start) / 1000 };
  }
}

async function main(): Promise<void> {
  const symbol = getSymbol();
  console.log(JSON.stringify({
    probe: "public-fundamentals-sources",
    symbol,
    timestamp: new Date().toISOString(),
    note: "NSELib not probed — evaluated and not active. See docs/data/nselib-provider.md",
    sources: [
      probeNsepythonFinancialResults(symbol),
      probeNsepythonPastResults(symbol),
    ],
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
