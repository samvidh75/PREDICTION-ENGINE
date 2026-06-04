import { ProviderCoordinator } from "../services/providers/ProviderCoordinator.js";
import pool from "../db/index.js";

async function run() {
  const coordinator = new ProviderCoordinator();
  try {
    console.log("Testing db pool query...");
    const dbRes = await pool.query("SELECT NOW()");
    console.log("DB Success! Time:", dbRes.rows[0]);

    console.log("Fetching metadata for RELIANCE...");
    const meta = await coordinator.getMetadata("RELIANCE");
    console.log("Success! Meta:", meta);

    console.log("Inserting metadata into symbols table...");
    await pool.query(
      `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (symbol) DO UPDATE SET company_name=$3, sector=$4, industry=$5, updated_at=NOW()`,
      ["RELIANCE", meta.exchange || "NSE", meta.companyName || "RELIANCE", meta.sector || "", meta.industry || "", "ACTIVE"]
    );
    console.log("Insert success!");
  } catch (err: any) {
    console.error("Failed:", err);
    if (err.stack) console.error(err.stack);
  } finally {
    await pool.end();
  }
}

run();
