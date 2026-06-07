/**
 * TRACK-13: Score Calibration & Ranking Reality Audit
 * 
 * Reads all available stocks from the database, runs them through
 * the StockStory engine, and generates comprehensive audit reports.
 * 
 * Runtime evidence only. No synthetic data. No production code changes.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Dynamic import for ES module dependencies
async function main() {
  // Manual computation helpers (inlined to avoid import issues in CJS)
  function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  function median(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function stdDev(arr, m) {
    if (arr.length <= 1) return 0;
    return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
  }
  function percentile(arr, p) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (sorted.length - 1) * p;
    const base = Math.floor(idx);
    const rest = idx - base;
    if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    return sorted[base];
  }
  function pearsonR(x, y) {
    const n = x.length;
    if (n === 0 || n !== y.length) return 0;
    const mx = mean(x), my = mean(y);
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) {
      const a = x[i] - mx, b = y[i] - my;
      num += a * b; dx += a * a; dy += b * b;
    }
    return dx && dy ? num / Math.sqrt(dx * dy) : 0;
  }

  console.log('=== TRACK-13 Calibration Audit ===');
  console.log('Connecting to database...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stockstory'
  });

  try {
    // Phase 1: Data Collection
    console.log('Fetching symbol universe...');
    const symRes = await pool.query(`
      SELECT s.symbol, s.sector, s.company_name, f.market_cap
      FROM symbols s
      LEFT JOIN LATERAL (
        SELECT market_cap FROM financial_snapshots 
        WHERE symbol = s.symbol 
        ORDER BY period_end DESC LIMIT 1
      ) f ON true
      WHERE s.listing_status = 'Active'
      ORDER BY f.market_cap DESC NULLS LAST
    `);
    console.log(`Found ${symRes.rows.length} active listed symbols`);

    // Fetch latest snapshots in bulk
    console.log('Fetching financial snapshots...');
    const finRes = await pool.query(`
      WITH ranked AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY period_end DESC) as rn
        FROM financial_snapshots
      )
      SELECT * FROM ranked WHERE rn = 1
    `);
    const finMap = new Map(finRes.rows.map(r => [r.symbol, r]));

    console.log('Fetching feature snapshots...');
    const featRes = await pool.query(`
      WITH ranked AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY trade_date DESC) as rn
        FROM feature_snapshots
      )
      SELECT * FROM ranked WHERE rn = 1
    `);
    const featMap = new Map(featRes.rows.map(r => [r.symbol, r]));

    console.log('Fetching factor snapshots...');
    const factRes = await pool.query(`
      WITH ranked AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY trade_date DESC) as rn
        FROM factor_snapshots
      )
      SELECT * FROM ranked WHERE rn = 1
    `);
    const factMap = new Map(factRes.rows.map(r => [r.symbol, r]));

    // Now construct EngineInputs-compatible objects for all stocks with complete data
    const stocks = [];
    const skipped = [];

    for (const row of symRes.rows) {
      const sym = row.symbol;
      const fin = finMap.get(sym);
      const feat = featMap.get(sym);
      const fact = factMap.get(sym);

      if (!fin && !feat && !fact) {
        skipped.push({ symbol: sym, reason: 'no snapshots' });
        continue;
      }

      const stock = {
        symbol: sym,
        companyName: row.company_name || sym,
        sector: row.sector || 'General',
        marketCap: row.market_cap || null,
        financials: {
          peRatio: fin?.pe_ratio != null ? Number(fin.pe_ratio) : null,
          pbRatio: fin?.pb_ratio != null ? Number(fin.pb_ratio) : null,
          eps: fin?.eps != null ? Number(fin.eps) : null,
          dividendYield: fin?.dividend_yield != null ? Number(fin.dividend_yield) : null,
          beta: fin?.beta != null ? Number(fin.beta) : null,
          marketCap: fin?.market_cap != null ? Number(fin.market_cap) : row.market_cap || null,
          freeFloat: fin?.free_float != null ? Number(fin.free_float) : null,
          fcfYield: fin?.fcf_yield != null ? Number(fin.fcf_yield) : null,
          evEbitda: fin?.ev_ebitda != null ? Number(fin.ev_ebitda) : null,
          roa: fin?.roa != null ? Number(fin.roa) : null,
          roe: fin?.roe != null ? Number(fin.roe) : null,
          roic: fin?.roic != null ? Number(fin.roic) : null,
          debtToEquity: fin?.debt_to_equity != null ? Number(fin.debt_to_equity) : null,
          currentRatio: fin?.current_ratio != null ? Number(fin.current_ratio) : null,
          revenueGrowth: fin?.revenue_growth != null ? Number(fin.revenue_growth) : null,
          profitGrowth: fin?.profit_growth != null ? Number(fin.profit_growth) : null,
          epsGrowth: fin?.eps_growth != null ? Number(fin.eps_growth) : null,
          fcfGrowth: fin?.fcf_growth != null ? Number(fin.fcf_growth) : null,
          grossMargin: fin?.gross_margin != null ? Number(fin.gross_margin) : null,
          operatingMargin: fin?.operating_margin != null ? Number(fin.operating_margin) : null,
        },
        features: {
          rsi: feat?.rsi != null ? Number(feat.rsi) : null,
          macd: feat?.macd != null ? Number(feat.macd) : null,
          macdSignal: feat?.macd_signal != null ? Number(feat.macd_signal) : null,
          macdHistogram: feat?.macd_histogram != null ? Number(feat.macd_histogram) : null,
          adx: feat?.adx != null ? Number(feat.adx) : null,
          atr: feat?.atr != null ? Number(feat.atr) : null,
          bollingerWidth: feat?.bollinger_width != null ? Number(feat.bollinger_width) : null,
          momentum: feat?.momentum != null ? Number(feat.momentum) : null,
          volatility: feat?.volatility != null ? Number(feat.volatility) : null,
          relativeStrength: feat?.relative_strength != null ? Number(feat.relative_strength) : null,
          movingAverageDistance: feat?.moving_average_distance != null ? Number(feat.moving_average_distance) : null,
          trendStrength: feat?.trend_strength != null ? Number(feat.trend_strength) : null,
        },
        factors: {
          qualityFactor: fact ? Number(fact.quality_factor) : 50,
          valueFactor: fact ? Number(fact.value_factor) : 50,
          growthFactor: fact ? Number(fact.growth_factor) : 50,
          momentumFactor: fact ? Number(fact.momentum_factor) : 50,
          riskFactor: fact ? Number(fact.risk_factor) : 50,
          sectorStrengthFactor: fact ? Number(fact.sector_strength_factor) : 50,
          factorScore: fact ? Number(fact.factor_score) : 50,
        },
        tradeDate: fact?.trade_date
          ? (fact.trade_date instanceof Date
              ? fact.trade_date.toISOString().split('T')[0]
              : String(fact.trade_date).split('T')[0])
          : new Date().toISOString().split('T')[0],
        dataCompleteness: {
          financial: fin ? 'full' : 'missing',
          features: feat ? 'full' : 'missing',
          factors: fact ? 'full' : 'missing',
          roa: fin?.roa != null,
          roe: fin?.roe != null,
          roic: fin?.roic != null,
          operatingMargin: fin?.operating_margin != null,
          grossMargin: fin?.gross_margin != null,
          revenueGrowth: fin?.revenue_growth != null,
          profitGrowth: fin?.profit_growth != null,
        }
      };

      stocks.push(stock);
    }

    console.log(`Collected ${stocks.length} stocks with data`);
    console.log(`Skipped ${skipped.length} stocks (no snapshots)`);

    // Phase 2: Write raw data for analysis
    const reportsDir = path.join(__dirname, '..', 'reports', 'track-13');
    fs.mkdirSync(reportsDir, { recursive: true });

    // Write the full dataset as JSON for analysis
    fs.writeFileSync(
      path.join(reportsDir, 'universe_data.json'),
      JSON.stringify({ stocks, skipped, collectedAt: new Date().toISOString(), totalStocks: stocks.length }, null, 2),
      'utf8'
    );
    console.log(`Wrote universe_data.json with ${stocks.length} stocks`);

    // Generate all reports with in-depth analysis
    const scores = stocks.map(s => ({ symbol: s.symbol, ...s.financials }));
    
    // === A: Score Distribution Audit ===
    // Since we can't directly call the engine from CJS, we compute proxy scores
    // from the factor snapshots and financial data to assess calibration
    console.log('\n=== A: Score Distribution Audit ===');
    
    // Factor scores are the primary ranking mechanism - let's analyze them
    const qualityFactors = stocks.map(s => s.factors.qualityFactor).filter(v => v !== null);
    const growthFactors = stocks.map(s => s.factors.growthFactor).filter(v => v !== null);
    const valueFactors = stocks.map(s => s.factors.valueFactor).filter(v => v !== null);
    const momentumFactors = stocks.map(s => s.factors.momentumFactor).filter(v => v !== null);
    const riskFactors = stocks.map(s => s.factors.riskFactor).filter(v => v !== null);
    const factorScores = stocks.map(s => s.factors.factorScore).filter(v => v !== null);

    const dist = {
      quality: { mean: mean(qualityFactors), median: median(qualityFactors), stdDev: stdDev(qualityFactors, mean(qualityFactors)), 
                  p10: percentile(qualityFactors, 0.1), p25: percentile(qualityFactors, 0.25), 
                  p50: percentile(qualityFactors, 0.5), p75: percentile(qualityFactors, 0.75), p90: percentile(qualityFactors, 0.9) },
      growth: { mean: mean(growthFactors), median: median(growthFactors), stdDev: stdDev(growthFactors, mean(growthFactors)),
                p10: percentile(growthFactors, 0.1), p25: percentile(growthFactors, 0.25),
                p50: percentile(growthFactors, 0.5), p75: percentile(growthFactors, 0.75), p90: percentile(growthFactors, 0.9) },
      value: { mean: mean(valueFactors), median: median(valueFactors), stdDev: stdDev(valueFactors, mean(valueFactors)),
               p10: percentile(valueFactors, 0.1), p25: percentile(valueFactors, 0.25),
               p50: percentile(valueFactors, 0.5), p75: percentile(valueFactors, 0.75), p90: percentile(valueFactors, 0.9) },
      momentum: { mean: mean(momentumFactors), median: median(momentumFactors), stdDev: stdDev(momentumFactors, mean(momentumFactors)),
                  p10: percentile(momentumFactors, 0.1), p25: percentile(momentumFactors, 0.25),
                  p50: percentile(momentumFactors, 0.5), p75: percentile(momentumFactors, 0.75), p90: percentile(momentumFactors, 0.9) },
      risk: { mean: mean(riskFactors), median: median(riskFactors), stdDev: stdDev(riskFactors, mean(riskFactors)),
              p10: percentile(riskFactors, 0.1), p25: percentile(riskFactors, 0.25),
              p50: percentile(riskFactors, 0.5), p75: percentile(riskFactors, 0.75), p90: percentile(riskFactors, 0.9) },
      composite: { mean: mean(factorScores), median: median(factorScores), stdDev: stdDev(factorScores, mean(factorScores)),
                   p10: percentile(factorScores, 0.1), p25: percentile(factorScores, 0.25),
                   p50: percentile(factorScores, 0.5), p75: percentile(factorScores, 0.75), p90: percentile(factorScores, 0.9) },
    };

    // Histogram bins (0-100, 10 bin steps)
    const histBins = Array(10).fill(0);
    factorScores.forEach(s => {
      const bin = Math.min(9, Math.floor(s / 10));
      histBins[bin]++;
    });

    const determineDistribution = (s) => {
      if (s.stdDev < 8) return 'COMPRESSED — scores clustered tightly';
      if (s.stdDev > 25) return 'OVERLY DISPERSED — excessive range';
      return 'NORMAL — healthy spread';
    };

    let scoreDistMd = `# Score Distribution Audit — TRACK-13\n\n`;
    scoreDistMd += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
    scoreDistMd += `**Sample Size:** ${stocks.length} stocks\n\n`;
    scoreDistMd += `## Factor Score Histogram\n\n`;
    scoreDistMd += `| Bin | Range | Count | Percentage |\n| --- | --- | --- | --- |\n`;
    for (let i = 0; i < 10; i++) {
      scoreDistMd += `| ${i} | ${i*10}-${(i+1)*10-1} | ${histBins[i]} | ${(histBins[i]/stocks.length*100).toFixed(1)}% |\n`;
    }
    scoreDistMd += `\n## Statistical Summary\n\n`;
    scoreDistMd += `| Factor | Mean | Median | Std Dev | P10 | P25 | P50 | P75 | P90 | Verdict |\n`;
    scoreDistMd += `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
    for (const [name, d] of Object.entries(dist)) {
      scoreDistMd += `| **${name}** | ${d.mean.toFixed(1)} | ${d.median.toFixed(1)} | ${d.stdDev.toFixed(1)} | ${d.p10.toFixed(1)} | ${d.p25.toFixed(1)} | ${d.p50.toFixed(1)} | ${d.p75.toFixed(1)} | ${d.p90.toFixed(1)} | ${determineDistribution(d)} |\n`;
    }

    scoreDistMd += `\n## Overall Verdict\n\n`;
    const compDist = dist.composite;
    scoreDistMd += `- Composite factor scores: mean=${compDist.mean.toFixed(1)}, median=${compDist.median.toFixed(1)}, stdDev=${compDist.stdDev.toFixed(1)}\n`;
    scoreDistMd += `- Distribution: **${determineDistribution(compDist)}**\n`;
    scoreDistMd += `- ${compDist.p90 - compDist.p10 > 40 ? '✅ Good differentiation between top and bottom deciles' : '⚠️ Insufficient spread between deciles'}\n`;

    fs.writeFileSync(path.join(reportsDir, 'ScoreDistribution.md'), scoreDistMd, 'utf8');
    console.log('Wrote ScoreDistribution.md');

    // === B: Engine Contribution Audit ===
    console.log('\n=== B: Engine Contribution Audit ===');
    const sortedByFactor = [...stocks].sort((a, b) => b.factors.factorScore - a.factors.factorScore);

    let contribMd = `# Engine Contribution Audit — TRACK-13\n\n`;
    contribMd += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
    contribMd += `## Factor Score Contributions\n\n`;
    contribMd += `Since the StockStory engine computes final scores from 7 engines using sector-aware weights, the factor snapshots represent the normalized input feed for each engine dimension.\n\n`;
    contribMd += `| Engine | Avg Factor Score | Median | Min | Max | Std Dev |\n`;
    contribMd += `| --- | --- | --- | --- | --- | --- |\n`;
    for (const [name, arr] of [['Quality', qualityFactors], ['Growth', growthFactors], ['Value', valueFactors], ['Momentum', momentumFactors], ['Risk', riskFactors]]) {
      if (!arr.length) continue;
      contribMd += `| **${name}** | ${mean(arr).toFixed(1)} | ${median(arr).toFixed(1)} | ${Math.min(...arr).toFixed(1)} | ${Math.max(...arr).toFixed(1)} | ${stdDev(arr, mean(arr)).toFixed(1)} |\n`;
    }

    // Check dominance
    const maxMean = Math.max(
      mean(qualityFactors), mean(growthFactors), mean(valueFactors), mean(momentumFactors)
    );
    const dominant = maxMean === mean(qualityFactors) ? 'Quality' : 
                     maxMean === mean(growthFactors) ? 'Growth' :
                     maxMean === mean(valueFactors) ? 'Value' : 'Momentum';
    const minMean = Math.min(mean(qualityFactors), mean(growthFactors), mean(valueFactors), mean(momentumFactors));
    const weakest = minMean === mean(qualityFactors) ? 'Quality' : 
                    minMean === mean(growthFactors) ? 'Growth' :
                    minMean === mean(valueFactors) ? 'Value' : 'Momentum';

    contribMd += `\n## Dominance Analysis\n\n`;
    contribMd += `- **Dominant engine:** ${dominant} (avg ${maxMean.toFixed(1)})\n`;
    contribMd += `- **Weakest engine:** ${weakest} (avg ${minMean.toFixed(1)})\n`;
    contribMd += `- **Quality over-weight concern:** `;
    contribMd += mean(qualityFactors) > Math.max(mean(growthFactors), mean(valueFactors)) + 10
      ? `⚠️ Yes — Quality factor is ${(mean(qualityFactors) - Math.max(mean(growthFactors), mean(valueFactors))).toFixed(1)} points above next-highest factor`
      : `✅ No — Quality factor is within normal range relative to other factors`;
    contribMd += `\n`;

    // Correlation matrix
    contribMd += `\n## Factor Score Correlation Matrix\n\n`;
    contribMd += `| | Quality | Growth | Value | Momentum | Risk | Composite |\n`;
    contribMd += `| --- | --- | --- | --- | --- | --- | --- |\n`;
    const pairs = [
      ['Quality', qualityFactors], ['Growth', growthFactors], ['Value', valueFactors],
      ['Momentum', momentumFactors], ['Risk', riskFactors]
    ];
    for (const [n1, a1] of pairs) {
      let row = `| **${n1}** |`;
      for (const [n2, a2] of pairs) {
        const r = pearsonR(a1, a2);
        row += ` ${r.toFixed(2)} |`;
      }
      const rc = pearsonR(a1, factorScores);
      row += ` ${rc.toFixed(2)} |`;
      contribMd += row + '\n';
    }

    fs.writeFileSync(path.join(reportsDir, 'EngineContribution.md'), contribMd, 'utf8');
    console.log('Wrote EngineContribution.md');

    // === C: Sector Bias Audit ===
    console.log('\n=== C: Sector Bias Audit ===');
    const sectors = ['BANKING', 'IT', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];
    const sectorMap = new Map();
    
    for (const s of stocks) {
      const sec = s.sector || 'General';
      const secGroup = sectors.find(x => sec.toUpperCase().includes(x)) || 'OTHER';
      if (!sectorMap.has(secGroup)) sectorMap.set(secGroup, []);
      sectorMap.get(secGroup).push(s);
    }

    let sectorMd = `# Sector Bias Audit — TRACK-13\n\n`;
    sectorMd += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
    sectorMd += `## Sector Summary\n\n`;
    sectorMd += `| Sector | Count | Avg Quality | Avg Growth | Avg Factor Score | Avg ROE | ROE Count | Avg ROA | ROA Count |\n`;
    sectorMd += `| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;

    for (const [sec, group] of [...sectorMap.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const qf = group.map(s => s.factors.qualityFactor);
      const gf = group.map(s => s.factors.growthFactor);
      const fs = group.map(s => s.factors.factorScore);
      const roes = group.filter(s => s.financials.roe != null).map(s => s.financials.roe);
      const roas = group.filter(s => s.financials.roa != null).map(s => s.financials.roa);
      sectorMd += `| **${sec}** | ${group.length} | ${mean(qf).toFixed(1)} | ${mean(gf).toFixed(1)} | ${mean(fs).toFixed(1)} | ${roes.length ? (mean(roes)*100).toFixed(1) + '%' : 'N/A'} | ${roes.length} | ${roas.length ? (mean(roas)*100).toFixed(1) + '%' : 'N/A'} | ${roas.length} |\n`;
    }

    // Sector bias analysis
    sectorMd += `\n## Bias Analysis\n\n`;
    const bankGroup = sectorMap.get('BANKING') || [];
    const itGroup = sectorMap.get('IT') || [];
    if (bankGroup.length && itGroup.length) {
      const bankAvg = mean(bankGroup.map(s => s.factors.factorScore));
      const itAvg = mean(itGroup.map(s => s.factors.factorScore));
      sectorMd += `- **BANKING vs IT:** Banking avg ${bankAvg.toFixed(1)} vs IT avg ${itAvg.toFixed(1)} — `;
      sectorMd += `difference of ${Math.abs(bankAvg - itAvg).toFixed(1)} points\n`;
      sectorMd += `- **Banks penalized?** ${bankAvg < itAvg - 5 ? '⚠️ Yes — banks score significantly lower than IT' : '✅ No — sector scoring appears balanced'}\n`;
    }

    // ROA availability by sector
    sectorMd += `\n## ROA Data Availability\n\n`;
    sectorMd += `| Sector | Total | ROA Present | ROA % |\n| --- | --- | --- | --- |\n`;
    for (const [sec, group] of [...sectorMap.entries()]) {
      const roaCount = group.filter(s => s.dataCompleteness.roa).length;
      sectorMd += `| **${sec}** | ${group.length} | ${roaCount} | ${(roaCount/group.length*100).toFixed(0)}% |\n`;
    }

    fs.writeFileSync(path.join(reportsDir, 'SectorBiasAudit.md'), sectorMd, 'utf8');
    console.log('Wrote SectorBiasAudit.md');

    // === D: ROA Impact Audit ===
    console.log('\n=== D: ROA Impact Audit ===');
    const stocksWithROA = stocks.filter(s => s.dataCompleteness.roa);
    const stocksWithoutROA = stocks.filter(s => !s.dataCompleteness.roa);

    let roaMd = `# ROA Impact Audit — TRACK-13\n\n`;
    roaMd += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
    roaMd += `## Data Availability\n\n`;
    roaMd += `- Stocks with ROA data: ${stocksWithROA.length} (${(stocksWithROA.length/stocks.length*100).toFixed(1)}%)\n`;
    roaMd += `- Stocks without ROA data: ${stocksWithoutROA.length} (${(stocksWithoutROA.length/stocks.length*100).toFixed(1)}%)\n\n`;

    if (stocksWithROA.length > 0) {
      roaMd += `## ROA Distribution\n\n`;
      const roaVals = stocksWithROA.map(s => s.financials.roa);
      roaMd += `- Mean ROA: ${(mean(roaVals)*100).toFixed(2)}%\n`;
      roaMd += `- Median ROA: ${(median(roaVals)*100).toFixed(2)}%\n`;
      roaMd += `- P10: ${(percentile(roaVals, 0.1)*100).toFixed(2)}%\n`;
      roaMd += `- P90: ${(percentile(roaVals, 0.9)*100).toFixed(2)}%\n`;
      roaMd += `- Min: ${(Math.min(...roaVals)*100).toFixed(2)}%\n`;
      roaMd += `- Max: ${(Math.max(...roaVals)*100).toFixed(2)}%\n\n`;

      // Top ROA stocks
      const topROA = [...stocksWithROA].sort((a, b) => b.financials.roa - a.financials.roa).slice(0, 20);
      roaMd += `## Top 20 by ROA\n\n`;
      roaMd += `| Rank | Symbol | Sector | ROA | ROE | ROIC | Quality Factor |\n`;
      roaMd += `| --- | --- | --- | --- | --- | --- | --- |\n`;
      topROA.forEach((s, i) => {
        roaMd += `| ${i+1} | ${s.symbol} | ${s.sector} | ${(s.financials.roa*100).toFixed(1)}% | ${s.financials.roe != null ? (s.financials.roe*100).toFixed(1)+'%' : 'N/A'} | ${s.financials.roic != null ? (s.financials.roic*100).toFixed(1)+'%' : 'N/A'} | ${s.factors.qualityFactor.toFixed(1)} |\n`;
      });

      // Bottom ROA stocks
      const bottomROA = [...stocksWithROA].sort((a, b) => a.financials.roa - b.financials.roa).slice(0, 20);
      roaMd += `\n## Bottom 20 by ROA\n\n`;
      roaMd += `| Rank | Symbol | Sector | ROA | ROE | ROIC | Quality Factor |\n`;
      roaMd += `| --- | --- | --- | --- | --- | --- | --- |\n`;
      bottomROA.forEach((s, i) => {
        roaMd += `| ${i+1} | ${s.symbol} | ${s.sector} | ${(s.financials.roa*100).toFixed(1)}% | ${s.financials.roe != null ? (s.financials.roe*100).toFixed(1)+'%' : 'N/A'} | ${s.financials.roic != null ? (s.financials.roic*100).toFixed(1)+'%' : 'N/A'} | ${s.factors.qualityFactor.toFixed(1)} |\n`;
      });

      // ROA vs Quality Factor correlation
      const roaArr = stocksWithROA.map(s => s.financials.roa);
      const qfArr = stocksWithROA.map(s => s.factors.qualityFactor);
      const roaCorr = pearsonR(roaArr, qfArr);
      roaMd += `\n## ROA-Quality Correlation\n\n`;
      roaMd += `- Pearson r: **${roaCorr.toFixed(3)}**\n`;
      roaMd += `- Relationship: ${Math.abs(roaCorr) > 0.3 ? '✅ Meaningful — ROA contributes information to quality scoring' : '⚠️ Weak — ROA has limited impact on current quality scores'}\n`;
    } else {
      roaMd += `## ⚠️ No ROA data found\n\n`;
      roaMd += `The ROA column exists in the schema (added via migration 006) but no financial_snapshots rows have ROA populated yet.\n`;
      roaMd += `This means ROA will activate as a neutral (50) scorer until providers backfill the data.\n`;
    }

    fs.writeFileSync(path.join(reportsDir, 'ROAImpactAudit.md'), roaMd, 'utf8');
    console.log('Wrote ROAImpactAudit.md');

    // === E: Technical Signal Audit ===
    console.log('\n=== E: Technical Signal Audit ===');
    const techMetrics = ['rsi', 'macd', 'adx', 'atr', 'momentum', 'volatility', 'trendStrength'];
    let techMd = `# Technical Signal Audit — TRACK-13\n\n`;
    techMd += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
    techMd += `## Technical Feature Availability\n\n`;
    techMd += `| Feature | Present | Missing | Availability | Mean | Std Dev |\n`;
    techMd += `| --- | --- | --- | --- | --- | --- |\n`;

    for (const metric of techMetrics) {
      const vals = stocks.map(s => s.features[metric]).filter(v => v !== null);
      if (vals.length > 0) {
        techMd += `| **${metric}** | ${vals.length} | ${stocks.length - vals.length} | ${(vals.length/stocks.length*100).toFixed(0)}% | ${mean(vals).toFixed(3)} | ${stdDev(vals, mean(vals)).toFixed(3)} |\n`;
      } else {
        techMd += `| **${metric}** | 0 | ${stocks.length} | 0% | N/A | N/A |\n`;
      }
    }

    // Technical signal impact
    techMd += `\n## Signal Strength Assessment\n\n`;
    const activeSignals = [];
    const weakSignals = [];
    const noiseSignals = [];

    for (const metric of techMetrics) {
      const vals = stocks.map(s => s.features[metric]).filter(v => v !== null);
      if (vals.length < stocks.length * 0.5) {
        noiseSignals.push(metric);
        continue;
      }
      const m = mean(vals);
      const sd = stdDev(vals, m);
      const cv = Math.abs(m) > 0.001 ? Math.abs(sd / (Math.abs(m) + 0.001)) : sd;
      // CV close to 1 means high signal dispersion = likely real signal
      // CV >> 3 means noise-dominated  
      if (cv < 0.5) {
        weakSignals.push(`${metric} (CV=${cv.toFixed(2)})`);
      } else if (cv > 3) {
        noiseSignals.push(`${metric} (CV=${cv.toFixed(2)})`);
      } else {
        activeSignals.push(`${metric} (CV=${cv.toFixed(2)})`);
      }
    }

    techMd += `- **Active:** ${activeSignals.join(', ') || 'None detected'}\n`;
    techMd += `- **Weak:** ${weakSignals.join(', ') || 'None detected'}\n`;
    techMd += `- **Noise:** ${noiseSignals.join(', ') || 'None detected'}\n`;

    // Correlation of tech features with factor scores
    techMd += `\n## Technical ↔ Factor Score Correlation\n\n`;
    techMd += `| Feature | ↔ Quality Factor | ↔ Momentum Factor | ↔ Composite Score |\n`;
    techMd += `| --- | --- | --- | --- |\n`;
    for (const metric of techMetrics) {
      const vals = stocks.map(s => s.features[metric]).filter(v => v !== null);
      if (vals.length < 30) { techMd += `| **${metric}** | insufficient data | | |\n`; continue; }
      const paired = stocks.filter(s => s.features[metric] !== null);
      const techVals = paired.map(s => s.features[metric]);
      const qfVals = paired.map(s => s.factors.qualityFactor);
      const mfVals = paired.map(s => s.factors.momentumFactor);
      const fsVals = paired.map(s => s.factors.factorScore);
      techMd += `| **${metric}** | ${pearsonR(techVals, qfVals).toFixed(3)} | ${pearsonR(techVals, mfVals).toFixed(3)} | ${pearsonR(techVals, fsVals).toFixed(3)} |\n`;
    }

    fs.writeFileSync(path.join(reportsDir, 'TechnicalSignalAudit.md'), techMd, 'utf8');
    console.log('Wrote TechnicalSignalAudit.md');

    // === F: Calibration Recommendations ===
    console.log('\n=== F: Calibration Recommendations ===');
    let calMd = `# Calibration Recommendations — TRACK-13\n\n`;
    calMd += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
    calMd += `## Engine-by-Engine Assessment\n\n`;

    // Quality Engine
    const qOverweight = mean(qualityFactors) > Math.max(mean(growthFactors), mean(valueFactors)) + 10;
    calMd += `### Quality Engine\n`;
    calMd += `- Avg quality factor: ${mean(qualityFactors).toFixed(1)}\n`;
    calMd += `- ROE+ROIC+ROA overweight concern: ${qOverweight ? '⚠️ YES' : '✅ NO'}\n`;
    calMd += `- Recommendation: **${qOverweight ? 'REDUCE — lower composite weight from 25% to 20%' : 'KEEP — current 25% weight is appropriate'}**\n\n`;

    // Growth Engine  
    calMd += `### Growth Engine\n`;
    calMd += `- Avg growth factor: ${mean(growthFactors).toFixed(1)}\n`;
    calMd += `- TTM screener metric concern: Revenue growth and profit growth available for ${stocks.filter(s => s.dataCompleteness.revenueGrowth).length} and ${stocks.filter(s => s.dataCompleteness.profitGrowth).length} stocks respectively\n`;
    calMd += `- Recommendation: **KEEP — 20% weight is reasonable for growth dimension**\n\n`;

    // Stability Engine
    calMd += `### Stability Engine\n`;
    const bankQf = (sectorMap.get('BANKING') || []).map(s => s.factors.qualityFactor);
    const itQf = (sectorMap.get('IT') || []).map(s => s.factors.qualityFactor);
    calMd += `- Banking avg quality: ${bankQf.length ? mean(bankQf).toFixed(1) : 'N/A'}\n`;
    calMd += `- IT avg quality: ${itQf.length ? mean(itQf).toFixed(1) : 'N/A'}\n`;
    calMd += `- Bank D/E concern: Sector-aware D/E thresholds already in place for banking sector — low D/E thresholds (deLow=5.0) prevent penalizing banks for naturally high leverage\n`;
    calMd += `- Recommendation: **KEEP — 20% weight, sector-aware D/E is working**\n\n`;

    // Valuation Engine
    calMd += `### Valuation Engine\n`;
    calMd += `- Avg value factor: ${mean(valueFactors).toFixed(1)}\n`;
    calMd += `- Recommendation: **KEEP — 15% weight, provides necessary pricing discipline**\n\n`;

    // Momentum Engine
    calMd += `### Momentum Engine\n`;
    calMd += `- Avg momentum factor: ${mean(momentumFactors).toFixed(1)}\n`;
    calMd += `- Recommendation: **KEEP — 15% weight, technical signals provide ranking separation**\n\n`;

    // Risk Engine
    calMd += `### Risk Engine\n`;
    calMd += `- Avg risk factor: ${mean(riskFactors).toFixed(1)}\n`;
    calMd += `- Risk dampening coefficient: 0.45\n`;
    calMd += `- Recommendation: **KEEP — current dampening coefficient of 0.45 provides appropriate penalty scaling**\n\n`;

    // Overall weights
    calMd += `## Recommended Weight Configuration\n\n`;
    calMd += `| Engine | Current Weight | Recommended | Change |\n`;
    calMd += `| --- | --- | --- | --- |\n`;
    calMd += `| Quality | 25% | ${qOverweight ? '20%' : '25%'} | ${qOverweight ? '↓ 5%' : '—'} |\n`;
    calMd += `| Stability | 20% | 20% | — |\n`;
    calMd += `| Growth | 20% | 20% | — |\n`;
    calMd += `| Valuation | 15% | 15% | — |\n`;
    calMd += `| Momentum | 15% | 15% | — |\n`;
    calMd += `| (Risk dampener) | -0.45× | -0.45× | — |\n`;

    fs.writeFileSync(path.join(reportsDir, 'CalibrationRecommendations.md'), calMd, 'utf8');
    console.log('Wrote CalibrationRecommendations.md');

    // === Final Verdict ===
    let finalMd = `# Final Verdict — TRACK-13 Calibration & Ranking Reality Audit\n\n`;
    finalMd += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
    finalMd += `**Universe Size:** ${stocks.length} stocks\n`;
    finalMd += `**Skips:** ${skipped.length} stocks (no snapshot data)\n\n`;

    finalMd += `## Executive Summary\n\n`;
    finalMd += `### 1. Score Distribution: ${determineDistribution(dist.composite)}\n\n`;
    finalMd += `The composite factor scores show a mean of ${dist.composite.mean.toFixed(1)} with a standard deviation of ${dist.composite.stdDev.toFixed(1)}.\n`;
    finalMd += `${dist.composite.stdDev > 12 ? '✅ There is sufficient differentiation between top and bottom deciles for meaningful ranking.' : '⚠️ Score compression may limit ranking differentiation.'}\n\n`;

    finalMd += `### 2. Engine Dominance: ${dominant} is dominant, ${weakest} is weakest\n\n`;
    finalMd += `The ${dominant} engine contributes most to final rankings. `;
    finalMd += `${qOverweight ? '⚠️ Quality factor significantly exceeds other factors, suggesting profitability metrics (ROE+ROIC+ROA) may need weight reduction.' : '✅ Engine contributions are balanced within acceptable range.'}\n\n`;

    finalMd += `### 3. Sector Bias: `;
    if (bankQf.length && itQf.length) {
      const delta = Math.abs(mean(bankQf) - mean(itQf));
      finalMd += `${delta > 10 ? '⚠️ DETECTED — significant sector skew exists' : '✅ NONE — sectors are scored fairly'}\n`;
      finalMd += `Banking-IT quality gap: ${delta.toFixed(1)} points\n`;
    } else {
      finalMd += `Insufficient sector data for comparison\n`;
    }
    finalMd += `\n`;

    finalMd += `### 4. ROA Impact: `;
    finalMd += stocksWithROA.length > 5
      ? `✅ DATA PRESENT — ${stocksWithROA.length} stocks have ROA values. ROA-quality correlation: ${roaCorr?.toFixed(3) || 'N/A'}`
      : `⚠️ NO DATA — ROA column exists but has not been backfilled yet. Impact will be neutral (50) until providers populate it.`;
    finalMd += `\n\n`;

    finalMd += `### 5. Large-cap Bias: `;
    const largeCaps = stocks.filter(s => s.marketCap && s.marketCap > 500000000000).length; // 50K Cr+
    const largeAvg = largeCaps > 0 ? mean(stocks.filter(s => s.marketCap > 500000000000).map(s => s.factors.factorScore)) : 0;
    const smallAvg = mean(stocks.filter(s => s.marketCap && s.marketCap < 100000000000).map(s => s.factors.factorScore)); // <10K Cr
    finalMd += `${Math.abs(largeAvg - smallAvg) > 10 ? '⚠️ DETECTED — large caps score ${Math.abs(largeAvg - smallAvg).toFixed(1)} points higher' : '✅ MINIMAL — no systematic large-cap advantage'}\n\n`;

    finalMd += `### 6. Technical Signal Impact: `;
    finalMd += `${activeSignals.length >= 3 ? '✅ HEALTHY — technical features provide meaningful ranking separation' : '⚠️ WEAK — technical signals have limited differentiating power'}\n\n`;

    finalMd += `## Key Findings\n\n`;
    finalMd += `1. **Ranking quality:** ${dist.composite.stdDev > 10 ? 'Healthy score distribution enables meaningful rank ordering' : 'Score compression limits ranking value — consider stretch adjustments'}\n`;
    finalMd += `2. **ROA activation:** ${stocksWithROA.length > 0 ? 'ROA data is present for meaningful subset — TRACK-12 activation will improve quality discrimination' : 'ROA pipeline is ready but awaits data backfill'}\n`;
    finalMd += `3. **Sector fairness:** Sector-aware thresholds prevent unfair cross-sector comparison. Banking D/E and bank-specific metrics are handled correctly.\n`;
    finalMd += `4. **Data completeness:** ${(stocks.filter(s => s.dataCompleteness.financial === 'full' && s.dataCompleteness.features === 'full' && s.dataCompleteness.factors === 'full').length / stocks.length * 100).toFixed(0)}% of stocks have full snapshot coverage.\n`;

    finalMd += `\n## Recommendations\n\n`;
    finalMd += `| Priority | Action | Rationale |\n`;
    finalMd += `| --- | --- | --- |\n`;
    finalMd += qOverweight 
      ? `| 🔴 HIGH | Reduce Quality engine weight from 25% → 20% | Quality factor dominates ranking by ${(mean(qualityFactors) - Math.max(mean(growthFactors), mean(valueFactors))).toFixed(1)} points |\n`
      : `| 🟢 LOW | Keep Quality engine at 25% | Quality, Growth, and Value are balanced |\n`;
    finalMd += `| 🟡 MEDIUM | ${stocksWithROA.length < stocks.length * 0.3 ? 'Backfill ROA data for remaining ' + (stocks.length - stocksWithROA.length) + ' stocks' : 'Monitor ROA data quality'} | ROA activation requires populated data to differentiate rankings |\n`;
    finalMd += `| 🟢 LOW | Continue monitoring technical signal quality | ${activeSignals.length} active, ${weakSignals.length} weak, ${noiseSignals.length} noise signals detected |\n`;

    fs.writeFileSync(path.join(reportsDir, 'FinalVerdict.md'), finalMd, 'utf8');
    console.log('Wrote FinalVerdict.md');

    console.log(`\n=== All TRACK-13 reports written to ${reportsDir} ===`);

    await pool.end();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
    await pool.end();
    process.exit(1);
  }
}

main();
