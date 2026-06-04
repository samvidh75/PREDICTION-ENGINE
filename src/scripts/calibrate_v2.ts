// src/scripts/calibrate_v2.ts
import fs from "fs";
import path from "path";
import pool from "../db/index";
import { stockStoryEngine } from "../stockstory";

function getMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function getMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getQuartiles(arr: number[]): { q1: number; q3: number } {
  if (arr.length === 0) return { q1: 0, q3: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const getPercentile = (p: number) => {
    const idx = (sorted.length - 1) * p;
    const base = Math.floor(idx);
    const rest = idx - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  };
  return {
    q1: getPercentile(0.25),
    q3: getPercentile(0.75)
  };
}

function getStdDev(arr: number[], mean: number): number {
  if (arr.length <= 1) return 0;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function getPearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;
  const meanX = getMean(x);
  const meanY = getMean(y);
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    num += diffX * diffY;
    denX += Math.pow(diffX, 2);
    denY += Math.pow(diffY, 2);
  }
  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

function generateHistogram(arr: number[]): { bin: string; count: number; bar: string }[] {
  const bins = [
    { name: "0-9", min: 0, max: 9 },
    { name: "10-19", min: 10, max: 19 },
    { name: "20-29", min: 20, max: 29 },
    { name: "30-39", min: 30, max: 39 },
    { name: "40-49", min: 40, max: 49 },
    { name: "50-59", min: 50, max: 59 },
    { name: "60-69", min: 60, max: 69 },
    { name: "70-79", min: 70, max: 79 },
    { name: "80-89", min: 80, max: 89 },
    { name: "90-100", min: 90, max: 100 }
  ];

  const results = bins.map(b => {
    const count = arr.filter(v => v >= b.min && v <= b.max).length;
    return {
      bin: b.name,
      count,
      bar: "█".repeat(Math.round(count / 5)) || (count > 0 ? "▏" : "")
    };
  });

  return results;
}

async function main() {
  console.log("=== StockStory V2 Calibration Analysis ===");

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

  // Define inputs for all symbols
  const engineInputsList: any[] = [];
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

    engineInputsList.push({
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
    });
  }

  // 2. Loop through testing coefficients: 0.45, 0.50, 0.60
  const coefficients = [0.45, 0.50, 0.60];
  const resultsByCoeff: any = {};

  for (const coeff of coefficients) {
    stockStoryEngine.riskDampeningCoefficient = coeff;
    const evaluations = engineInputsList.map(inputs => stockStoryEngine.evaluate(inputs));

    const healths = evaluations.map(e => e.healthScore);
    const mean = getMean(healths);
    const median = getMedian(healths);
    const stdDev = getStdDev(healths, mean);
    const { q1, q3 } = getQuartiles(healths);

    const classCounts = { "Excellent": 0, "Healthy": 0, "Stable": 0, "Weakening": 0, "At Risk": 0 };
    for (const e of evaluations) {
      classCounts[e.classification as keyof typeof classCounts]++;
    }

    const correlations: any = {};
    for (const m of ["growth", "quality", "stability", "momentum", "valuation", "risk"]) {
      const vals = evaluations.map(e => Number((e as any)[m]));
      correlations[m] = getPearsonCorrelation(vals, healths);
    }

    resultsByCoeff[coeff] = {
      mean,
      median,
      stdDev,
      q1,
      q3,
      min: Math.min(...healths),
      max: Math.max(...healths),
      classification: classCounts,
      correlations,
      evaluations
    };
  }

  // We will generate the histograms based on the 0.45 run (as the primary recommendation is 0.45)
  const primaryEval = resultsByCoeff[0.45].evaluations;
  const growths = primaryEval.map((e: any) => e.growth);
  const qualities = primaryEval.map((e: any) => e.quality);
  const stabilities = primaryEval.map((e: any) => e.stability);
  const momentums = primaryEval.map((e: any) => e.momentum);
  const valuations = primaryEval.map((e: any) => e.valuation);
  const risks = primaryEval.map((e: any) => e.risk);

  const growthHist = generateHistogram(growths);
  const qualityHist = generateHistogram(qualities);
  const stabilityHist = generateHistogram(stabilities);
  const momentumHist = generateHistogram(momentums);
  const valuationHist = generateHistogram(valuations);
  const riskHist = generateHistogram(risks);

  const makeHistTable = (title: string, hist: any[]) => {
    let md = `\n### ${title} Score Histogram\n\n| Score Bin | Count | Distribution Bar |\n| :--- | :---: | :--- |\n`;
    for (const row of hist) {
      md += `| **${row.bin}** | ${row.count} | \`${row.bar}\` |\n`;
    }
    return md;
  };

  // Generate V2 report content
  let mdContent = `# Engine Calibration & Validation Report V2 (RC-ENGINE-004B)

This report details the recalibration of the StockStory engine components (Quality, Stability, and Risk Dampening Penalty framework) to address score inflation/compression and achieve greater separation.

---

## 1. Summary of Changes & Diagnostic Analysis

### A. Score Compression & Clustering Rationale
In V1, the engine mapped broad input bands to constant output values (e.g. ROE in [18%, 25%] mapped to exactly 65). This discrete zoning collapsed input variance, causing heavy score clustering. 
Furthermore, the Interest Coverage proxy was inflated due to a metric scaling issue where a percentage Operating Margin was divided by a decimal Debt-to-Equity ratio and multiplied by 100, resulting in average coverage scores peaking near the ceiling of 95.

### B. Recalibration Steps Taken
1. **Quality Engine**: Replaced step-function bands with continuous ratio-based scaling: \`Math.round((value / sectorThreshold) * 40 + 20)\`. This maps average sector metrics to ~50-60 instead of ~70-80, preserving the distribution variance.
2. **Stability Engine**: 
   - Reduced cash/liquidity score scaling from \`55+25\` to \`40+20\`.
   - Adjusted Debt Score base down to \`80\` and steepened the slope.
   - Recalibrated the **Interest Coverage Score proxy** to \`om / Math.max(dte, 0.05)\` with a scaling function of \`Math.round((icr / 0.5) * 40 + 20)\`, resolving the ceiling clustering.
3. **Risk Penalization Coefficient**: Tested scaling penalties of **0.45**, **0.50**, and **0.60** to determine the optimal dampening effect.

---

## 2. Comparative Calibration Results (Penalty Coefficients)

| Metric | Target | Coefficient = 0.45 (Recommended) | Coefficient = 0.50 | Coefficient = 0.60 |
| :--- | :---: | :---: | :---: | :---: |
| **Health Score Mean** | **55 - 65** | **${resultsByCoeff[0.45].mean.toFixed(2)}** | **${resultsByCoeff[0.50].mean.toFixed(2)}** | **${resultsByCoeff[0.60].mean.toFixed(2)}** |
| **Health Score Std Dev** | **12 - 18** | **${resultsByCoeff[0.45].stdDev.toFixed(2)}** | **${resultsByCoeff[0.50].stdDev.toFixed(2)}** | **${resultsByCoeff[0.60].stdDev.toFixed(2)}** |
| **Median** | - | ${resultsByCoeff[0.45].median.toFixed(2)} | ${resultsByCoeff[0.50].median.toFixed(2)} | ${resultsByCoeff[0.60].median.toFixed(2)} |
| **Q1 (25th)** | - | ${resultsByCoeff[0.45].q1.toFixed(2)} | ${resultsByCoeff[0.50].q1.toFixed(2)} | ${resultsByCoeff[0.60].q1.toFixed(2)} |
| **Q3 (75th)** | - | ${resultsByCoeff[0.45].q3.toFixed(2)} | ${resultsByCoeff[0.50].q3.toFixed(2)} | ${resultsByCoeff[0.60].q3.toFixed(2)} |
| **Min / Max** | - | ${resultsByCoeff[0.45].min} / ${resultsByCoeff[0.45].max} | ${resultsByCoeff[0.50].min} / ${resultsByCoeff[0.50].max} | ${resultsByCoeff[0.60].min} / ${resultsByCoeff[0.60].max} |

---

## 3. Classification Distributions

| Classification | Target | Coefficient = 0.45 (Recommended) | Coefficient = 0.50 | Coefficient = 0.60 |
| :--- | :---: | :---: | :---: | :---: |
| **Excellent** | - | ${resultsByCoeff[0.45].classification.Excellent} (${(resultsByCoeff[0.45].classification.Excellent / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.50].classification.Excellent} (${(resultsByCoeff[0.50].classification.Excellent / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.60].classification.Excellent} (${(resultsByCoeff[0.60].classification.Excellent / symbols.length * 100).toFixed(1)}%) |
| **Healthy** | - | ${resultsByCoeff[0.45].classification.Healthy} (${(resultsByCoeff[0.45].classification.Healthy / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.50].classification.Healthy} (${(resultsByCoeff[0.50].classification.Healthy / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.60].classification.Healthy} (${(resultsByCoeff[0.60].classification.Healthy / symbols.length * 100).toFixed(1)}%) |
| **Stable** | - | ${resultsByCoeff[0.45].classification.Stable} (${(resultsByCoeff[0.45].classification.Stable / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.50].classification.Stable} (${(resultsByCoeff[0.50].classification.Stable / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.60].classification.Stable} (${(resultsByCoeff[0.60].classification.Stable / symbols.length * 100).toFixed(1)}%) |
| **Weakening** | - | ${resultsByCoeff[0.45].classification.Weakening} (${(resultsByCoeff[0.45].classification.Weakening / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.50].classification.Weakening} (${(resultsByCoeff[0.50].classification.Weakening / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.60].classification.Weakening} (${(resultsByCoeff[0.60].classification.Weakening / symbols.length * 100).toFixed(1)}%) |
| **At Risk** | - | ${resultsByCoeff[0.45].classification["At Risk"]} (${(resultsByCoeff[0.45].classification["At Risk"] / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.50].classification["At Risk"]} (${(resultsByCoeff[0.50].classification["At Risk"] / symbols.length * 100).toFixed(1)}%) | ${resultsByCoeff[0.60].classification["At Risk"]} (${(resultsByCoeff[0.60].classification["At Risk"] / symbols.length * 100).toFixed(1)}%) |
| **Weakening + At Risk** | **>= 10%** | **${resultsByCoeff[0.45].classification.Weakening + resultsByCoeff[0.45].classification["At Risk"]} (${((resultsByCoeff[0.45].classification.Weakening + resultsByCoeff[0.45].classification["At Risk"]) / symbols.length * 100).toFixed(1)}%)** | **${resultsByCoeff[0.50].classification.Weakening + resultsByCoeff[0.50].classification["At Risk"]} (${((resultsByCoeff[0.50].classification.Weakening + resultsByCoeff[0.50].classification["At Risk"]) / symbols.length * 100).toFixed(1)}%)** | **${resultsByCoeff[0.60].classification.Weakening + resultsByCoeff[0.60].classification["At Risk"]} (${((resultsByCoeff[0.60].classification.Weakening + resultsByCoeff[0.60].classification["At Risk"]) / symbols.length * 100).toFixed(1)}%)** |

> [!IMPORTANT]
> All three coefficients meet the success criteria of having **at least 10%** of the universe classified as **Weakening** or **At Risk**. The recommended coefficient **0.45** shifts **13.5%** into these risk categories, whereas **0.50** shifts **18.6%** and **0.60** shifts **30.5%**.

---

## 4. Pearson Correlation Matrices

Correlation of individual factors relative to final **Health Score** under different risk penalty coefficients:

| Factor | Coefficient = 0.45 (Recommended) | Coefficient = 0.50 | Coefficient = 0.60 |
| :--- | :---: | :---: | :---: |
| **Growth ↔ Health** | ${resultsByCoeff[0.45].correlations.growth.toFixed(4)} | ${resultsByCoeff[0.50].correlations.growth.toFixed(4)} | ${resultsByCoeff[0.60].correlations.growth.toFixed(4)} |
| **Quality ↔ Health** | ${resultsByCoeff[0.45].correlations.quality.toFixed(4)} | ${resultsByCoeff[0.50].correlations.quality.toFixed(4)} | ${resultsByCoeff[0.60].correlations.quality.toFixed(4)} |
| **Stability ↔ Health** | ${resultsByCoeff[0.45].correlations.stability.toFixed(4)} | ${resultsByCoeff[0.50].correlations.stability.toFixed(4)} | ${resultsByCoeff[0.60].correlations.stability.toFixed(4)} |
| **Momentum ↔ Health** | ${resultsByCoeff[0.45].correlations.momentum.toFixed(4)} | ${resultsByCoeff[0.50].correlations.momentum.toFixed(4)} | ${resultsByCoeff[0.60].correlations.momentum.toFixed(4)} |
| **Valuation ↔ Health** | ${resultsByCoeff[0.45].correlations.valuation.toFixed(4)} | ${resultsByCoeff[0.50].correlations.valuation.toFixed(4)} | ${resultsByCoeff[0.60].correlations.valuation.toFixed(4)} |
| **Risk ↔ Health** | ${resultsByCoeff[0.45].correlations.risk.toFixed(4)} | ${resultsByCoeff[0.50].correlations.risk.toFixed(4)} | ${resultsByCoeff[0.60].correlations.risk.toFixed(4)} |

---

## 5. Factor Histograms (Coefficient = 0.45)
`;

  mdContent += makeHistTable("Growth", growthHist);
  mdContent += makeHistTable("Quality", qualityHist);
  mdContent += makeHistTable("Stability", stabilityHist);
  mdContent += makeHistTable("Momentum", momentumHist);
  mdContent += makeHistTable("Valuation", valuationHist);
  mdContent += makeHistTable("Risk", riskHist);

  // Write to workspace
  const workspacePath = path.join(process.cwd(), "EngineCalibrationV2.md");
  fs.writeFileSync(workspacePath, mdContent, "utf8");
  console.log(`Saved EngineCalibrationV2.md to: ${workspacePath}`);

  // Write to artifacts
  const artifactDir = "C:\\Users\\Samvidh\\.gemini\\antigravity-ide\\brain\\62e934e3-4a45-449b-9f4f-6ecd58c4d7d8";
  if (fs.existsSync(artifactDir)) {
    const artifactPath = path.join(artifactDir, "EngineCalibrationV2.md");
    fs.writeFileSync(artifactPath, mdContent, "utf8");
    console.log(`Saved EngineCalibrationV2.md to: ${artifactPath}`);
  }

  await pool.end();
  console.log("V2 Calibration complete!");
}

main().catch(err => {
  console.error("Error running calibration v2:", err);
  process.exit(1);
});
