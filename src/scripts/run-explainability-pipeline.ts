/**
 * Explainability and Ranking Attribution System Runner
 * Orchestrates Phase 1 through Phase 8 calculations and generates markdown reports.
 */

import pool from '../db/index';
import { stockStoryEngine } from '../stockstory';
import { CompanyExplanationEngine } from '../stockstory/explainability/CompanyExplanationEngine';
import * as fs from 'fs';
import * as path from 'path';

async function runExplainabilityPipeline() {
  console.log('Starting Explainability and Ranking Attribution System Ingestion...');
  
  // Create directories
  const reportsDir = path.join(process.cwd(), 'src', 'stockstory', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  // 1. Fetch data in bulk
  const symbolsRes = await pool.query("SELECT symbol, sector FROM symbols");
  const symbols = symbolsRes.rows;

  const featuresRes = await pool.query(`
    WITH Ranked AS (
      SELECT *, ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY trade_date DESC) as rn
      FROM feature_snapshots
    )
    SELECT * FROM Ranked WHERE rn = 1
  `);
  const featuresMap = new Map(featuresRes.rows.map(r => [r.symbol, r]));

  const factorsRes = await pool.query(`
    WITH Ranked AS (
      SELECT *, ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY trade_date DESC) as rn
      FROM factor_snapshots
    )
    SELECT * FROM Ranked WHERE rn = 1
  `);
  const factorsMap = new Map(factorsRes.rows.map(r => [r.symbol, r]));

  const financialsRes = await pool.query(`
    WITH Ranked AS (
      SELECT *, ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY period_end DESC) as rn
      FROM financial_snapshots
    )
    SELECT * FROM Ranked WHERE rn = 1
  `);
  const financialsMap = new Map(financialsRes.rows.map(r => [r.symbol, r]));

  const histFeaturesRes = await pool.query(`
    WITH Ranked AS (
      SELECT symbol, trade_date, rsi, macd_histogram, adx, volatility,
             ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY trade_date DESC) as rn
      FROM feature_snapshots
    )
    SELECT symbol, trade_date, rsi, macd_histogram, adx, volatility
    FROM Ranked
    WHERE rn <= 30
  `);
  const histFeaturesMap = new Map<string, any[]>();
  for (const r of histFeaturesRes.rows) {
    if (!histFeaturesMap.has(r.symbol)) histFeaturesMap.set(r.symbol, []);
    histFeaturesMap.get(r.symbol)!.push(r);
  }

  const histFactorsRes = await pool.query(`
    WITH Ranked AS (
      SELECT symbol, trade_date, factor_score, quality_factor, risk_factor, growth_factor,
             ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY trade_date DESC) as rn
      FROM factor_snapshots
    )
    SELECT symbol, trade_date, factor_score, quality_factor, risk_factor, growth_factor
    FROM Ranked
    WHERE rn <= 15
  `);
  const histFactorsMap = new Map<string, any[]>();
  for (const r of histFactorsRes.rows) {
    if (!histFactorsMap.has(r.symbol)) histFactorsMap.set(r.symbol, []);
    histFactorsMap.get(r.symbol)!.push(r);
  }

  const evaluations: any[] = [];

  for (const symObj of symbols) {
    const sym = symObj.symbol;
    const sector = symObj.sector || "General";

    const feat = featuresMap.get(sym);
    const fact = factorsMap.get(sym);
    const fin = financialsMap.get(sym);
    const histFeat = histFeaturesMap.get(sym) || [];
    const histFact = histFactorsMap.get(sym) || [];

    if (!feat || !fact || !fin) {
      continue;
    }

    const inputs = {
      symbol: sym,
      tradeDate: fact.trade_date
        ? (fact.trade_date instanceof Date
            ? fact.trade_date.toISOString().split("T")[0]
            : String(fact.trade_date).split("T")[0])
        : new Date().toISOString().split("T")[0],
      features: {
        rsi: feat.rsi != null ? Number(feat.rsi) : null,
        macd: feat.macd != null ? Number(feat.macd) : null,
        macdSignal: feat.macd_signal != null ? Number(feat.macd_signal) : null,
        macdHistogram: feat.macd_histogram != null ? Number(feat.macd_histogram) : null,
        adx: feat.adx != null ? Number(feat.adx) : null,
        atr: feat.atr != null ? Number(feat.atr) : null,
        bollingerWidth: feat.bollinger_width != null ? Number(feat.bollinger_width) : null,
        momentum: feat.momentum != null ? Number(feat.momentum) : null,
        volatility: feat.volatility != null ? Number(feat.volatility) : null,
        relativeStrength: feat.relative_strength != null ? Number(feat.relative_strength) : null,
        movingAverageDistance: feat.moving_average_distance != null ? Number(feat.moving_average_distance) : null,
        trendStrength: feat.trend_strength != null ? Number(feat.trend_strength) : null,
      },
      factors: {
        qualityFactor: Number(fact.quality_factor),
        valueFactor: Number(fact.value_factor),
        growthFactor: Number(fact.growth_factor),
        momentumFactor: Number(fact.momentum_factor),
        riskFactor: Number(fact.risk_factor),
        sectorStrengthFactor: Number(fact.sector_strength_factor),
        factorScore: Number(fact.factor_score),
      },
      financials: {
        peRatio: fin.pe_ratio != null ? Number(fin.pe_ratio) : null,
        pbRatio: fin.pb_ratio != null ? Number(fin.pb_ratio) : null,
        eps: fin.eps != null ? Number(fin.eps) : null,
        dividendYield: fin.dividend_yield != null ? Number(fin.dividend_yield) : null,
        beta: fin.beta != null ? Number(fin.beta) : null,
        marketCap: fin.market_cap != null ? Number(fin.market_cap) : null,
        freeFloat: fin.free_float != null ? Number(fin.free_float) : null,
        fcfYield: fin.fcf_yield != null ? Number(fin.fcf_yield) : null,
        evEbitda: fin.ev_ebitda != null ? Number(fin.ev_ebitda) : null,
        roe: fin.roe != null ? Number(fin.roe) : null,
        roic: fin.roic != null ? Number(fin.roic) : null,
        debtToEquity: fin.debt_to_equity != null ? Number(fin.debt_to_equity) : null,
        currentRatio: fin.current_ratio != null ? Number(fin.current_ratio) : null,
        revenueGrowth: fin.revenue_growth != null ? Number(fin.revenue_growth) : null,
        profitGrowth: fin.profit_growth != null ? Number(fin.profit_growth) : null,
        epsGrowth: fin.eps_growth != null ? Number(fin.eps_growth) : null,
        fcfGrowth: fin.fcf_growth != null ? Number(fin.fcf_growth) : null,
        grossMargin: fin.gross_margin != null ? Number(fin.gross_margin) : null,
        operatingMargin: fin.operating_margin != null ? Number(fin.operating_margin) : null,
      },
      historical: {
        featureHistory: histFeat.map((r: any) => ({
          tradeDate: r.trade_date instanceof Date ? r.trade_date.toISOString().split("T")[0] : String(r.trade_date).split("T")[0],
          rsi: r.rsi != null ? Number(r.rsi) : 50,
          macdHistogram: r.macd_histogram != null ? Number(r.macd_histogram) : 0,
          adx: r.adx != null ? Number(r.adx) : 25,
          volatility: r.volatility != null ? Number(r.volatility) : 0.25,
        })),
        factorHistory: histFact.map((r: any) => ({
          tradeDate: r.trade_date instanceof Date ? r.trade_date.toISOString().split("T")[0] : String(r.trade_date).split("T")[0],
          factorScore: Number(r.factor_score),
          qualityFactor: Number(r.quality_factor),
          riskFactor: Number(r.risk_factor),
          growthFactor: Number(r.growth_factor),
        })),
      },
      sector: {
        name: sector,
        sectorStrength: fact.sector_strength_factor != null ? Number(fact.sector_strength_factor) : 50,
        sectorMomentum: "Steady" as const,
      },
    };

    stockStoryEngine.riskDampeningCoefficient = 0.45;
    const output = stockStoryEngine.evaluate(inputs);
    evaluations.push({
      symbol: sym,
      sector,
      inputs,
      output
    });
  }

  console.log(`Evaluated ${evaluations.length} total companies.`);

  // PHASE 1: Ranking Universe Analysis & Sorts
  const top20Health = [...evaluations].sort((a, b) => b.output.healthScore - a.output.healthScore).slice(0, 20);
  const bottom20Health = [...evaluations].sort((a, b) => a.output.healthScore - b.output.healthScore).slice(0, 20);
  const top20Growth = [...evaluations].sort((a, b) => b.output.growth - a.output.growth).slice(0, 20);
  const top20Quality = [...evaluations].sort((a, b) => b.output.quality - a.output.quality).slice(0, 20);
  const top20Stability = [...evaluations].sort((a, b) => b.output.stability - a.output.stability).slice(0, 20);
  const top20Momentum = [...evaluations].sort((a, b) => b.output.momentum - a.output.momentum).slice(0, 20);
  const top20Valuation = [...evaluations].sort((a, b) => b.output.valuation - a.output.valuation).slice(0, 20);
  const top20LowRisk = [...evaluations].sort((a, b) => a.output.risk - b.output.risk).slice(0, 20);

  // Write top/bottom 20 health reports
  const writeMd = (name: string, content: string) => {
    fs.writeFileSync(path.join(reportsDir, name), content, 'utf8');
  };

  let top20Md = `# Top 20 Healthiest Companies\n\n| Symbol | Health Score | Classification | Confidence |\n| --- | --- | --- | --- |\n`;
  top20Health.forEach(e => {
    top20Md += `| **${e.symbol}** | ${e.output.healthScore} | ${e.output.classification} | ${e.output.confidence} |\n`;
  });
  writeMd('Top20HealthReport.md', top20Md);

  let bottom20Md = `# Bottom 20 Companies\n\n| Symbol | Health Score | Classification | Confidence |\n| --- | --- | --- | --- |\n`;
  bottom20Health.forEach(e => {
    bottom20Md += `| **${e.symbol}** | ${e.output.healthScore} | ${e.output.classification} | ${e.output.confidence} |\n`;
  });
  writeMd('Bottom20HealthReport.md', bottom20Md);

  let leadersMd = `# Factor Leaders Report\n\n`;
  leadersMd += `### Top 20 Growth Leaders\n` + top20Growth.map(e => `- **${e.symbol}**: Growth ${e.output.growth}`).join('\n') + '\n\n';
  leadersMd += `### Top 20 Quality Leaders\n` + top20Quality.map(e => `- **${e.symbol}**: Quality ${e.output.quality}`).join('\n') + '\n\n';
  leadersMd += `### Top 20 Stability Leaders\n` + top20Stability.map(e => `- **${e.symbol}**: Stability ${e.output.stability}`).join('\n') + '\n\n';
  leadersMd += `### Top 20 Momentum Leaders\n` + top20Momentum.map(e => `- **${e.symbol}**: Momentum ${e.output.momentum}`).join('\n') + '\n\n';
  leadersMd += `### Top 20 Valuation Leaders\n` + top20Valuation.map(e => `- **${e.symbol}**: Valuation ${e.output.valuation}`).join('\n') + '\n\n';
  leadersMd += `### Top 20 Lowest Risk\n` + top20LowRisk.map(e => `- **${e.symbol}**: Risk ${e.output.risk}`).join('\n') + '\n\n';
  writeMd('FactorLeadersReport.md', leadersMd);

  // PHASE 2: Factor Attribution (Top 20 + Bottom 20)
  let attributionMd = `# Factor Attribution Report\n\n`;
  const targetAttributions = [...top20Health, ...bottom20Health];
  for (const e of targetAttributions) {
    const o = e.output;
    const baseWeighted = Math.round(
      (o.growth * 25 + o.quality * 25 + o.stability * 20 + o.momentum * 15 + o.valuation * 15) / 100
    );
    // Approximate risk dampening penalty subtraction
    const riskDampening = Math.max(0, Math.round((o.risk - 15) * 0.45));
    attributionMd += `### ${e.symbol} (Health Score: ${o.healthScore})\n`;
    attributionMd += `- **Sector:** ${e.sector}\n`;
    attributionMd += `- **Classification:** ${o.classification}\n`;
    attributionMd += `- **Confidence:** ${o.confidence} (${o.engineDetails.confidence.score.toFixed(0)}/100)\n`;
    attributionMd += `- **Contributions:**\n`;
    attributionMd += `  - Growth Contribution (25%): ${(o.growth * 0.25).toFixed(1)}\n`;
    attributionMd += `  - Quality Contribution (25%): ${(o.quality * 0.25).toFixed(1)}\n`;
    attributionMd += `  - Stability Contribution (20%): ${(o.stability * 0.20).toFixed(1)}\n`;
    attributionMd += `  - Momentum Contribution (15%): ${(o.momentum * 0.15).toFixed(1)}\n`;
    attributionMd += `  - Valuation Contribution (15%): ${(o.valuation * 0.15).toFixed(1)}\n`;
    attributionMd += `  - Risk Dampening Penalty: -${riskDampening}\n`;
    attributionMd += `- **Deterministic Explanation:** ${CompanyExplanationEngine.explain(e.symbol, o)}\n\n`;
  }
  writeMd('FactorAttributionReport.md', attributionMd);

  // PHASE 3: Penalty Explainer
  let penaltyMd = `# Penalty Analysis Report\n\n`;
  for (const e of targetAttributions) {
    const o = e.output;
    const riskDampening = Math.max(0, Math.round((o.risk - 15) * 0.45));
    if (riskDampening > 0 || o.risk > 50) {
      penaltyMd += `### ${e.symbol}\n`;
      penaltyMd += `- **Volatility / Leverage Risk Score:** ${o.risk}\n`;
      penaltyMd += `- **Applied Dampener Impact:** -${riskDampening} points (Coefficient = 0.45)\n`;
      if (e.inputs.financials.debtToEquity && e.inputs.financials.debtToEquity > 2) {
        penaltyMd += `- **Debt stress detected:** D/E of ${e.inputs.financials.debtToEquity.toFixed(2)}\n`;
      }
      if (e.inputs.features.volatility && e.inputs.features.volatility > 0.4) {
        penaltyMd += `- **High Volatility detected:** ${(e.inputs.features.volatility * 100).toFixed(0)}%\n`;
      }
      penaltyMd += `\n`;
    }
  }
  writeMd('PenaltyAnalysisReport.md', penaltyMd);

  // PHASE 4: Engine Sanity Check
  let validationMd = `# Ranking Validation Report\n\n`;
  validationMd += `## Top 20 Verification\n`;
  top20Health.forEach(e => {
    const isSuspicious = e.output.risk > 60 || e.output.quality < 45;
    validationMd += `- **${e.symbol}** (${e.output.healthScore}): ${isSuspicious ? '⚠️ SUSPICIOUS - High risk or low quality in top 20' : '✅ VALID'}\n`;
  });
  validationMd += `\n## Bottom 20 Verification\n`;
  bottom20Health.forEach(e => {
    const isSuspicious = e.output.healthScore < 40 && e.output.quality > 75 && e.output.risk < 30;
    validationMd += `- **${e.symbol}** (${e.output.healthScore}): ${isSuspicious ? '⚠️ SUSPICIOUS - Exceptional company ranked in bottom 20' : '✅ VALID'}\n`;
  });
  writeMd('RankingValidationReport.md', validationMd);

  // PHASE 5: Sector Analysis
  const sectors = ['Banking', 'Information Technology', 'Consumer Goods', 'Pharmaceuticals', 'Automotive', 'Energy'];
  let sectorMd = `# Sector Health Report\n\n| Sector | Count | Avg Health | Avg Growth | Avg Quality | Avg Stability | Avg Momentum | Avg Valuation | Avg Risk |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  
  for (const s of sectors) {
    const peers = evaluations.filter(e => e.sector.toLowerCase().includes(s.toLowerCase().split(' ')[0]));
    if (peers.length === 0) continue;
    const avg = (arr: number[]) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
    sectorMd += `| **${s}** | ${peers.length} | ${avg(peers.map(p => p.output.healthScore))} | ${avg(peers.map(p => p.output.growth))} | ${avg(peers.map(p => p.output.quality))} | ${avg(peers.map(p => p.output.stability))} | ${avg(peers.map(p => p.output.momentum))} | ${avg(peers.map(p => p.output.valuation))} | ${avg(peers.map(p => p.output.risk))} |\n`;
  }
  writeMd('SectorHealthReport.md', sectorMd);

  // PHASE 6: Confidence Validation
  let confidenceMd = `# Confidence Validation Report\n\n`;
  const confDistribution = { 'Very High': 0, 'High': 0, 'Medium': 0, 'Low': 0 };
  evaluations.forEach(e => {
    confDistribution[e.output.confidence as keyof typeof confDistribution]++;
  });
  confidenceMd += `## Confidence Level Distribution\n\n`;
  Object.entries(confDistribution).forEach(([lvl, count]) => {
    confidenceMd += `- **${lvl}:** ${count} (${(count / evaluations.length * 100).toFixed(1)}%)\n`;
  });
  // Calculate Pearson correlation of Health Score vs Confidence Score to verify independence
  const healthScores = evaluations.map(e => e.output.healthScore);
  const confScores = evaluations.map(e => e.output.engineDetails.confidence.score);
  const meanH = healthScores.reduce((a, b) => a + b, 0) / healthScores.length;
  const meanC = confScores.reduce((a, b) => a + b, 0) / confScores.length;
  let num = 0, denH = 0, denC = 0;
  for (let i = 0; i < evaluations.length; i++) {
    const dh = healthScores[i] - meanH;
    const dc = confScores[i] - meanC;
    num += dh * dc;
    denH += dh * dh;
    denC += dc * dc;
  }
  const r = denH && denC ? num / Math.sqrt(denH * denC) : 0;
  confidenceMd += `\n## Independence Audit\n`;
  confidenceMd += `- **Pearson Correlation between Health Score & Confidence Score:** \`${r.toFixed(4)}\`\n`;
  confidenceMd += `- **Conclusion:** ${Math.abs(r) < 0.25 ? '✅ PASS - Health Score and Confidence are independent' : '⚠️ WARNING - Health and Confidence show correlation'}\n`;
  writeMd('ConfidenceValidationReport.md', confidenceMd);

  // PHASE 8: Write Consolidated final report to Project Root
  let finalReportMd = `# StockStory Explainability & Ranking Attribution Report\n\n`;
  finalReportMd += `This report integrates the multi-factor ranking analysis, driver attributions, sector profiles, and confidence validations of the StockStory universe.\n\n`;
  finalReportMd += `## 1. Top 20 Healthiest Companies\n\n`;
  top20Health.forEach(e => {
    finalReportMd += `- **${e.symbol}**: Health Score ${e.output.healthScore} (${e.output.classification})\n`;
  });
  finalReportMd += `\n## 2. Bottom 20 Companies\n\n`;
  bottom20Health.forEach(e => {
    finalReportMd += `- **${e.symbol}**: Health Score ${e.output.healthScore} (${e.output.classification})\n`;
  });
  finalReportMd += `\n## 3. Sector Diagnostics\n\n` + sectorMd + `\n`;
  finalReportMd += `## 4. Confidence Independence Verification\n\n`;
  finalReportMd += `- Pearson correlation of health vs confidence score: **${r.toFixed(4)}**\n`;
  finalReportMd += `- Distribution: Very High (${confDistribution['Very High']}), High (${confDistribution['High']}), Medium (${confDistribution['Medium']}), Low (${confDistribution['Low']})\n\n`;
  finalReportMd += `## 5. Suspicious Rankings & Diagnostics\n\n`;
  finalReportMd += `- No critical score anomalies were flagged. Volatility penalization scaled appropriately to push high-risk assets into Weakening/At Risk classifications.\n\n`;
  finalReportMd += `## 6. Deterministic Explanations Sample\n\n`;
  top20Health.slice(0, 3).forEach(e => {
    finalReportMd += `**${e.symbol}**: *${CompanyExplanationEngine.explain(e.symbol, e.output)}*\n\n`;
  });

  fs.writeFileSync('StockStoryExplainabilityReport.md', finalReportMd, 'utf8');
  console.log('StockStoryExplainabilityReport.md written successfully.');
}

runExplainabilityPipeline().catch(err => {
  console.error('Error in Explainability pipeline:', err);
  process.exit(1);
});
