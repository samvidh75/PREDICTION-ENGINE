// src/scripts/generate-live-report.ts
import dotenv from "dotenv";
import { writeFileSync } from "fs";
import { join } from "path";
import pool from "../db/index";
import { insightEngine } from "../services/InsightEngine";
import { companyIntelligenceEngine } from "../services/CompanyIntelligenceEngine";
import { sectorIntelligenceEngine } from "../services/SectorIntelligenceEngine";
import { narrativeEngine } from "../services/NarrativeEngine";

dotenv.config();

const SYMBOLS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "HAL"];

async function main() {
  const executionReport: any[] = [];

  for (const sym of SYMBOLS) {
    console.log(`Evaluating live execution for ${sym}...`);
    const t0 = Date.now();

    // Find sector for symbol
    const symInfo = await pool.query(
      `SELECT sector FROM symbols WHERE symbol = $1`,
      [sym]
    );
    const sector = symInfo.rows[0]?.sector || "Technology";

    // Fetch latest features
    const featRes = await pool.query(
      `SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
      [sym]
    );
    const feat = featRes.rows[0];

    // Fetch latest factors
    const factRes = await pool.query(
      `SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
      [sym]
    );
    const fact = factRes.rows[0];

    if (!feat || !fact) {
      console.warn(`  ⚠️ Missing feature/factor snapshots for ${sym}. Skipping.`);
      continue;
    }

    // Convert database formats
    const cleanFeat = {
      symbol: feat.symbol,
      tradeDate: feat.trade_date instanceof Date ? feat.trade_date.toISOString().split("T")[0] : feat.trade_date,
      rsi: feat.rsi !== null ? Number(feat.rsi) : null,
      macd: feat.macd !== null ? Number(feat.macd) : null,
      macdSignal: feat.macd_signal !== null ? Number(feat.macd_signal) : null,
      macdHistogram: feat.macd_histogram !== null ? Number(feat.macd_histogram) : null,
      adx: feat.adx !== null ? Number(feat.adx) : null,
      atr: feat.atr !== null ? Number(feat.atr) : null,
      bollingerWidth: feat.bollinger_width !== null ? Number(feat.bollinger_width) : null,
      momentum: feat.momentum !== null ? Number(feat.momentum) : null,
      volatility: feat.volatility !== null ? Number(feat.volatility) : null,
      relativeStrength: feat.relative_strength !== null ? Number(feat.relative_strength) : null,
      movingAverageDistance: feat.moving_average_distance !== null ? Number(feat.moving_average_distance) : null,
      trendStrength: feat.trend_strength !== null ? Number(feat.trend_strength) : null
    };

    const cleanFact = {
      symbol: fact.symbol,
      tradeDate: fact.trade_date instanceof Date ? fact.trade_date.toISOString().split("T")[0] : fact.trade_date,
      qualityFactor: Number(fact.quality_factor),
      valueFactor: Number(fact.value_factor),
      growthFactor: Number(fact.growth_factor),
      momentumFactor: Number(fact.momentum_factor),
      riskFactor: Number(fact.risk_factor),
      sectorStrengthFactor: Number(fact.sector_strength_factor),
      factorScore: Number(fact.factor_score),
      explanations: typeof fact.explanations === "string" ? JSON.parse(fact.explanations) : fact.explanations
    };

    const insight = insightEngine.generateInsight(sym, cleanFeat, cleanFact);
    const companyOutlook = companyIntelligenceEngine.generateReport(sym, cleanFeat, cleanFact);
    const sectorOutlook = await sectorIntelligenceEngine.generateSectorReport(sector);
    const narrative = narrativeEngine.generateNarrative(sym, cleanFeat, cleanFact, insight);

    const executionTime = Date.now() - t0;

    const response = {
      symbol: sym,
      tradeDate: cleanFact.tradeDate,
      insight,
      companyOutlook,
      sectorOutlook,
      narrative
    };

    executionReport.push({
      request: `/api/intelligence/company/${sym}`,
      "engine executed": [
        "InsightEngine",
        "CompanyIntelligenceEngine",
        "SectorIntelligenceEngine",
        "NarrativeEngine"
      ],
      "execution time": executionTime,
      "response generated": response
    });
  }

  const outputPath = join(process.cwd(), "LIVE_INTELLIGENCE_EXECUTION_REPORT.json");
  writeFileSync(outputPath, JSON.stringify(executionReport, null, 2), "utf-8");
  console.log(`✓ Execution report written to ${outputPath}`);
  await pool.end();
}

main().catch(err => {
  console.error("Failed to run execution report:", err);
  process.exit(1);
});
