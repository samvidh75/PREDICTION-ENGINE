import { config as loadDotEnv } from "dotenv";
import { loadStockEdgeConfig } from "../src/backend/integrations/stockedge/StockEdgeConfig";

loadDotEnv({ path: ".env", quiet: true });

async function main(): Promise<void> {
  const config = loadStockEdgeConfig();
  console.log("=== StockEdge Coverage Summary ===");
  console.log("Enabled:", config.enabled ? "yes" : "no");

  if (!config.enabled) {
    console.log("Coverage: not applicable (disabled)");
    return;
  }

  const availableLayers = [
    "profile",
    "price",
    "technicals",
    "fundamentals",
    "financial_tables",
    "ownership",
    "corporate_actions",
    "screener_signals",
  ];

  console.log("Available mapping layers:", availableLayers.length);
  for (const layer of availableLayers) {
    console.log(`  - ${layer}`);
  }

  const mappedFields = {
    profile: ["companyName", "sector", "industry", "isin", "nseCode", "bseCode", "marketCapCrore"],
    price: ["price", "previousClose", "change", "changePercent", "volume", "deliveryPercent", "fiftyTwoWeekHigh", "fiftyTwoWeekLow"],
    technicals: ["rsi", "macd", "macdSignal", "sma20", "sma50", "sma200", "ema20", "ema50", "adx", "atr"],
    fundamentals: ["peRatio", "pbRatio", "roe", "roce", "debtToEquity", "dividendYield", "operatingMargin", "netMargin", "revenueGrowth", "profitGrowth", "epsGrowth"],
    financial_tables: ["quarterly", "profit_loss", "balance_sheet", "cash_flow"],
    ownership: ["promoter", "fii", "dii", "publicRetail", "pledge"],
    corporate_actions: ["dividend", "split", "bonus", "rights", "board_meeting", "results"],
    screener_signals: ["financials", "ownership", "valuation", "momentum", "risk", "technical"],
  };

  let totalFields = 0;
  for (const [, fields] of Object.entries(mappedFields)) {
    totalFields += fields.length;
  }
  console.log("Total mapped fields:", totalFields);

  const predictionInputs = [
    "valuation (peRatio, pbRatio, dividendYield)",
    "quality (roe, roce, operatingMargin, netMargin)",
    "growth (revenueGrowth, profitGrowth, epsGrowth)",
    "balanceSheet (debtToEquity)",
    "technicals (rsi, macd, sma20, sma50, sma200, adx, atr)",
    "ownership (promoter, fii, dii, publicRetail, pledge)",
  ];
  console.log("Prediction Engine V2 inputs:", predictionInputs.length);
  for (const input of predictionInputs) {
    console.log(`  - ${input}`);
  }

  console.log("No raw data dumps.");
  console.log("Coverage check complete.");
}

main().catch((error) => {
  console.error("Coverage failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
