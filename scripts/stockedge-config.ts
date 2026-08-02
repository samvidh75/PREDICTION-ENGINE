import { config as loadDotEnv } from "dotenv";
import { summarizeStockEdgeConfig } from "../src/backend/integrations/stockedge/StockEdgeConfig";

loadDotEnv({ path: ".env", quiet: true });

const summary = summarizeStockEdgeConfig();

console.log("=== StockEdge Config ===");
console.log(JSON.stringify(summary, null, 2));
