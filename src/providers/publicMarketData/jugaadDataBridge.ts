import { execFile } from 'child_process';

const BRIDGE_SCRIPT = 'scripts/probe-jugaad-data-provider.py';
const BRIDGE_TIMEOUT = 45_000;

export interface JugaadProbeResult {
  package_import?: { status: string; elapsed?: number; detail: string };
  stock_data_RELIANCE?: { status: string; elapsed?: number; detail: string };
  bhavcopy?: { status: string; elapsed?: number; detail: string };
  market_status?: { status: string; elapsed?: number; detail: string };
  rbi_rates?: { status: string; elapsed?: number; detail: string };
  all_indices?: { status: string; elapsed?: number; detail: string };
  [key: string]: unknown;
}

export interface JugaadStockRow {
  DATE: string;
  OPEN: number;
  HIGH: number;
  LOW: number;
  CLOSE: number;
  LAST: number;
  PREV_CLOSE: number;
  TOT_TRD_QTY: number;
  TOT_TRD_VAL: number;
  DELIV_QTY?: number;
  DELIV_PERC?: number;
}

export interface JugaadBhavcopyRow {
  SYMBOL: string;
  DATE: string;
  OPEN: number;
  HIGH: number;
  LOW: number;
  CLOSE: number;
  LAST: number;
  PREV_CLOSE: number;
  TOT_TRD_QTY: number;
  TOT_TRD_VAL: number;
  DELIV_QTY?: number;
  DELIV_PERC?: number;
}

function runBridge(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile('python3', [BRIDGE_SCRIPT, ...args], {
      timeout: BRIDGE_TIMEOUT,
      maxBuffer: 10 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(new Error(`jugaad-data bridge error: ${error.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}

export async function probeJugaadData(): Promise<JugaadProbeResult> {
  const raw = await runBridge([]);
  const lines = raw.split('\n').filter(l => l.trim().startsWith('{'));
  if (lines.length === 0) return {};
  return JSON.parse(lines[lines.length - 1]) as JugaadProbeResult;
}

export async function runStockQuery(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<JugaadStockRow[]> {
  const raw = await runBridge(['stock', symbol, fromDate, toDate]);
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`jugaad-data stock query returned non-array: ${typeof data}`);
  return data as JugaadStockRow[];
}

export async function runBhavcopyQuery(date: string): Promise<JugaadBhavcopyRow[]> {
  const raw = await runBridge(['bhavcopy', date]);
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`jugaad-data bhavcopy returned non-array: ${typeof data}`);
  return data as JugaadBhavcopyRow[];
}

export async function runIndexQuery(): Promise<Record<string, unknown>> {
  const raw = await runBridge(['indices']);
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function runRbiRatesQuery(): Promise<Record<string, unknown>> {
  const raw = await runBridge(['rbi']);
  return JSON.parse(raw) as Record<string, unknown>;
}
