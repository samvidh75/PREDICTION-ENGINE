/**
 * reproduce_all_claims.ts — TRACK-60 Agent D
 * One command to recompute all published metrics.
 * Output: PASS if all claims verified, FAIL otherwise.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

interface ClaimVerification {
  claim: string;
  expected: string;
  actual: string;
  tolerance: number;
  pass: boolean;
}

const results: ClaimVerification[] = [];

// 1. Verify 365d hit rate claim
const r365 = db.prepare(`SELECT COUNT(*) as n, SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) as h FROM alpha_research_registry WHERE prediction_horizon=365 AND actual_return IS NOT NULL`).get();
if (r365.n > 0) {
  const rate = (r365.h / r365.n * 100);
  results.push({ claim: '365d hit rate ~70%', expected: '69.8%', actual: rate.toFixed(1) + '%', tolerance: 2, pass: Math.abs(rate - 69.8) < 2 });
}

// 2. Verify 30d hit rate
const r30 = db.prepare(`SELECT COUNT(*) as n, SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) as h FROM alpha_research_registry WHERE prediction_horizon=30 AND actual_return IS NOT NULL`).get();
if (r30.n > 0) {
  const rate = (r30.h / r30.n * 100);
  results.push({ claim: '30d hit rate ~55%', expected: '55.0%', actual: rate.toFixed(1) + '%', tolerance: 2, pass: Math.abs(rate - 55) < 2 });
}

// 3. Verify Cheap Quality claim
const cq = db.prepare(`SELECT COUNT(*) as n, SUM(CASE WHEN a.hit=1 OR a.hit='true' THEN 1 ELSE 0 END) as h FROM alpha_research_registry a JOIN quality_registry q ON a.symbol=q.symbol WHERE a.prediction_horizon=30 AND a.actual_return IS NOT NULL AND q.pe_ratio<15 AND q.roe>15`).get();
if (cq.n > 0) {
  const rate = (cq.h / cq.n * 100);
  results.push({ claim: 'Cheap Quality ~59%', expected: '59.0%', actual: rate.toFixed(1) + '%', tolerance: 3, pass: Math.abs(rate - 59) < 3 });
}

// 4. Verify prediction registry size
const total = db.prepare('SELECT COUNT(*) as n FROM alpha_research_registry WHERE actual_return IS NOT NULL').get();
results.push({ claim: 'Total validated predictions > 50,000', expected: '>50k', actual: total.n.toLocaleString(), tolerance: 0, pass: total.n > 50000 });

// 5. Verify walk-forward consistency (all years > 54% at 365d)
const byYear = db.prepare(`SELECT substr(prediction_date,1,4) as yr, COUNT(*) as n, SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) as h FROM alpha_research_registry WHERE prediction_horizon=365 AND actual_return IS NOT NULL GROUP BY yr HAVING yr >= '2021'`).all();
const allAbove = byYear.every((y: any) => y.n > 10 && (y.h / y.n * 100) > 54);
results.push({ claim: 'Walk-forward: all years > 54% at 365d', expected: 'All years > 54%', actual: byYear.map((y: any) => y.yr + ':' + (y.h/y.n*100).toFixed(1)+'%').join(', '), tolerance: 0, pass: allAbove });

// Output
const allPass = results.every(r => r.pass);
console.log('\n==========================================');
console.log(allPass ? '✅ ALL CLAIMS VERIFIED — PASS' : '❌ CLAIM VERIFICATION FAILED');
console.log('==========================================\n');
results.forEach(r => console.log(r.pass ? '✅' : '❌', r.claim, '| Expected:', r.expected, '| Actual:', r.actual));
db.close();
process.exit(allPass ? 0 : 1);
