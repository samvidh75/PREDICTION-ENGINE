/**
 * TRACK-8C: Provider Probe — Find a working Indian fundamentals source
 * Tests all available providers against 5 anchor companies.
 * Evidence only — measures actual API responses.
 * 
 * Run: npx tsx scripts/provider-probe.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const OUT = path.resolve(__dirname, '..', 'reports', 'track-8c');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const LOG: string[] = [];
function log(s: string) { console.log(s); LOG.push(s); }
function lognl() { console.log(''); LOG.push(''); }

const COMPANIES = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY'];
const FIELDS_19 = ['peRatio','pbRatio','evEbitda','roe','roic','grossMargin','operatingMargin','netMargin','revenueGrowth','epsGrowth','profitGrowth','fcfGrowth','debtToEquity','currentRatio','interestCoverage','freeCashFlow','dividendYield','beta','marketCap'];

// ═══════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════
interface ProbeResult {
  provider: string;
  company: string;
  status: number | string;
  fieldsReturned: number;
  fields: Record<string, string>;
  rawKeys: string[];
  error?: string;
  works: boolean;
}

const results: ProbeResult[] = [];

async function probe(name: string, fn: (sym: string) => Promise<{ status: number; data: any }>) {
  for (const sym of COMPANIES) {
    try {
      const { status, data } = await fn(sym);
      const flat: Record<string, string> = {};
      const keys: string[] = [];
      if (data && typeof data === 'object') {
        function extract(obj: any, prefix: string = '') {
          if (!obj || typeof obj !== 'object') return;
          for (const [k, v] of Object.entries(obj)) {
