// scripts/run-real-backtest.ts
// Run real-data walk-forward validation across the PSEi universe using the
// actual `daily_prices` table. Prints an honest per-symbol report: symbols
// without enough real history are excluded and reported, never backfilled.
//
// Run: npx tsx scripts/run-real-backtest.ts

import { runRealUniverseWalkForward } from "../src/backtest/realDataWalkForward";
import { PSEI_SYMBOLS } from "../src/backtest/BenchmarkEngine";

function pct(v: number): string {
  return `${(v * 1).toFixed(2)}%`;
}

async function main() {
  console.log("Real-data walk-forward backtest (PSEi universe)\n");
  const { results, withData, withWindows } = await runRealUniverseWalkForward();

  let ran = 0;
  let sumTotal = 0;
  let sumSharpe = 0;
  let sumMaxDD = 0;

  for (const r of results) {
    if (r.error) {
      console.log(`${r.symbol.padEnd(6)} ${r.bars.toString().padStart(4)} bars  — ${r.error}`);
      continue;
    }
    ran += 1;
    sumTotal += r.totalReturnPct;
    sumSharpe += r.sharpeRatio;
    sumMaxDD += r.maxDrawdownPct;
    console.log(
      `${r.symbol.padEnd(6)} ${r.bars.toString().padStart(4)} bars  ` +
        `total ${pct(r.totalReturnPct).padStart(9)}  annual ${pct(r.annualizedReturnPct).padStart(9)}  ` +
        `maxDD ${pct(r.maxDrawdownPct).padStart(9)}  sharpe ${r.sharpeRatio.toFixed(2).padStart(6)}  ` +
        `win ${(r.winRate * 100).toFixed(0).padStart(3)}%  windows ${r.windows}`,
    );
  }

  console.log("\nSummary");
  console.log(`  symbols tested   : ${results.length}`);
  console.log(`  with real data   : ${withData}`);
  console.log(`  with >=1 window  : ${withWindows}`);
  if (ran > 0) {
    console.log(`  avg total return : ${pct(sumTotal / ran)}`);
    console.log(`  avg sharpe       : ${(sumSharpe / ran).toFixed(3)}`);
    console.log(`  avg max drawdown : ${pct(sumMaxDD / ran)}`);
  }
  console.log(`\nStrategy: momentum (long when train-window mean return > 0), long-only, no leverage.`);
  console.log(`This is an illustrative, fully-disclosed model — not investment advice.`);
}

main().catch((e) => {
  console.error("Backtest failed:", e);
  process.exit(1);
});
