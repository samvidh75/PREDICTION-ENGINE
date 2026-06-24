// src/scripts/run-intelligence-validation.ts
// Validation script to run the StockStory Intelligence Engine suite and generate reports.

import dotenv from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPORTS_DIR = join(__dirname, "..", "..", "reports");

import pool from "../db/index";
import { insightEngine } from "../services/InsightEngine";
import { companyIntelligenceEngine } from "../services/CompanyIntelligenceEngine";
import { sectorIntelligenceEngine } from "../services/SectorIntelligenceEngine";
import { marketIntelligenceEngine } from "../services/MarketIntelligenceEngine";
import { portfolioIntelligenceEngine } from "../services/PortfolioIntelligenceEngine";
import { narrativeEngine } from "../services/NarrativeEngine";

const VALIDATION_SYMBOLS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "HAL"];

async function main() {
  console.info("=================================================");
  console.info("    StockStory Intelligence Engine Validation    ");
  console.info("=================================================");

  const validationReport: any = {
    timestamp: new Date().toISOString(),
    snapshots: [],
    marketOutlook: null,
    portfolioOutlook: null
  };

  try {
    // 1. Fetch Market-wide Intelligence (Phase 4)
    console.info("Generating Market Intelligence...");
    const marketOutlook = await marketIntelligenceEngine.generateMarketReport();
    validationReport.marketOutlook = marketOutlook;

    // 2. Fetch Portfolio-wide Intelligence (Phase 5)
    console.info("Generating Portfolio Intelligence...");
    const mockPortfolio = VALIDATION_SYMBOLS.map(sym => ({ symbol: sym, weight: 0.20 }));
    const portfolioOutlook = await portfolioIntelligenceEngine.evaluatePortfolio(mockPortfolio);
    validationReport.portfolioOutlook = portfolioOutlook;

    // 3. Process each validation symbol
    for (const sym of VALIDATION_SYMBOLS) {
      console.info(`Processing intelligence snapshot for ${sym}...`);

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
        tradeDate: feat.trade_date.toISOString().split("T")[0],
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
        tradeDate: fact.trade_date.toISOString().split("T")[0],
        qualityFactor: Number(fact.quality_factor),
        valueFactor: Number(fact.value_factor),
        growthFactor: Number(fact.growth_factor),
        momentumFactor: Number(fact.momentum_factor),
        riskFactor: Number(fact.risk_factor),
        sectorStrengthFactor: Number(fact.sector_strength_factor),
        factorScore: Number(fact.factor_score),
        explanations: typeof fact.explanations === "string" ? JSON.parse(fact.explanations) : fact.explanations
      };

      // 4. Generate Insight (Phase 1)
      const insight = insightEngine.generateInsight(sym, cleanFeat, cleanFact);

      // 5. Generate Company Intelligence Report (Phase 2)
      const companyOutlook = companyIntelligenceEngine.generateReport(sym, cleanFeat, cleanFact);

      // 6. Generate Sector Intelligence (Phase 3)
      const sector = "Technology"; // Fallback sector
      const sectorOutlook = await sectorIntelligenceEngine.generateSectorReport(sector);

      // 7. Generate Plain-English Narratives (Phase 6)
      const narrative = narrativeEngine.generateNarrative(sym, cleanFeat, cleanFact, insight);

      // 8. Compile Intelligence Snapshot (Phase 7)
      const snapshot = {
        symbol: sym,
        tradeDate: cleanFact.tradeDate,
        insight,
        companyOutlook,
        sectorOutlook,
        narrative
      };

      validationReport.snapshots.push(snapshot);
    }

    // Write validation report
    const path = join(REPORTS_DIR, "INTELLIGENCE_VALIDATION_REPORT.json");
    writeFileSync(path, JSON.stringify(validationReport, null, 2), "utf-8");
    console.info(`\n✓ Intelligence validation completed. Report written: ${path}`);

  } catch (err: any) {
    console.error("❌ Intelligence validation failed:", err.message);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error("Fatal Intelligence validation error:", err);
  process.exit(1);
});
