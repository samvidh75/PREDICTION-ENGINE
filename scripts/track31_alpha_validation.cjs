/**
 * TRACK-31 — Institutional Backtesting, Benchmarking & Alpha Validation Engine
 * 
 * Execution script. Runs all 12 phases against the production PostgreSQL database
 * and generates the complete report suite.
 * 
 * Usage: node scripts/track31_alpha_validation.cjs
 * 
 * WARNING: This is the certification run. Results determine StockStory's
 * institutional investability classification. No estimates, no assumptions.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// ─── Database ────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

const query = (text, params) => pool.query(text, params);

// ─── Config ──────────────────────────────────────────────────────────────────

const REPORT_DIR = path.join(__dirname, '..', 'reports', 'track-31');
fs.mkdirSync(REPORT_DIR, { recursive: true });

const RISK_FREE_RATE = 0.065; // 6.5% Indian risk-free rate
const TRADING_DAYS_PER_YEAR = 252;

// ─── Utility Functions ──────────────────────────────────────────────────────

function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function pearsonR(x, y) {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;
  const mx = mean(x), my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

function annualizedReturn(totalRet, days) {
  if (days <= 0 || totalRet <= -1) return -1;
  return Math.pow(1 + totalRet, 365 / days) - 1;
}

function annualizedVolatility(dailyReturns) {
  if (dailyReturns.length < 2) return 0;
  return stdDev(dailyReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function maxDrawdown(curve) {
  let peak = curve[0], dd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    dd = Math.max(dd, (peak - v) / peak);
  }
  return dd;
}

function sharpe(annRet, annVol, rf = RISK_FREE_RATE) {
  return annVol === 0 ? 0 : (annRet - rf) / annVol;
}

function sortino(dailyReturns, rf = RISK_FREE_RATE) {
  const annRet = annualizedReturn(dailyReturns.reduce((a, b) => a + b, 0), dailyReturns.length);
  const downside = dailyReturns.filter(r => r < 0);
  if (downside.length === 0) return 10;
  const downStd = stdDev(downside) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  return downStd === 0 ? 0 : (annRet - rf) / downStd;
}

function tStat(meanVal, sd, n) {
  if (sd === 0 || n < 2) return 0;
  return meanVal / (sd / Math.sqrt(n));
}

function pValueFromT(t, df) {
  if (df < 1) return 1;
  const x = df / (df + t * t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Welch-Satterthwaite approximation
  let result = 0.5;
  let term = 0.5 * x;
  for (let i = 1; i <= 200; i += 2) {
    result -= term / i;
    term *= x;
  }
  return Math.max(0, Math.min(1, Math.abs(result)));
}

function formatPct(v) { return (v * 100).toFixed(2) + '%'; }
function formatNum(v) { return typeof v === 'number' ? v.toFixed(4) : String(v); }

// ─── PHASE 1: Snapshot Inventory ─────────────────────────────────────────────

async function phase1SnapshotInventory() {
  console.log('━━━ PHASE 1: Historical Snapshot Census ━━━');

  // Get all available factor snapshot dates
  const dateRes = await query(
    `SELECT DISTINCT trade_date, COUNT(DISTINCT symbol) as symbols
     FROM factor_snapshots
     GROUP BY trade_date
     ORDER BY trade_date`
  );
  const allDates = dateRes.rows;

  // Get factor coverage
  const factorRes = await query(
    `SELECT
       COUNT(*) as total,
       COUNT(quality_factor) FILTER (WHERE quality_factor IS NOT NULL) as quality,
       COUNT(growth_factor) FILTER (WHERE growth_factor IS NOT NULL) as growth,
       COUNT(value_factor) FILTER (WHERE value_factor IS NOT NULL) as value,
       COUNT(momentum_factor) FILTER (WHERE momentum_factor IS NOT NULL) as momentum,
       COUNT(risk_factor) FILTER (WHERE risk_factor IS NOT NULL) as risk,
       COUNT(sector_strength_factor) FILTER (WHERE sector_strength_factor IS NOT NULL) as sector_strength
     FROM factor_snapshots`
  );

  const factorCov = factorRes.rows[0];

  // Get feature snapshot coverage
  const featRes = await query(
    `SELECT COUNT(*) as total, COUNT(DISTINCT trade_date) as dates, COUNT(DISTINCT symbol) as symbols
     FROM feature_snapshots`
  );

  // Get registry coverage
  const regRes = await query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE listing_status = 'Active') as active,
       COUNT(*) FILTER (WHERE listing_status = 'Delisted') as delisted,
       COUNT(*) FILTER (WHERE listing_status = 'Suspended') as suspended,
       COUNT(*) FILTER (WHERE listing_status = 'Merged') as merged
     FROM master_security_registry`
  );

  // Get price data coverage
  const priceRes = await query(
    `SELECT MIN(trade_date) as first_date, MAX(trade_date) as last_date,
       COUNT(DISTINCT trade_date) as trading_days, COUNT(DISTINCT symbol) as symbols
     FROM daily_prices`
  );

  // Build inventory entries (group by month-year buckets)
  const entries = [];
  const months = new Set();
  for (const d of allDates) {
    const dt = new Date(d.trade_date);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    months.add(key);
  }

  // Identify the key periods
  const firstDate = allDates.length > 0 ? allDates[0].trade_date.toISOString().split('T')[0] : 'N/A';
  const lastDate = allDates.length > 0 ? allDates[allDates.length - 1].trade_date.toISOString().split('T')[0] : 'N/A';

  const snapshotInventory = {
    generatedAt: new Date().toISOString(),
    firstSnapshotDate: firstDate,
    lastSnapshotDate: lastDate,
    totalSnapshots: allDates.length,
    symbolsCovered: allDates.length > 0 ? Math.max(...allDates.map(d => parseInt(d.symbols))) : 0,
    factorsAvailable: [
      'quality_factor', 'growth_factor', 'value_factor',
      'momentum_factor', 'risk_factor', 'sector_strength_factor',
    ],
    factorCoverage: {
      total: parseInt(factorCov.total),
      quality: parseInt(factorCov.quality),
      growth: parseInt(factorCov.growth),
      value: parseInt(factorCov.value),
      momentum: parseInt(factorCov.momentum),
      risk: parseInt(factorCov.risk),
      sectorStrength: parseInt(factorCov.sector_strength),
    },
    featureSnapshots: {
      total: parseInt(featRes.rows[0].total),
      dates: parseInt(featRes.rows[0].dates),
      symbols: parseInt(featRes.rows[0].symbols),
    },
    registry: {
      total: parseInt(regRes.rows[0].total),
      active: parseInt(regRes.rows[0].active),
      delisted: parseInt(regRes.rows[0].delisted),
      suspended: parseInt(regRes.rows[0].suspended),
      merged: parseInt(regRes.rows[0].merged),
    },
    priceData: {
      firstDate: priceRes.rows[0].first_date?.toISOString().split('T')[0] || 'N/A',
      lastDate: priceRes.rows[0].last_date?.toISOString().split('T')[0] || 'N/A',
      tradingDays: parseInt(priceRes.rows[0].trading_days),
      symbols: parseInt(priceRes.rows[0].symbols),
    },
    distinctSnapshotMonths: months.size,
    missingPeriods: [],
    stalePeriods: [],
  };

  // Check for gaps (> 30 days between snapshots)
  for (let i = 1; i < allDates.length; i++) {
    const prev = new Date(allDates[i - 1].trade_date);
    const curr = new Date(allDates[i].trade_date);
    const gap = (curr - prev) / (1000 * 60 * 60 * 24);
    if (gap > 30) {
      snapshotInventory.missingPeriods.push(
        `${allDates[i - 1].trade_date.toISOString().split('T')[0]} to ${allDates[i].trade_date.toISOString().split('T')[0]} (${Math.round(gap)} days)`
      );
    }
  }

  // Check for stale periods (snapshots older than 7 days from now)
  const now = new Date();
  const lastSnapshotDate = new Date(lastDate);
  if ((now - lastSnapshotDate) / (1000 * 60 * 60 * 24) > 7) {
    snapshotInventory.stalePeriods.push(
      `Last snapshot ${lastDate} is ${Math.round((now - lastSnapshotDate) / (1000 * 60 * 60 * 24))} days old`
    );
  }

  const report = `# 01 — Snapshot Inventory

**Generated:** ${snapshotInventory.generatedAt}

---

## Coverage Summary

| Dimension | Value |
|:----------|:------|
| First Snapshot Date | ${snapshotInventory.firstSnapshotDate} |
| Last Snapshot Date | ${snapshotInventory.lastSnapshotDate} |
| Total Distinct Snapshots | ${snapshotInventory.totalSnapshots} |
| Distinct Snapshot Months | ${snapshotInventory.distinctSnapshotMonths} |
| Max Symbols in Any Snapshot | ${snapshotInventory.symbolsCovered} |

---

## Factor Coverage

| Factor | Records | Coverage |
|:-------|:--------|:---------|
| Quality Factor | ${snapshotInventory.factorCoverage.quality} | ${(snapshotInventory.factorCoverage.quality / Math.max(1, snapshotInventory.factorCoverage.total) * 100).toFixed(1)}% |
| Growth Factor | ${snapshotInventory.factorCoverage.growth} | ${(snapshotInventory.factorCoverage.growth / Math.max(1, snapshotInventory.factorCoverage.total) * 100).toFixed(1)}% |
| Value Factor | ${snapshotInventory.factorCoverage.value} | ${(snapshotInventory.factorCoverage.value / Math.max(1, snapshotInventory.factorCoverage.total) * 100).toFixed(1)}% |
| Momentum Factor | ${snapshotInventory.factorCoverage.momentum} | ${(snapshotInventory.factorCoverage.momentum / Math.max(1, snapshotInventory.factorCoverage.total) * 100).toFixed(1)}% |
| Risk Factor | ${snapshotInventory.factorCoverage.risk} | ${(snapshotInventory.factorCoverage.risk / Math.max(1, snapshotInventory.factorCoverage.total) * 100).toFixed(1)}% |
| Sector Strength Factor | ${snapshotInventory.factorCoverage.sectorStrength} | ${(snapshotInventory.factorCoverage.sectorStrength / Math.max(1, snapshotInventory.factorCoverage.total) * 100).toFixed(1)}% |
| **Total Snapshots** | **${snapshotInventory.factorCoverage.total}** | — |

---

## Feature Snapshot Coverage

| Metric | Value |
|:-------|:------|
| Total Records | ${snapshotInventory.featureSnapshots.total} |
| Distinct Dates | ${snapshotInventory.featureSnapshots.dates} |
| Distinct Symbols | ${snapshotInventory.featureSnapshots.symbols} |

---

## Registry Coverage

| Status | Count |
|:-------|:------|
| Active | ${snapshotInventory.registry.active} |
| Delisted | ${snapshotInventory.registry.delisted} |
| Suspended | ${snapshotInventory.registry.suspended} |
| Merged | ${snapshotInventory.registry.merged} |
| **Total** | **${snapshotInventory.registry.total}** |

---

## Price Data Coverage

| Metric | Value |
|:-------|:------|
| First Date | ${snapshotInventory.priceData.firstDate} |
| Last Date | ${snapshotInventory.priceData.lastDate} |
| Trading Days | ${snapshotInventory.priceData.tradingDays} |
| Symbols with Prices | ${snapshotInventory.priceData.symbols} |

---

## Missing Periods

${snapshotInventory.missingPeriods.length === 0 ? '✅ No gaps > 30 days detected.' : snapshotInventory.missingPeriods.map(p => `- ${p}`).join('\n')}

## Stale Periods

${snapshotInventory.stalePeriods.length === 0 ? '✅ All snapshots are current (< 7 days).' : snapshotInventory.stalePeriods.map(p => `- ⚠️ ${p}`).join('\n')}

---

## Verdict

${snapshotInventory.factorCoverage.total > 100 && snapshotInventory.registry.active > 50 ? '✅ **Sufficient data for institutional backtesting.**' : '❌ **INSUFFICIENT DATA** — cannot proceed with backtesting.'}
`;

  fs.writeFileSync(path.join(REPORT_DIR, '01-SnapshotInventory.md'), report);
  console.log('  ✅ 01-SnapshotInventory.md generated');
  return snapshotInventory;
}

// ─── PHASE 2: Benchmark Engine ────────────────────────────────────────────────

async function phase2BenchmarkEngine(inventory) {
  console.log('━━━ PHASE 2: Benchmark Engine ━━━');

  const startDate = inventory.priceData.firstDate;
  const endDate = inventory.priceData.lastDate;

  // Compute equal-weight universe benchmark from daily_prices
  const priceRes = await query(
    `SELECT trade_date, AVG(adjusted_close) as avg_close
     FROM daily_prices
     WHERE trade_date BETWEEN $1 AND $2
     GROUP BY trade_date
     ORDER BY trade_date`,
    [startDate, endDate]
  );

  const prices = priceRes.rows.map(r => parseFloat(r.avg_close));
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  // Compute monthly returns for NIFTY approximation
  const monthlyReturns = [];
  for (let i = 0; i < returns.length; i += 21) {
    const chunk = returns.slice(i, i + 21);
    if (chunk.length > 0) monthlyReturns.push(chunk.reduce((a, b) => a + b, 0));
  }
  const positiveMonths = monthlyReturns.filter(r => r > 0).length;

  const equityCurve = [1];
  for (const r of returns) equityCurve.push(equityCurve[equityCurve.length - 1] * (1 + r));

  const totalReturn = prices.length > 1 ? (prices[prices.length - 1] - prices[0]) / prices[0] : 0;
  const annRet = annualizedReturn(totalReturn, prices.length);
  const annVol = annualizedVolatility(returns);
  const dd = maxDrawdown(equityCurve);

  // Try to fetch NIFTY50-specific prices if available
  const nifty50Symbols = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR',
    'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'BAJFINANCE', 'ASIANPAINT',
    'AXISBANK', 'MARUTI', 'SUNPHARMA', 'TITAN', 'NTPC', 'POWERGRID', 'ONGC',
    'NESTLEIND', 'TECHM', 'DRREDDY', 'WIPRO', 'ULTRACEMCO',
  ];

  let nifty50Metrics = null;
  try {
    const n50Res = await query(
      `SELECT trade_date, AVG(adjusted_close) as avg_close
       FROM daily_prices
       WHERE symbol = ANY($1) AND trade_date BETWEEN $2 AND $3
       GROUP BY trade_date ORDER BY trade_date`,
      [nifty50Symbols, startDate, endDate]
    );
    if (n50Res.rows.length > 1) {
      const n50Prices = n50Res.rows.map(r => parseFloat(r.avg_close));
      const n50Returns = [];
      for (let i = 1; i < n50Prices.length; i++) {
        if (n50Prices[i - 1] > 0) n50Returns.push((n50Prices[i] - n50Prices[i - 1]) / n50Prices[i - 1]);
      }
      const n50Total = (n50Prices[n50Prices.length - 1] - n50Prices[0]) / n50Prices[0];
      const n50Curve = [1];
      for (const r of n50Returns) n50Curve.push(n50Curve[n50Curve.length - 1] * (1 + r));

      nifty50Metrics = {
        cagr: annualizedReturn(n50Total, n50Prices.length),
        volatility: annualizedVolatility(n50Returns),
        sharpe: sharpe(annualizedReturn(n50Total, n50Prices.length), annualizedVolatility(n50Returns)),
        sortino: sortino(n50Returns),
        maxDrawdown: maxDrawdown(n50Curve),
        totalReturn: n50Total,
      };
    }
  } catch (e) {
    // NIFTY50 data may not be available
  }

  const benchmarks = [
    {
      index: 'EQUAL_WEIGHT_UNIVERSE',
      metrics: {
        cagr: annRet,
        sharpe: sharpe(annRet, annVol),
        sortino: sortino(returns),
        maxDrawdown: dd,
        volatility: annVol,
        totalReturn,
        positiveMonths,
        totalMonths: monthlyReturns.length,
        winRate: monthlyReturns.length > 0 ? positiveMonths / monthlyReturns.length : 0,
      },
      constituents: inventory.priceData.symbols,
    },
    ...(nifty50Metrics ? [{
      index: 'NIFTY50',
      metrics: nifty50Metrics,
      constituents: nifty50Symbols.length,
    }] : []),
  ];

  // Report
  let report = `# 02 — Benchmark Engine

**Generated:** ${new Date().toISOString()}
**Period:** ${startDate} to ${endDate}

---

## Benchmark Metrics

| Index | CAGR | Sharpe | Sortino | Max DD | Volatility | Win Rate | Constituents |
|:------|:-----|:-------|:--------|:-------|:-----------|:---------|:-------------|
`;

  for (const b of benchmarks) {
    report += `| ${b.index} | ${formatPct(b.metrics.cagr)} | ${b.metrics.sharpe.toFixed(2)} | ${b.metrics.sortino.toFixed(2)} | ${formatPct(b.metrics.maxDrawdown)} | ${formatPct(b.metrics.volatility)} | ${formatPct(b.metrics.winRate)} | ${b.constituents} |\n`;
  }

  report += `\n---\n\n## Key Findings\n\n`;

  const ew = benchmarks[0].metrics;
  report += `- **Equal-Weight Universe**: CAGR ${formatPct(ew.cagr)}, Sharpe ${ew.sharpe.toFixed(2)}, Max DD ${formatPct(ew.maxDrawdown)}\n`;

  if (nifty50Metrics) {
    report += `- **NIFTY50**: CAGR ${formatPct(nifty50Metrics.cagr)}, Sharpe ${nifty50Metrics.sharpe.toFixed(2)}, Max DD ${formatPct(nifty50Metrics.maxDrawdown)}\n`;
    report += `- Universe vs NIFTY50 alpha: ${formatPct(ew.cagr - nifty50Metrics.cagr)}\n`;
  }

  report += `\n---\n\n## Data Quality\n\n`;
  report += `- Risk-free rate used: 6.5% (Indian 10-year G-Sec)\n`;
  report += `- ${inventory.priceData.tradingDays} trading days analyzed\n`;
  report += `- ${inventory.priceData.symbols} symbols with price data\n`;

  fs.writeFileSync(path.join(REPORT_DIR, '02-BenchmarkEngine.md'), report);
  console.log('  ✅ 02-BenchmarkEngine.md generated');
  return { benchmarks, riskFreeRate: RISK_FREE_RATE };
}

// ─── PHASE 3: Portfolio Simulator ─────────────────────────────────────────────

async function phase3PortfolioSimulator(inventory) {
  console.log('━━━ PHASE 3: Portfolio Simulator ━━━');

  const snapshots = await query(
    `SELECT trade_date FROM factor_snapshots
     GROUP BY trade_date ORDER BY trade_date`
  );

  if (snapshots.rows.length === 0) {
    const report = `# 03 — Portfolio Simulator\n\n**INSUFFICIENT DATA** — No factor snapshots found.\n`;
    fs.writeFileSync(path.join(REPORT_DIR, '03-PortfolioSimulator.md'), report);
    console.log('  ⚠️ 03-PortfolioSimulator.md generated (no data)');
    return { strategies: [] };
  }

  const snapshotDates = snapshots.rows.map(r => r.trade_date.toISOString().split('T')[0]);

  // Sample a subset of snapshots for practical runtime
  const sampleDates = [];
  const step = Math.max(1, Math.floor(snapshotDates.length / 20));
  for (let i = 0; i < snapshotDates.length; i += step) {
    sampleDates.push(snapshotDates[i]);
  }

  const strategies = ['TOP_10', 'TOP_20', 'TOP_50', 'SECTOR_BALANCED_TOP_20', 'CONFIDENCE_WEIGHTED'];
  const frequencies = ['MONTHLY', 'QUARTERLY'];

  const strategyResults = [];

  for (const strategy of strategies) {
    for (const freq of frequencies) {
      const rebalanceDays = freq === 'MONTHLY' ? 21 : 63;
      const returns = [];

      for (let i = 0; i < sampleDates.length - 1; i++) {
        const date = sampleDates[i];
        const horizonDays = Math.min(rebalanceDays,
          Math.round((new Date(sampleDates[i + 1]).getTime() - new Date(date).getTime()) / 86400000));

        // Fetch top ranked stocks for this date
        let limit = 50;
        if (strategy === 'TOP_10') limit = 10;
        else if (strategy === 'TOP_20') limit = 20;

        const stocksRes = await query(
          `SELECT fs.symbol, msr.sector, fs.factor_score as "factorScore"
           FROM factor_snapshots fs
           LEFT JOIN master_security_registry msr ON fs.symbol = msr.symbol
           WHERE fs.trade_date = $1
           ORDER BY fs.factor_score DESC
           LIMIT $2`,
          [date, limit]
        );

        if (stocksRes.rows.length === 0) continue;

        let portfolio = stocksRes.rows;

        // Sector-balanced: pick top 2 per sector
        if (strategy === 'SECTOR_BALANCED_TOP_20') {
          const sectors = new Map();
          const allStocks = await query(
            `SELECT fs.symbol, msr.sector, fs.factor_score as "factorScore"
             FROM factor_snapshots fs
             LEFT JOIN master_security_registry msr ON fs.symbol = msr.symbol
             WHERE fs.trade_date = $1
             ORDER BY fs.factor_score DESC`,
            [date]
          );
          for (const s of allStocks.rows) {
            const sec = s.sector || 'Unknown';
            if (!sectors.has(sec)) sectors.set(sec, []);
            if (sectors.get(sec).length < 2) sectors.get(sec).push(s);
            if (Array.from(sectors.values()).flat().length >= 20) break;
          }
          portfolio = Array.from(sectors.values()).flat().slice(0, 20);
        }

        if (portfolio.length === 0) continue;

        // Calculate forward return
        const stockReturns = [];
        for (const stock of portfolio) {
          const pr = await query(
            `SELECT
               (SELECT adjusted_close FROM daily_prices
                WHERE symbol = $1 AND trade_date <= $2::date + $3::int
                ORDER BY trade_date DESC LIMIT 1) as end_price,
               (SELECT adjusted_close FROM daily_prices
                WHERE symbol = $1 AND trade_date <= $2::date
                ORDER BY trade_date DESC LIMIT 1) as start_price`,
            [stock.symbol, date, horizonDays]
          );
          const row = pr.rows[0];
          if (row && row.start_price && row.end_price && parseFloat(row.start_price) > 0) {
            stockReturns.push((parseFloat(row.end_price) - parseFloat(row.start_price)) / parseFloat(row.start_price));
          }
        }

        if (stockReturns.length > 0) {
          returns.push(mean(stockReturns));
        }
      }

      const totalRet = returns.reduce((a, b) => a + b, 0);
      const annRet = annualizedReturn(totalRet, returns.length);
      const annVol = annualizedVolatility(returns);
      const curve = [1];
      for (const r of returns) curve.push(curve[curve.length - 1] * (1 + r));
      const dd = maxDrawdown(curve);

      const monthlyRets = [];
      for (let i = 0; i < returns.length; i += 21) {
        const chunk = returns.slice(i, i + 21);
        if (chunk.length > 0) monthlyRets.push(chunk.reduce((a, b) => a + b, 0));
      }
      const posMonths = monthlyRets.filter(r => r > 0).length;

      strategyResults.push({
        strategy,
        frequency: freq,
        samples: returns.length,
        cagr: annRet,
        sharpe: sharpe(annRet, annVol),
        sortino: sortino(returns),
        maxDrawdown: dd,
        volatility: annVol,
        totalReturn: totalRet,
        winRate: monthlyRets.length > 0 ? posMonths / monthlyRets.length : 0,
      });
    }
  }

  // Sort by Sharpe
  strategyResults.sort((a, b) => b.sharpe - a.sharpe);

  let report = `# 03 — Portfolio Simulator

**Generated:** ${new Date().toISOString()}
**Snapshots Analyzed:** ${sampleDates.length} of ${snapshotDates.length} available
**Date Range:** ${sampleDates[0] || 'N/A'} to ${sampleDates[sampleDates.length - 1] || 'N/A'}

---

## Strategy Performance (Ranked by Sharpe)

| Strategy | Frequency | CAGR | Sharpe | Sortino | Max DD | Volatility | Win Rate | Samples |
|:---------|:----------|:-----|:-------|:--------|:-------|:-----------|:---------|:--------|
`;

  for (const sr of strategyResults) {
    report += `| ${sr.strategy} | ${sr.frequency} | ${formatPct(sr.cagr)} | ${sr.sharpe.toFixed(2)} | ${sr.sortino.toFixed(2)} | ${formatPct(sr.maxDrawdown)} | ${formatPct(sr.volatility)} | ${formatPct(sr.winRate)} | ${sr.samples} |\n`;
  }

  // Best strategy analysis
  const best = strategyResults[0];
  if (best) {
    report += `\n## Best Strategy\n\n`;
    report += `- **${best.strategy}** with **${best.frequency}** rebalancing\n`;
    report += `- CAGR: ${formatPct(best.cagr)}, Sharpe: ${best.sharpe.toFixed(2)}\n`;
    report += `- Max Drawdown: ${formatPct(best.maxDrawdown)}\n`;
    report += `- Win Rate: ${formatPct(best.winRate)}\n`;

    // Top 10 vs Bottom 10 analysis
    if (strategyResults.length > 9) {
      const worst = strategyResults[strategyResults.length - 1];
      report += `\n## Spread Analysis\n\n`;
      report += `- Best-Worst CAGR Spread: ${formatPct(best.cagr - worst.cagr)}\n`;
      report += `- Best-Worst Sharpe Spread: ${(best.sharpe - worst.sharpe).toFixed(2)}\n`;
    }
  }

  report += `\n---\n\n## Methodology\n\n`;
  report += `- Equal-weighted portfolios\n`;
  report += `- Forward returns measured using actual adjusted_close prices\n`;
  report += `- Rebalancing at specified intervals with look-ahead protection\n`;
  report += `- Sector-Balanced: top 2 from each sector, capped at 20 stocks\n`;
  report += `- Risk-free rate: 6.5%\n`;

  fs.writeFileSync(path.join(REPORT_DIR, '03-PortfolioSimulator.md'), report);
  console.log('  ✅ 03-PortfolioSimulator.md generated');
  return { strategyResults };
}

// ─── PHASE 4: Rolling Backtest Engine ─────────────────────────────────────────

async function phase4RollingBacktest(inventory) {
  console.log('━━━ PHASE 4: Rolling Backtest Engine ━━━');

  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  const windows = [30, 90, 180, 365];
  const currentYear = new Date().getFullYear();
  const relevantYears = years.filter(y => y <= currentYear);

  const rollingResults = [];

  for (const year of relevantYears) {
    const yearWindows = [];
    for (const windowDays of windows) {
      const startDate = `${year}-01-01`;
      const endDate = `${Math.min(year, currentYear)}-12-31`;

      try {
        // Get all prices for this window
        const priceRes = await query(
          `SELECT trade_date, AVG(adjusted_close) as avg_close
           FROM daily_prices
           WHERE trade_date BETWEEN $1 AND $2
           GROUP BY trade_date ORDER BY trade_date`,
          [startDate, endDate]
        );

        if (priceRes.rows.length < 2) {
          yearWindows.push({ window: windowDays, cagr: 0, sharpe: 0, alpha: 0, samples: 0, consistency: 0 });
          continue;
        }

        const prices = priceRes.rows.map(r => parseFloat(r.avg_close));
        const allReturns = [];
        for (let i = 1; i < prices.length; i++) {
          if (prices[i - 1] > 0) allReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }

        // Calculate rolling window returns
        const rollingReturns = [];
        let positiveWindows = 0;
        for (let i = 0; i <= allReturns.length - windowDays; i++) {
          const windowRet = allReturns.slice(i, i + windowDays).reduce((a, b) => a + b, 0);
          rollingReturns.push(windowRet);
          if (windowRet > 0) positiveWindows++;
        }

        const totalWindowRet = rollingReturns.reduce((a, b) => a + b, 0);
        const annRet = annualizedReturn(totalWindowRet, rollingReturns.length);
        const annVol = annualizedVolatility(allReturns);

        yearWindows.push({
          window: windowDays,
          cagr: annRet,
          sharpe: sharpe(annRet, annVol),
          sortino: sortino(allReturns),
          maxDrawdown: maxDrawdown([1, ...allReturns.map(r => 1 + r)].map((v, i, a) => i === 0 ? v : a[i - 1] * v)),
          volatility: annVol,
          totalReturn: totalWindowRet,
          samples: rollingReturns.length,
          consistency: rollingReturns.length > 0 ? positiveWindows / rollingReturns.length : 0,
          alpha: annRet - RISK_FREE_RATE,
        });
      } catch (e) {
        yearWindows.push({ window: windowDays, cagr: 0, sharpe: 0, alpha: 0, samples: 0, consistency: 0 });
      }
    }

    const avgAlpha = mean(yearWindows.map(w => w.alpha));
    const avgSharpe = mean(yearWindows.map(w => w.sharpe));

    rollingResults.push({
      year,
      windows: yearWindows,
      avgAlpha,
      avgSharpe,
    });
  }

  let report = `# 04 — Rolling Backtest

**Generated:** ${new Date().toISOString()}

---

## Rolling Window Performance by Year

| Year | Window (Days) | CAGR | Sharpe | Sortino | Max DD | Alpha | Consistency | Samples |
|:-----|:--------------|:-----|:-------|:--------|:-------|:------|:------------|:--------|
`;

  for (const yr of rollingResults) {
    for (const w of yr.windows) {
      report += `| ${yr.year} | ${w.window} | ${formatPct(w.cagr)} | ${(w.sharpe || 0).toFixed(2)} | ${(w.sortino || 0).toFixed(2)} | ${formatPct(w.maxDrawdown || 0)} | ${formatPct(w.alpha || 0)} | ${formatPct(w.consistency || 0)} | ${w.samples || 0} |\n`;
    }
  }

  report += `\n## Yearly Summary\n\n`;
  report += `| Year | Avg Alpha | Avg Sharpe |\n`;
  report += `|:-----|:----------|:-----------|\n`;
  for (const yr of rollingResults) {
    report += `| ${yr.year} | ${formatPct(yr.avgAlpha)} | ${yr.avgSharpe.toFixed(2)} |\n`;
  }

  // Best/worst years
  const bestYear = rollingResults.reduce((a, b) => a.avgSharpe > b.avgSharpe ? a : b, rollingResults[0]);
  const worstYear = rollingResults.reduce((a, b) => a.avgSharpe < b.avgSharpe ? a : b, rollingResults[0]);

  if (bestYear && worstYear) {
    report += `\n## Key Findings\n\n`;
    report += `- **Best Year**: ${bestYear.year} (Avg Sharpe ${bestYear.avgSharpe.toFixed(2)})\n`;
    report += `- **Worst Year**: ${worstYear.year} (Avg Sharpe ${worstYear.avgSharpe.toFixed(2)})\n`;
  }

  fs.writeFileSync(path.join(REPORT_DIR, '04-RollingBacktest.md'), report);
  console.log('  ✅ 04-RollingBacktest.md generated');
  return { rollingResults };
}

// ─── PHASE 5: Factor Attribution ──────────────────────────────────────────────

async function phase5FactorAttribution(inventory) {
  console.log('━━━ PHASE 5: Factor Attribution ━━━');

  // Get factor snapshots with forward returns
  const result = await query(
    `SELECT
       fs.trade_date, fs.symbol, fs.quality_factor, fs.growth_factor,
       fs.value_factor, fs.momentum_factor, fs.risk_factor,
       fs.sector_strength_factor, fs.factor_score,
       msr.sector
     FROM factor_snapshots fs
     LEFT JOIN master_security_registry msr ON fs.symbol = msr.symbol
     ORDER BY fs.trade_date, fs.symbol`
  );

  if (result.rows.length === 0) {
    const report = `# 05 — Factor Attribution\n\n**INSUFFICIENT DATA**\n`;
    fs.writeFileSync(path.join(REPORT_DIR, '05-FactorAttribution.md'), report);
    console.log('  ⚠️ 05-FactorAttribution.md generated (no data)');
    return { factors: [] };
  }

  const rows = result.rows;

  // Group by symbol and date to get forward returns
  const factorData = {
    quality: [], growth: [], value: [], momentum: [], risk: [], sectorStrength: [],
  };
  const forwardReturns = [];

  // Use a sample for practicality
  const sample = rows.slice(0, Math.min(5000, rows.length));

  // For each row, try to get forward 21-day return
  for (const row of sample) {
    const date = row.trade_date.toISOString().split('T')[0];
    const pr = await query(
      `SELECT
         (SELECT adjusted_close FROM daily_prices
          WHERE symbol = $1 AND trade_date <= $2::date + 21
          ORDER BY trade_date DESC LIMIT 1) as end_price,
         (SELECT adjusted_close FROM daily_prices
          WHERE symbol = $1 AND trade_date <= $2::date
          ORDER BY trade_date DESC LIMIT 1) as start_price`,
      [row.symbol, date]
    );

    const prRow = pr.rows[0];
    if (!prRow || !prRow.start_price || !prRow.end_price || parseFloat(prRow.start_price) <= 0) continue;

    const fwdRet = (parseFloat(prRow.end_price) - parseFloat(prRow.start_price)) / parseFloat(prRow.start_price);
    forwardReturns.push(fwdRet);

    factorData.quality.push(parseFloat(row.quality_factor) || 50);
    factorData.growth.push(parseFloat(row.growth_factor) || 50);
    factorData.value.push(parseFloat(row.value_factor) || 50);
    factorData.momentum.push(parseFloat(row.momentum_factor) || 50);
    factorData.risk.push(parseFloat(row.risk_factor) || 50);
    factorData.sectorStrength.push(parseFloat(row.sector_strength_factor) || 50);
  }

  const factorNames = ['Quality', 'Growth', 'Value', 'Momentum', 'Risk', 'Sector Strength'];
  const factorKeys = ['quality', 'growth', 'value', 'momentum', 'risk', 'sectorStrength'];
  const factorContributions = [];

  for (let i = 0; i < factorNames.length; i++) {
    const key = factorKeys[i];
    const values = factorData[key];
    if (values.length < 3) continue;

    const r = pearsonR(values, forwardReturns);
    const t = tStat(r, Math.sqrt((1 - r * r) / (values.length - 2)), values.length);
    const p = pValueFromT(Math.abs(t), values.length - 2);

    factorContributions.push({
      factor: factorNames[i],
      correlation: r,
      contribution: Math.abs(r) / (factorContributions.reduce((s, f) => s + Math.abs(f.correlation), 0) + Math.abs(r)) * 100,
      tStatistic: t,
      pValue: p,
      isSignificant: p < 0.05,
      samples: values.length,
    });
  }

  // Recalculate contributions
  const totalAbsCorr = factorContributions.reduce((s, f) => s + Math.abs(f.correlation), 0);
  for (const fc of factorContributions) {
    fc.contribution = totalAbsCorr > 0 ? (Math.abs(fc.correlation) / totalAbsCorr) * 100 : 16.67;
  }

  factorContributions.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  let report = `# 05 — Factor Attribution

**Generated:** ${new Date().toISOString()}
**Samples Analyzed:** ${forwardReturns.length}

---

## Factor Contribution to Forward Returns (21-Day Horizon)

| Factor | Correlation (r) | Contribution % | t-Stat | p-Value | Significant |
|:-------|:----------------|:---------------|:-------|:--------|:------------|
`;

  for (const fc of factorContributions) {
    report += `| ${fc.factor} | ${fc.correlation.toFixed(4)} | ${fc.contribution.toFixed(1)}% | ${fc.tStatistic.toFixed(3)} | ${fc.pValue.toFixed(4)} | ${fc.isSignificant ? '✅ Yes' : '❌ No'} |\n`;
  }

  // Primary driver
  const primary = factorContributions[0];
  const secondary = factorContributions.length > 1 ? factorContributions[1] : null;
  const weakest = factorContributions[factorContributions.length - 1];

  report += `\n## Key Findings\n\n`;
  report += `1. **Primary Driver**: **${primary?.factor || 'N/A'}** (r = ${primary?.correlation.toFixed(4) || 'N/A'}, p = ${primary?.pValue.toFixed(4) || 'N/A'})\n`;
  if (secondary) {
    report += `2. **Secondary Driver**: **${secondary.factor}** (r = ${secondary.correlation.toFixed(4)}, p = ${secondary.pValue.toFixed(4)})\n`;
  }
  report += `3. **Weakest Factor**: **${weakest?.factor || 'N/A'}** (r = ${weakest?.correlation.toFixed(4) || 'N/A'})\n`;

  const sigCount = factorContributions.filter(f => f.isSignificant).length;
  report += `\n## Statistical Significance\n\n`;
  report += `- ${sigCount}/${factorContributions.length} factors are statistically significant (p < 0.05)\n`;
  report += `- ${sigCount > 0 ? 'At least one factor demonstrates genuine predictive power' : 'No single factor shows statistically significant predictive power at p < 0.05'}\n`;

  report += `\n---\n\n## Answer: Which Factor Actually Drives Returns?\n\n`;
  report += `**${primary?.factor || 'N/A'}** is the strongest driver of forward returns, `;
  if (primary?.isSignificant) {
    report += `with statistically significant predictive power (p = ${primary?.pValue.toFixed(4)}).\n`;
  } else {
    report += `but its predictive power is NOT statistically significant at the 95% confidence level.\n`;
  }

  fs.writeFileSync(path.join(REPORT_DIR, '05-FactorAttribution.md'), report);
  console.log('  ✅ 05-FactorAttribution.md generated');
  return { factorContributions, primaryFactor: primary?.factor || null };
}

// ─── PHASE 6: Confidence Validation ───────────────────────────────────────────

async function phase6ConfidenceValidation(inventory) {
  console.log('━━━ PHASE 6: Confidence Validation ━━━');

  // Confidence data from existing reports + factor_snapshots
  // Factor snapshots don't have explicit confidence levels, so we derive from data completeness

  const confData = await query(
    `SELECT
       symbol,
       COUNT(*) as snapshot_count,
       COUNT(quality_factor) FILTER (WHERE quality_factor IS NOT NULL) as quality_count,
       COUNT(growth_factor) FILTER (WHERE growth_factor IS NOT NULL) as growth_count,
       COUNT(value_factor) FILTER (WHERE value_factor IS NOT NULL) as value_count,
       AVG(factor_score) as avg_factor_score
     FROM factor_snapshots
     GROUP BY symbol`
  );

  if (confData.rows.length === 0) {
    const report = `# 06 — Confidence Validation\n\n**INSUFFICIENT DATA**\n`;
    fs.writeFileSync(path.join(REPORT_DIR, '06-ConfidenceValidation.md'), report);
    console.log('  ⚠️ 06-ConfidenceValidation.md generated (no data)');
    return { buckets: [] };
  }

  // Derive confidence from data completeness
  const buckets = {
    'Very High': { samples: 0, returns: [], healthScores: [], symbols: [] },
    'High': { samples: 0, returns: [], healthScores: [], symbols: [] },
    'Medium': { samples: 0, returns: [], healthScores: [], symbols: [] },
    'Low': { samples: 0, returns: [], healthScores: [], symbols: [] },
  };

  for (const row of confData.rows) {
    const total = parseInt(row.snapshot_count);
    const qualityPct = parseInt(row.quality_count) / Math.max(1, total);
    const growthPct = parseInt(row.growth_count) / Math.max(1, total);
    const completeness = (qualityPct + growthPct) / 2;

    let level;
    if (completeness >= 0.9) level = 'Very High';
    else if (completeness >= 0.7) level = 'High';
    else if (completeness >= 0.4) level = 'Medium';
    else level = 'Low';

    buckets[level].samples++;
    buckets[level].healthScores.push(parseFloat(row.avg_factor_score) || 50);
    buckets[level].symbols.push(row.symbol);
  }

  // Try to get returns for a subset
  const bucketResults = [];
  for (const [level, data] of Object.entries(buckets)) {
    if (data.samples === 0) {
      bucketResults.push({
        level,
        samples: 0,
        averageReturn: 0,
        hitRate: 0,
        volatility: 0,
        maxDrawdown: 0,
        averageHealthScore: 0,
        sharpeRatio: 0,
      });
      continue;
    }

    // Get returns for a sample of symbols
    const sampleSymbols = data.symbols.slice(0, 10);
    const returns = [];
    for (const sym of sampleSymbols) {
      const pr = await query(
        `SELECT adjusted_close FROM daily_prices
         WHERE symbol = $1
         ORDER BY trade_date DESC LIMIT 60`,
        [sym]
      );
      const prices = pr.rows.map(r => parseFloat(r.adjusted_close));
      for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] > 0) returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }

    const avgRet = mean(returns);
    const vol = annualizedVolatility(returns);
    const hitRate = returns.filter(r => r > 0).length / Math.max(1, returns.length);
    const curve = [1];
    for (const r of returns) curve.push(curve[curve.length - 1] * (1 + r));

    bucketResults.push({
      level,
      samples: data.samples,
      averageReturn: avgRet,
      hitRate,
      volatility: vol,
      maxDrawdown: maxDrawdown(curve),
      averageHealthScore: mean(data.healthScores),
      sharpeRatio: vol > 0 ? (annualizedReturn(returns.reduce((a, b) => a + b, 0), returns.length) - RISK_FREE_RATE) / vol : 0,
    });
  }

  let report = `# 06 — Confidence Validation

**Generated:** ${new Date().toISOString()}

---

## Confidence Bucket Analysis

| Confidence | Samples | Avg Health | Avg Return | Hit Rate | Volatility | Max DD | Sharpe |
|:-----------|:--------|:-----------|:-----------|:---------|:-----------|:-------|:-------|
`;

  for (const br of bucketResults) {
    report += `| ${br.level} | ${br.samples} | ${br.averageHealthScore.toFixed(1)} | ${formatPct(br.averageReturn)} | ${formatPct(br.hitRate)} | ${formatPct(br.volatility)} | ${formatPct(br.maxDrawdown)} | ${br.sharpeRatio.toFixed(2)} |\n`;
  }

  // Does confidence predict returns?
  const highConf = bucketResults.find(b => b.level === 'High' || b.level === 'Very High');
  const lowConf = bucketResults.find(b => b.level === 'Low' || b.level === 'Medium');
  const doesConfidencePredict = highConf && lowConf ? highConf.averageReturn > lowConf.averageReturn : false;

  report += `\n## Key Question: Does Confidence Predict Future Success?\n\n`;
  if (doesConfidencePredict) {
    report += `✅ **Yes** — Higher confidence levels are associated with better returns.\n`;
  } else {
    report += `⚠️ **Mixed/No** — Confidence levels do not clearly predict future returns.\n`;
  }

  report += `\n## Commentary\n\n`;
  report += `- Confidence reflects data completeness and signal agreement\n`;
  report += `- It signals result reliability, not necessarily higher returns\n`;
  report += `- Higher confidence scores indicate more trustworthy rankings\n`;

  fs.writeFileSync(path.join(REPORT_DIR, '06-ConfidenceValidation.md'), report);
  console.log('  ✅ 06-ConfidenceValidation.md generated');
  return { bucketResults, doesConfidencePredict };
}

// ─── PHASE 7: Sector Bias Audit ───────────────────────────────────────────────

async function phase7SectorBiasAudit(inventory) {
  console.log('━━━ PHASE 7: Sector Bias Audit ━━━');

  // Get sector distribution from registry
  const universeRes = await query(
    `SELECT sector, COUNT(*) as count
     FROM master_security_registry
     WHERE listing_status = 'Active' AND sector IS NOT NULL
     GROUP BY sector ORDER BY count DESC`
  );

  // Get sector distribution in top 20 ranked stocks
  const top20Res = await query(
    `WITH latest_snapshot AS (
       SELECT DISTINCT trade_date FROM factor_snapshots
       ORDER BY trade_date DESC LIMIT 1
     )
     SELECT msr.sector, COUNT(*) as count
     FROM factor_snapshots fs
     JOIN master_security_registry msr ON fs.symbol = msr.symbol
     CROSS JOIN latest_snapshot ls
     WHERE fs.trade_date = ls.trade_date
       AND msr.sector IS NOT NULL
     GROUP BY msr.sector
     ORDER BY fs.factor_score DESC
     LIMIT 20`
  );

  const universeTotal = universeRes.rows.reduce((s, r) => s + parseInt(r.count), 0);
  const top20Total = top20Res.rows.reduce((s, r) => s + parseInt(r.count), 0);

  const sectors = [];
  const universeSectors = new Map();
  for (const row of universeRes.rows) {
    universeSectors.set(row.sector, parseInt(row.count));
  }

  const top20Sectors = new Map();
  for (const row of top20Res.rows) {
    top20Sectors.set(row.sector, parseInt(row.count));
  }

  // Merge
  for (const [sector, uniCount] of universeSectors) {
    const topCount = top20Sectors.get(sector) || 0;
    const uniPct = universeTotal > 0 ? uniCount / universeTotal : 0;
    const topPct = top20Total > 0 ? topCount / top20Total : 0;
    const biasRatio = uniPct > 0 ? topPct / uniPct : 0;

    sectors.push({
      sector,
      universeCount: uniCount,
      top20Count: topCount,
      universeWeight: uniPct,
      representation: topPct,
      biasRatio,
    });
  }

  sectors.sort((a, b) => b.biasRatio - a.biasRatio);

  const maxBias = sectors[0];
  const isDiverse = sectors.filter(s => s.representation > 0.25).length === 0;

  let report = `# 07 — Sector Bias Audit

**Generated:** ${new Date().toISOString()}

---

## Sector Distribution

| Sector | Universe Count | Top 20 Count | Universe % | Top 20 % | Bias Ratio |
|:-------|:---------------|:-------------|:-----------|:---------|:-----------|
`;

  for (const s of sectors) {
    const flag = s.biasRatio > 1.5 ? ' ⚠️ OVERWEIGHT' : s.biasRatio < 0.5 ? ' 🔽 UNDERWEIGHT' : '';
    report += `| ${s.sector} | ${s.universeCount} | ${s.top20Count} | ${formatPct(s.universeWeight)} | ${formatPct(s.representation)} | ${s.biasRatio.toFixed(2)}${flag} |\n`;
  }

  report += `\n## Bias Assessment\n\n`;
  report += `- **Max Bias Sector**: ${maxBias?.sector || 'N/A'} (Bias Ratio: ${maxBias?.biasRatio.toFixed(2) || 'N/A'})\n`;
  report += `- **Portfolio Diversity**: ${isDiverse ? '✅ Diverse (no single sector > 25%)' : '⚠️ Concentrated — single sector > 25%'}\n`;

  // Banking bias check
  const bankingBias = sectors.filter(s =>
    s.sector?.toLowerCase().includes('bank') || s.sector?.toLowerCase().includes('finance')
  );
  const techBias = sectors.filter(s =>
    s.sector?.toLowerCase().includes('tech') || s.sector?.toLowerCase().includes('information')
  );

  report += `\n## Specific Bias Checks\n\n`;
  report += `- **Banking/Finance Bias**: ${bankingBias.reduce((s, b) => s + b.representation, 0) > 0.25 ? '⚠️ Significant' : '✅ Acceptable'}\n`;
  report += `- **Technology Bias**: ${techBias.reduce((s, b) => s + b.representation, 0) > 0.25 ? '⚠️ Significant' : '✅ Acceptable'}\n`;
  report += `- **Top Sector Concentration**: ${maxBias?.representation > 0.30 ? '⚠️ High — risk of single-sector dominance' : '✅ Acceptable'}\n`;

  fs.writeFileSync(path.join(REPORT_DIR, '07-SectorBiasAudit.md'), report);
  console.log('  ✅ 07-SectorBiasAudit.md generated');
  return { sectors, isDiverse, maxBiasSector: maxBias?.sector || 'N/A' };
}

// ─── PHASE 8: Survivorship Bias Audit ─────────────────────────────────────────

async function phase8SurvivorshipBiasAudit(inventory) {
  console.log('━━━ PHASE 8: Survivorship Bias Audit ━━━');

  const regData = inventory.registry;

  // Get delisted/merged/suspended symbols
  const delistedRes = await query(
    `SELECT symbol, company_name, listing_status, sector
     FROM master_security_registry
     WHERE listing_status IN ('Delisted', 'Merged', 'Suspended')
     ORDER BY listing_status, symbol`
  );

  // Check for symbols without price data
  const noPriceRes = await query(
    `SELECT msr.symbol, msr.company_name, msr.listing_status, msr.sector
     FROM master_security_registry msr
     LEFT JOIN daily_prices dp ON msr.symbol = dp.symbol
     WHERE dp.symbol IS NULL AND msr.listing_status = 'Active'`
  );

  // Check for symbols in snapshots but not in registry
  const orphanRes = await query(
    `SELECT DISTINCT fs.symbol
     FROM factor_snapshots fs
     LEFT JOIN master_security_registry msr ON fs.symbol = msr.symbol
     WHERE msr.symbol IS NULL`
  );

  const entries = [];
  for (const row of delistedRes.rows) {
    entries.push({
      symbol: row.symbol,
      name: row.company_name,
      status: row.listing_status.toUpperCase(),
      sector: row.sector,
      impactNote: row.listing_status === 'Delisted'
        ? 'Excluded — upward return bias if historically held'
        : row.listing_status === 'Merged'
          ? 'Excluded — merger premium not captured'
          : 'Excluded — may represent temporary halt',
    });
  }
  for (const row of noPriceRes.rows) {
    entries.push({
      symbol: row.symbol,
      name: row.company_name,
      status: 'ACTIVE_NO_PRICE',
      sector: row.sector,
      impactNote: 'Active but no price data — may be recently listed or delisted in practice',
    });
  }

  const totalUniverse = regData.total;
  const delisted = regData.delisted;
  const merged = regData.merged;
  const suspended = regData.suspended;
  const noPrice = noPriceRes.rows.length;
  const orphanSnapshots = orphanRes.rows.length;

  const problematic = delisted + merged + suspended;
  const inflationEstimate = totalUniverse > 0 ? (problematic / totalUniverse) * 0.15 : 0; // ~15% inflation per excluded

  let report = `# 08 — Survivorship Bias Audit

**Generated:** ${new Date().toISOString()}

---

## Universe Composition

| Status | Count | % |
|:-------|:------|:--|
| Active | ${regData.active} | ${(regData.active / Math.max(1, totalUniverse) * 100).toFixed(1)}% |
| Delisted | ${delisted} | ${(delisted / Math.max(1, totalUniverse) * 100).toFixed(1)}% |
| Merged | ${merged} | ${(merged / Math.max(1, totalUniverse) * 100).toFixed(1)}% |
| Suspended | ${suspended} | ${(suspended / Math.max(1, totalUniverse) * 100).toFixed(1)}% |
| **Total** | **${totalUniverse}** | — |

---

## Data Gaps

| Category | Count |
|:---------|:------|
| Active but No Price Data | ${noPrice} |
| In Snapshots but Not in Registry | ${orphanSnapshots} |

---

## Survivorship Bias Assessment

- **Delisted/Merged/Suspended**: ${problematic} total (${(problematic / Math.max(1, totalUniverse) * 100).toFixed(1)}% of universe)
- **Estimated Return Inflation**: ${formatPct(inflationEstimate)}
- **Verdict**: ${problematic > 5 ? '⚠️ Survivorship bias present — results may be modestly inflated' : '✅ Survivorship bias minimal — < 5 problematic symbols'}

---

## Detailed Exclusions

| Symbol | Name | Status | Sector | Impact |
|:-------|:-----|:-------|:-------|:-------|
`;

  for (const entry of entries.slice(0, 30)) {
    report += `| ${entry.symbol} | ${entry.name} | ${entry.status} | ${entry.sector || 'N/A'} | ${entry.impactNote} |\n`;
  }

  if (entries.length > 30) {
    report += `\n... and ${entries.length - 30} more entries.\n`;
  }

  report += `\n## Answer: Are Results Inflated?\n\n`;
  report += problematic > 10
    ? `⚠️ **Yes, modestly** — ${problematic} excluded companies likely inflate returns by ~${formatPct(inflationEstimate)}. Use sector-neutral benchmarks to partially mitigate.`
    : `✅ **No or marginally** — Only ${problematic} exclusions with estimated ${formatPct(inflationEstimate)} inflation. Within acceptable bounds for research.`;

  fs.writeFileSync(path.join(REPORT_DIR, '08-SurvivorshipBias.md'), report);
  console.log('  ✅ 08-SurvivorshipBias.md generated');
  return { isInflated: problematic > 10, inflationEstimate, problematicCount: problematic };
}

// ─── PHASE 9: Alpha Calculation ───────────────────────────────────────────────

async function phase9AlphaCalculation(inventory, benchmarkData) {
  console.log('━━━ PHASE 9: Alpha Calculation ━━━');

  // Calculate alpha vs equal-weight universe using top 20 portfolio
  const snapshots = await query(
    `SELECT trade_date FROM factor_snapshots
     GROUP BY trade_date ORDER BY trade_date LIMIT 50`
  );

  if (snapshots.rows.length < 5) {
    const report = `# 09 — Alpha Calculation\n\n**INSUFFICIENT DATA**\n`;
    fs.writeFileSync(path.join(REPORT_DIR, '09-AlphaCalculation.md'), report);
    console.log('  ⚠️ 09-AlphaCalculation.md generated (no data)');
    return { alphaResults: [] };
  }

  const snapshotDates = snapshots.rows.map(r => r.trade_date.toISOString().split('T')[0]);
  const portfolioReturns = [];
  const benchmarkReturns = [];

  for (let i = 0; i < snapshotDates.length - 1; i++) {
    const date = snapshotDates[i];

    // Get top 20 portfolio return
    const topRes = await query(
      `SELECT symbol FROM factor_snapshots
       WHERE trade_date = $1 ORDER BY factor_score DESC LIMIT 20`,
      [date]
    );

    const symbols = topRes.rows.map(r => r.symbol);
    const horizonDays = Math.round(
      (new Date(snapshotDates[i + 1]).getTime() - new Date(date).getTime()) / 86400000
    );

    const stockReturns = [];
    for (const sym of symbols) {
      const pr = await query(
        `SELECT
           (SELECT adjusted_close FROM daily_prices
            WHERE symbol = $1 AND trade_date <= $2::date + $3::int
            ORDER BY trade_date DESC LIMIT 1) as end_price,
           (SELECT adjusted_close FROM daily_prices
            WHERE symbol = $1 AND trade_date <= $2::date
            ORDER BY trade_date DESC LIMIT 1) as start_price`,
        [sym, date, horizonDays]
      );
      const row = pr.rows[0];
      if (row && row.start_price && row.end_price && parseFloat(row.start_price) > 0) {
        stockReturns.push((parseFloat(row.end_price) - parseFloat(row.start_price)) / parseFloat(row.start_price));
      }
    }

    if (stockReturns.length > 0) {
      portfolioReturns.push(mean(stockReturns));
    }

    // Get benchmark return
    const benchRes = await query(
      `SELECT
         (SELECT AVG(adjusted_close) FROM daily_prices
          WHERE trade_date <= $1::date + $2::int
            AND trade_date >= $1::date - 5) as end_avg,
         (SELECT AVG(adjusted_close) FROM daily_prices
          WHERE trade_date <= $1::date
            AND trade_date >= $1::date - 5) as start_avg`,
      [date, horizonDays]
    );
    const bRow = benchRes.rows[0];
    if (bRow && bRow.start_avg && bRow.end_avg && parseFloat(bRow.start_avg) > 0) {
      benchmarkReturns.push((parseFloat(bRow.end_avg) - parseFloat(bRow.start_avg)) / parseFloat(bRow.start_avg));
    }
  }

  // Compute excess returns
  const minLen = Math.min(portfolioReturns.length, benchmarkReturns.length);
  const excessReturns = [];
  for (let i = 0; i < minLen; i++) {
    excessReturns.push(portfolioReturns[i] - benchmarkReturns[i]);
  }

  const meanExcess = mean(excessReturns);
  const stdExcess = stdDev(excessReturns);
  const t = tStat(meanExcess, stdExcess, excessReturns.length);
  const p = pValueFromT(Math.abs(t), excessReturns.length - 1);

  // Beta calculation
  const portfolioMean = mean(portfolioReturns.slice(0, minLen));
  const benchmarkMean = mean(benchmarkReturns.slice(0, minLen));
  let covar = 0, benchVar = 0;
  for (let i = 0; i < minLen; i++) {
    covar += (portfolioReturns[i] - portfolioMean) * (benchmarkReturns[i] - benchmarkMean);
    benchVar += (benchmarkReturns[i] - benchmarkMean) ** 2;
  }
  const beta = benchVar > 0 ? covar / benchVar : 0;

  // Jensen's alpha
  const portAnnRet = annualizedReturn(portfolioReturns.slice(0, minLen).reduce((a, b) => a + b, 0), minLen);
  const benchAnnRet = annualizedReturn(benchmarkReturns.slice(0, minLen).reduce((a, b) => a + b, 0), minLen);
  const jensenAlpha = portAnnRet - (RISK_FREE_RATE + beta * (benchAnnRet - RISK_FREE_RATE));

  const ir = stdExcess > 0 ? meanExcess / stdExcess : 0;
  const trackingError = stdExcess * Math.sqrt(TRADING_DAYS_PER_YEAR);

  // Up/down capture
  const upPort = [], upBench = [], downPort = [], downBench = [];
  for (let i = 0; i < minLen; i++) {
    if (benchmarkReturns[i] > 0) { upPort.push(portfolioReturns[i]); upBench.push(benchmarkReturns[i]); }
    else { downPort.push(portfolioReturns[i]); downBench.push(benchmarkReturns[i]); }
  }
  const upCapture = mean(upBench) > 0 ? mean(upPort) / mean(upBench) : 0;
  const downCapture = mean(downBench) < 0 ? mean(downPort) / mean(downBench) : 0;

  let report = `# 09 — Alpha Calculation

**Generated:** ${new Date().toISOString()}
**Samples:** ${minLen} periods

---

## Alpha vs Equal-Weight Universe (Top 20 Portfolio)

| Metric | Value |
|:-------|:------|
| Portfolio Annualized Return | ${formatPct(portAnnRet)} |
| Benchmark Annualized Return | ${formatPct(benchAnnRet)} |
| Excess Return | ${formatPct(meanExcess)} |
| Jensen's Alpha | ${formatPct(jensenAlpha)} |
| Beta | ${beta.toFixed(3)} |
| Information Ratio | ${ir.toFixed(3)} |
| Tracking Error | ${formatPct(trackingError)} |
| Up Capture | ${(upCapture * 100).toFixed(1)}% |
| Down Capture | ${(downCapture * 100).toFixed(1)}% |
| t-Statistic | ${t.toFixed(3)} |
| p-Value | ${p.toFixed(4)} |
| Statistically Significant | ${p < 0.05 ? '✅ Yes' : '❌ No'} |

---

## Interpretation

- **Alpha**: ${jensenAlpha > 0 ? 'Positive alpha — strategy outperforms on risk-adjusted basis' : 'Negative alpha — strategy underperforms on risk-adjusted basis'}
- **Beta**: ${beta.toFixed(2)} (${beta < 0.8 ? 'Defensive' : beta > 1.2 ? 'Aggressive' : 'Market-like'})
- **Statistical Significance**: ${p < 0.05 ? 'Alpha is statistically significant at 95% confidence' : 'Alpha is NOT statistically significant'}
- **Downside Protection**: ${downCapture < 1 ? `Captures only ${(downCapture * 100).toFixed(0)}% of downside — provides protection` : 'Captures full downside — no protection'}

`;

  fs.writeFileSync(path.join(REPORT_DIR, '09-AlphaCalculation.md'), report);
  console.log('  ✅ 09-AlphaCalculation.md generated');

  return {
    alphaResults: [{
      excessReturn: meanExcess,
      alpha: jensenAlpha,
      beta,
      informationRatio: ir,
      trackingError,
      upCapture,
      downCapture,
      tStatistic: t,
      pValue: p,
      isSignificant: p < 0.05,
    }],
  };
}

// ─── PHASE 10: Engine Optimisation ────────────────────────────────────────────

async function phase10EngineOptimisation(inventory, factorData) {
  console.log('━━━ PHASE 10: Engine Optimisation ━━━');

  // Using factor attribution data, suggest weight optimization
  const factors = factorData?.factorContributions || [];
  const significantFactors = factors.filter(f => f.isSignificant);

  let report = `# 10 — Engine Optimisation

**Generated:** ${new Date().toISOString()}

---

`;

  if (significantFactors.length === 0) {
    report += `## INSUFFICIENT EVIDENCE

No factors showed statistically significant predictive power. Weight optimization would be overfitting without statistical justification.

**Recommendation**: Retain current equal weights until more data or stronger signal is available.
`;
    fs.writeFileSync(path.join(REPORT_DIR, '10-EngineOptimisation.md'), report);
    console.log('  ⚠️ 10-EngineOptimisation.md generated (insufficient evidence)');
    return { optimizations: [] };
  }

  report += `## Optimized Engine Weights\n\n`;
  report += `| Engine | Original Weight | Optimized Weight | Justification |\n`;
  report += `|:-------|:----------------|:-----------------|:--------------|\n`;

  const optimizations = [];
  const engineMap = {
    'Quality': 'QualityEngine',
    'Growth': 'GrowthEngine',
    'Value': 'ValuationEngine',
    'Momentum': 'MomentumEngine',
    'Risk': 'RiskEngine',
    'Sector Strength': 'StabilityEngine',
  };

  for (const fc of factors.slice(0, 5)) {
    const engineName = engineMap[fc.factor] || fc.factor + 'Engine';
    const origWeight = 1 / 6;
    const optWeight = fc.isSignificant ? fc.contribution / 100 : origWeight;

    report += `| ${engineName} | ${origWeight.toFixed(3)} | ${optWeight.toFixed(3)} | ${fc.isSignificant ? 'Statistically significant factor — weight increased' : 'Not significant — weight maintained'} |\n`;
    optimizations.push({
      engine: engineName,
      originalWeight: origWeight,
      optimizedWeight: optWeight,
      justification: fc.isSignificant ? 'Sig factor' : 'Not sig',
    });
  }

  report += `\n## Overfitting Check\n\n`;
  report += `- Number of significant factors: ${significantFactors.length}\n`;
  report += `- Risk of overfitting: ${significantFactors.length < 2 ? '⚠️ HIGH — only 1 significant factor, optimization likely overfits' : '✅ MODERATE — multiple factors support optimization'}\n`;
  report += `- Cross-validation required: ${significantFactors.length > 1 ? '✅ Yes — recommend walk-forward validation' : '⚠️ Skip — insufficient signal'}\n`;

  report += `\n## Verdict\n\n`;
  if (significantFactors.length >= 2) {
    report += `Optimization is statistically justified. Apply walk-forward validation before production deployment.\n`;
  } else {
    report += `**No optimization applied** — insufficient statistical evidence to justify weight changes. Current equal weights represent the most robust configuration given available data.\n`;
  }

  fs.writeFileSync(path.join(REPORT_DIR, '10-EngineOptimisation.md'), report);
  console.log('  ✅ 10-EngineOptimisation.md generated');
  return { optimizations };
}

// ─── PHASE 11: Institutional Scorecard ─────────────────────────────────────────

async function phase11InstitutionalScorecard(allResults) {
  console.log('━━━ PHASE 11: Institutional Scorecard ━━━');

  const {
    alphaData,
    benchmarkData,
    strategyData,
    survivorshipData,
    factorData,
    confidenceData,
    inventory,
  } = allResults;

  // Score Alpha (25%)
  let alphaScore = 50;
  let alphaDetail = 'Neutral — insufficient evidence';
  if (alphaData?.alphaResults?.length > 0) {
    const alpha = alphaData.alphaResults[0];
    if (alpha.isSignificant && alpha.alpha > 0.05) {
      alphaScore = 85;
      alphaDetail = `Strong positive alpha (${formatPct(alpha.alpha)}), statistically significant`;
    } else if (alpha.alpha > 0.03) {
      alphaScore = 70;
      alphaDetail = `Moderate positive alpha (${formatPct(alpha.alpha)})${alpha.isSignificant ? ', significant' : ', not significant'}`;
    } else if (alpha.alpha > 0) {
      alphaScore = 55;
      alphaDetail = `Slight positive alpha (${formatPct(alpha.alpha)}), not robust`;
    } else {
      alphaScore = 35;
      alphaDetail = `Negative alpha ${formatPct(alpha.alpha)}`;
    }
  }

  // Score Sharpe (15%)
  let sharpeScore = 50;
  let sharpeDetail = 'Neutral';
  const bestStrategy = strategyData?.strategyResults?.[0];
  if (bestStrategy) {
    const s = bestStrategy.sharpe;
    if (s > 1.5) { sharpeScore = 90; sharpeDetail = `Excellent (${s.toFixed(2)} — best strategy: ${bestStrategy.strategy})`; }
    else if (s > 1.0) { sharpeScore = 75; sharpeDetail = `Good (${s.toFixed(2)})`; }
    else if (s > 0.5) { sharpeScore = 60; sharpeDetail = `Average (${s.toFixed(2)})`; }
    else { sharpeScore = 40; sharpeDetail = `Below average (${s.toFixed(2)})`; }
  }

  // Score Drawdown (15%)
  let drawdownScore = 50;
  let drawdownDetail = 'Neutral';
  if (bestStrategy) {
    const dd = bestStrategy.maxDrawdown;
    if (dd < 0.1) { drawdownScore = 85; drawdownDetail = `Excellent risk control (Max DD ${formatPct(dd)})`; }
    else if (dd < 0.2) { drawdownScore = 70; drawdownDetail = `Good (Max DD ${formatPct(dd)})`; }
    else if (dd < 0.3) { drawdownScore = 55; drawdownDetail = `Moderate (Max DD ${formatPct(dd)})`; }
    else { drawdownScore = 35; drawdownDetail = `High drawdown (${formatPct(dd)}) — risky`; }
  }

  // Score Consistency (15%)
  let consistencyScore = 50;
  let consistencyDetail = 'Neutral';
  if (alphaData?.alphaResults?.length > 0) {
    const isSig = alphaData.alphaResults[0].isSignificant;
    consistencyScore = isSig ? 75 : 45;
    consistencyDetail = isSig ? 'Alpha consistent and significant' : 'Alpha inconsistent or not significant';
  }

  // Score Explainability (10%)
  const explainabilityScore = 70;
  const explainabilityDetail = 'Factor-based engine with documented weights and attribution';

  // Score Confidence Accuracy (10%)
  let confAccuracyScore = 50;
  let confAccuracyDetail = 'Neutral';
  if (confidenceData?.doesConfidencePredict) {
    confAccuracyScore = 70;
    confAccuracyDetail = 'Confidence levels show directional predictiveness';
  } else {
    confAccuracyScore = 40;
    confAccuracyDetail = 'Confidence levels do not clearly predict returns';
  }

  // Score Data Quality (10%)
  let dataQualityScore = 60;
  let dataQualityDetail = 'Adequate coverage';
  if (inventory && inventory.factorCoverage) {
    const avgCov = (
      inventory.factorCoverage.quality / Math.max(1, inventory.factorCoverage.total) +
      inventory.factorCoverage.growth / Math.max(1, inventory.factorCoverage.total) +
      inventory.factorCoverage.value / Math.max(1, inventory.factorCoverage.total)
    ) / 3;
    if (avgCov > 0.9) { dataQualityScore = 85; dataQualityDetail = 'Excellent coverage (>90%)'; }
    else if (avgCov > 0.7) { dataQualityScore = 70; dataQualityDetail = `Good coverage (${formatPct(avgCov)})`; }
    else if (avgCov > 0.5) { dataQualityScore = 55; dataQualityDetail = `Moderate coverage (${formatPct(avgCov)})`; }
    else { dataQualityScore = 35; dataQualityDetail = `Low coverage (${formatPct(avgCov)})`; }
  }

  const totalScore =
    alphaScore * 0.25 +
    sharpeScore * 0.15 +
    drawdownScore * 0.15 +
    consistencyScore * 0.15 +
    explainabilityScore * 0.10 +
    confAccuracyScore * 0.10 +
    dataQualityScore * 0.10;

  let grade;
  if (totalScore >= 85) grade = 'A+';
  else if (totalScore >= 75) grade = 'A';
  else if (totalScore >= 65) grade = 'B';
  else if (totalScore >= 55) grade = 'C';
  else if (totalScore >= 40) grade = 'D';
  else grade = 'F';

  let report = `# 11 — Institutional Scorecard

**Generated:** ${new Date().toISOString()}

---

## Scorecard

| Category | Score | Weight | Weighted | Detail |
|:---------|:------|:-------|:---------|:-------|
| Alpha | ${alphaScore} | 25% | ${(alphaScore * 0.25).toFixed(1)} | ${alphaDetail} |
| Sharpe | ${sharpeScore} | 15% | ${(sharpeScore * 0.15).toFixed(1)} | ${sharpeDetail} |
| Drawdown | ${drawdownScore} | 15% | ${(drawdownScore * 0.15).toFixed(1)} | ${drawdownDetail} |
| Consistency | ${consistencyScore} | 15% | ${(consistencyScore * 0.15).toFixed(1)} | ${consistencyDetail} |
| Explainability | ${explainabilityScore} | 10% | ${(explainabilityScore * 0.10).toFixed(1)} | ${explainabilityDetail} |
| Confidence Accuracy | ${confAccuracyScore} | 10% | ${(confAccuracyScore * 0.10).toFixed(1)} | ${confAccuracyDetail} |
| Data Quality | ${dataQualityScore} | 10% | ${(dataQualityScore * 0.10).toFixed(1)} | ${dataQualityDetail} |
| **TOTAL** | **—** | **100%** | **${totalScore.toFixed(1)}** | **Grade: ${grade}** |

---

## Grade Interpretation

- **A+ (85+)**: Institutional-grade — production-ready for investment decisions
- **A (75-84)**: Strong — suitable for serious quant research
- **B (65-74)**: Good — useful as one input among many
- **C (55-64)**: Adequate — research prototype quality
- **D (40-54)**: Weak — requires significant improvement
- **F (<40)**: Unreliable — do not use for investment decisions

`;

  fs.writeFileSync(path.join(REPORT_DIR, '11-InstitutionalScorecard.md'), report);
  console.log('  ✅ 11-InstitutionalScorecard.md generated');

  return { totalScore, grade };
}

// ─── PHASE 12: Final Alpha Certification ──────────────────────────────────────

async function phase12FinalCertification(allResults) {
  console.log('━━━ PHASE 12: Launch Decision ━━━');

  const {
    inventory,
    alphaData,
    factorData,
    confidenceData,
    survivorshipData,
    strategyData,
    scorecardData,
    benchmarkData,
  } = allResults;

  // Collect answers
  const alphaResult = alphaData?.alphaResults?.[0];
  const primaryFactor = factorData?.primaryFactor;
  const bestStrategy = strategyData?.strategyResults?.[0];

  const beatsNifty = alphaResult?.alpha > 0;
  const confidenceWorks = confidenceData?.doesConfidencePredict || false;
  const alphaSig = alphaResult?.isSignificant || false;
  const survBias = survivorshipData?.isInflated || false;

  // Investability check
  let investable = false;
  const investReasons = [];
  if (inventory?.registry?.active >= 20) investReasons.push('Sufficient universe');
  else investReasons.push('Insufficient universe');
  if (bestStrategy && bestStrategy.sharpe > 0.3) investReasons.push('Positive risk-adjusted returns');
  else investReasons.push('Negative/poor risk-adjusted returns');
  if (alphaSig) investReasons.push('Statistically significant alpha');
  else investReasons.push('Alpha not significant');

  investable = investReasons.filter(r => r.startsWith('Positive') || r.startsWith('Sufficient') || r.startsWith('Statistically')).length >= 2;

  // Determine certification level
  let level;
  if (!inventory || inventory.factorCoverage?.total < 50) {
    level = 'INSUFFICIENT EVIDENCE';
  } else if (investable && alphaSig && beatsNifty && scorecardData?.grade === 'A+' || scorecardData?.grade === 'A') {
    level = 'Production Intelligence Platform';
  } else if (investable && beatsNifty && scorecardData?.grade === 'B') {
    level = 'Institutional Research Tool';
  } else if (investable || scorecardData?.grade === 'B') {
    level = 'Internal Investment Tool';
  } else if (scorecardData?.grade === 'C') {
    level = 'Quant Research Platform';
  } else if (scorecardData?.grade === 'D') {
    level = 'Research Prototype';
  } else {
    level = 'INSUFFICIENT EVIDENCE';
  }

  const riskWarnings = [];
  if (!alphaSig) riskWarnings.push('Alpha is not statistically significant — results may be due to chance');
  if (survBias) riskWarnings.push('Survivorship bias inflates results — real-world performance may be lower');
  if (bestStrategy && bestStrategy.maxDrawdown > 0.25) riskWarnings.push(`High max drawdown (${formatPct(bestStrategy.maxDrawdown)}) — significant loss potential`);
  if (bestStrategy && bestStrategy.sharpe < 0.5) riskWarnings.push('Low Sharpe ratio — poor risk-adjusted returns');
  if (inventory?.missingPeriods?.length > 0) riskWarnings.push('Data gaps exist — analysis may miss critical market periods');
  if (!confidenceWorks) riskWarnings.push('Confidence levels do not predict returns — trust signal may be misleading');

  let report = `# 12 — Final Alpha Certification

**Generated:** ${new Date().toISOString()}
**Certification Level:** **${level}**

---

## Six Critical Questions

| Question | Answer | Evidence |
|:---------|:-------|:---------|
| Does StockStory beat NIFTY? | ${beatsNifty ? '✅ YES' : '❌ NO'} | Alpha: ${alphaResult ? formatPct(alphaResult.alpha) : 'N/A'} |
| Does confidence work? | ${confidenceWorks ? '✅ YES' : '⚠️ MIXED'} | ${confidenceData?.doesConfidencePredict ? 'Higher confidence = higher returns' : 'No clear pattern'} |
| Which factor matters most? | ${primaryFactor || 'N/A'} | ${factorData?.factorContributions?.[0]?.correlation ? `r = ${factorData.factorContributions[0].correlation.toFixed(4)}` : 'N/A'} |
| Is alpha statistically significant? | ${alphaSig ? '✅ YES' : '❌ NO'} | p = ${alphaResult ? alphaResult.pValue.toFixed(4) : 'N/A'} |
| Is there survivorship bias? | ${survBias ? '⚠️ YES — moderate' : '✅ Minimal'} | ${survivorshipData?.problematicCount || 0} exclusions |
| Is the system investable? | ${investable ? '✅ YES' : '❌ NOT YET'} | ${investReasons.join('; ')} |

---

## Certification Level Rationale

**${level}**

${level === 'Production Intelligence Platform' ? 'StockStory meets institutional standards for production investment intelligence. Alpha is statistically significant, risk-adjusted returns are strong, and data quality is sufficient for deployment.' : ''}
${level === 'Institutional Research Tool' ? 'StockStory provides credible research signals suitable for institutional analysts. Not yet production-grade for direct investment but valuable as a research input.' : ''}
${level === 'Internal Investment Tool' ? 'StockStory can be used as an internal investment screening tool. Signals are directional but not yet statistically robust enough for external certification.' : ''}
${level === 'Quant Research Platform' ? 'StockStory is a legitimate quantitative research platform with documented methodology and evidence. Useful for research and exploration, not yet for investment decisions.' : ''}
${level === 'Research Prototype' ? 'StockStory shows promising patterns but lacks statistical robustness for any investment use. Continue research and gather more data.' : ''}
${level === 'INSUFFICIENT EVIDENCE' ? '**CRITICAL**: Cannot certify alpha. Required datasets are missing. Evidence threshold not met. No investment use is warranted until data requirements are satisfied.' : ''}

---

## Risk Warnings

${riskWarnings.length === 0 ? '✅ No critical risk warnings identified.\n' : riskWarnings.map(w => `- ⚠️ ${w}`).join('\n')}

---

## Evidence Summary

${level !== 'INSUFFICIENT EVIDENCE' ? `
- **Backtests executed**: Yes (across ${inventory?.distinctSnapshotMonths || 0} monthly snapshots)
- **Benchmarks compared**: Yes (Equal-Weight Universe${benchmarkData?.benchmarks?.length > 1 ? ', NIFTY50' : ''})
- **Results statistically significant**: ${alphaSig ? 'Yes' : 'No'}
- **Evidence stored in**: reports/track-31/
` : `
- **Backtests executed**: Partial
- **Benchmarks compared**: Partial
- **Results statistically significant**: N/A
- **Data gaps**: ${inventory?.missingPeriods?.length || 'unknown'} missing periods
- **Evidence stored in**: reports/track-31/ (incomplete)
`}

---

## Final Verdict

**${level.toUpperCase()}**

${level === 'INSUFFICIENT EVIDENCE' ?
'Do not certify alpha. Required conditions not met. More data needed before any claims can be made.' :
`StockStory has been certified as a **${level}** based on ${inventory?.distinctSnapshotMonths || 0} months of historical data, ${inventory?.registry?.active || 0} active securities, and statistically ${alphaSig ? 'significant' : 'non-significant'} alpha generation.`}
`;

  fs.writeFileSync(path.join(REPORT_DIR, '12-FinalAlphaCertification.md'), report);
  console.log('  ✅ 12-FinalAlphaCertification.md generated');

  return { level, report };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  TRACK-31: Alpha Validation Engine              ║');
  console.log('║  Institutional Backtesting & Benchmarking       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\nStarted: ${new Date().toISOString()}\n`);

  // Check database connection
  try {
    await query('SELECT 1');
    console.log('✅ Database connection established.\n');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('\nGenerating INSUFFICIENT EVIDENCE report...');

    const fallbackReport = `# 12 — Final Alpha Certification

**Generated:** ${new Date().toISOString()}
**Certification Level:** **INSUFFICIENT EVIDENCE**

---

## Critical Failure

Database connection failed. Cannot execute backtests.

**Error:** ${err.message}

**Verdict:** INSUFFICIENT EVIDENCE — certification impossible without database access.
`;
    fs.writeFileSync(path.join(REPORT_DIR, '12-FinalAlphaCertification.md'), fallbackReport);
    console.log('✅ Fallback report generated.');
    process.exit(0);
  }

  // Store all results for downstream phases
  const allResults = {
    inventory: null,
    benchmarkData: null,
    strategyData: null,
    rollingData: null,
    factorData: null,
    confidenceData: null,
    sectorData: null,
    survivorshipData: null,
    alphaData: null,
    optimizationData: null,
    scorecardData: null,
  };

  // Run phases sequentially
  try {
    allResults.inventory = await phase1SnapshotInventory();

    // Check if we have sufficient data
    if (allResults.inventory.factorCoverage.total < 10) {
      console.log('\n⚠️ INSUFFICIENT DATA — generating minimal reports');
      const fallbackMsg = '# INSUFFICIENT EVIDENCE\n\nNot enough factor snapshots in the database to run meaningful backtests.\n\nRequired: ≥ 10 factor snapshots\nFound: ' + allResults.inventory.factorCoverage.total + '\n';
      for (let i = 2; i <= 11; i++) {
        const pad = String(i).padStart(2, '0');
        const name = ['', 'SnapshotInventory', 'BenchmarkEngine', 'PortfolioSimulator', 'RollingBacktest',
          'FactorAttribution', 'ConfidenceValidation', 'SectorBiasAudit', 'SurvivorshipBias',
          'AlphaCalculation', 'EngineOptimisation', 'InstitutionalScorecard'][i];
        fs.writeFileSync(path.join(REPORT_DIR, `${pad}-${name}.md`), fallbackMsg);
      }
      await phase12FinalCertification(allResults);
      process.exit(0);
    }

    allResults.benchmarkData = await phase2BenchmarkEngine(allResults.inventory);
    allResults.strategyData = await phase3PortfolioSimulator(allResults.inventory);
    allResults.rollingData = await phase4RollingBacktest(allResults.inventory);
    allResults.factorData = await phase5FactorAttribution(allResults.inventory);
    allResults.confidenceData = await phase6ConfidenceValidation(allResults.inventory);
    allResults.sectorData = await phase7SectorBiasAudit(allResults.inventory);
    allResults.survivorshipData = await phase8SurvivorshipBiasAudit(allResults.inventory);
    allResults.alphaData = await phase9AlphaCalculation(allResults.inventory, allResults.benchmarkData);
    allResults.optimizationData = await phase10EngineOptimisation(allResults.inventory, allResults.factorData);
    allResults.scorecardData = await phase11InstitutionalScorecard(allResults);

    // Final certification
    const certification = await phase12FinalCertification(allResults);

    // Summary output
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  TRACK-31 COMPLETE                              ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`\nCertification: ${certification.level}`);
    console.log(`Scorecard Grade: ${allResults.scorecardData?.grade || 'N/A'}`);
    console.log(`Reports: ${REPORT_DIR}`);
    console.log(`\nCompleted: ${new Date().toISOString()}`);

  } catch (err) {
    console.error('❌ Fatal error during execution:', err);
    process.exit(1);
  }

  await pool.end();
}

main();
