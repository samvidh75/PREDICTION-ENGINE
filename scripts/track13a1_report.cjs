/**
 * TRACK-13A.1 — PostgreSQL Environment Recovery
 * Generates 5 reports under reports/track-13a1/
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'reports', 'track-13a1');
fs.mkdirSync(dir, { recursive: true });
const d = new Date().toISOString().split('T')[0];

// ═══════════════════════════════════════════════
// 1. EnvironmentAudit.md
// ═══════════════════════════════════════════════
let e1 = `# Environment Audit — TRACK-13A.1\n\n**Date:** ${d}\n\n`;
e1 += `## Current State\n\n`;
e1 += `| Component | Status |\n| --- | --- |\n`;
e1 += `| PostgreSQL (local service) | ❌ Not installed / not running — Windows service 'postgresql*' not found |\n`;
e1 += `| PostgreSQL (pg_ctl) | ❌ Not in PATH |\n`;
e1 += `| Docker Desktop | ❌ Not installed — 'docker' not in PATH |\n`;
e1 += `| Docker Engine (WSL2 backend) | ❌ Unknown — Docker not available |\n`;
e1 += `| .env file | ✅ Present at PREDICTION-ENGINE/.env |\n`;
e1 += `| DATABASE_URL in .env | \`postgresql://postgres:postgres@localhost:5432/stockstory\` — confirms local-only configuration |\n`;
e1 += `| Node.js | ✅ v24.16.0 — installed |\n`;
e1 += `| npm | ✅ Available |\n`;
e1 += `| Project directory | ✅ c:\\Users\\Samvidh\\OneDrive\\Desktop\\STOCKSTORY\\PREDICTION-ENGINE |\n\n`;

e1 += `## How PostgreSQL Was Intended to Run\n\n`;
e1 += `The project supports **two deployment modes**:\n\n`;
e1 += `### Mode A: Docker Compose (Development/Production)\n`;
e1 += `\`docker-compose.yml\` defines a full stack:\n`;
e1 += `- \`postgres\` service: \`postgres:16-alpine\` image, port 5432, health check \`pg_isready\`\n`;
e1 += `- \`redis\` service: \`redis:7-alpine\` image\n`;
e1 += `- \`api\` service: Fastify backend on port 4001\n`;
e1 += `- \`web\` service: Nginx serving SPA on ports 80/443\n`;
e1 += `- Database name: \`stockstory\`, user: \`postgres\`, password: from env \`POSTGRES_PASSWORD\`\n\n`;
e1 += `### Mode B: Render.com (Production)\n`;
e1 += `\`render.yaml\` defines deployment to Render with:\n`;
e1 += `- Web service \`stockstory-api\` (Fastify backend)\n`;
e1 += `- Worker \`stockstory-migrate\` (one-off migration runner)\n`;
e1 += `- \`DATABASE_URL\` sync: false — manual Neon PostgreSQL connection string expected\n`;
e1 += `- Region: singapore (closest to India)\n\n`;
e1 += `### Mode C: Local PostgreSQL (Current .env Target)\n`;
e1 += `The \`.env\` file specifies \`localhost:5432\` — expecting a direct installation of PostgreSQL, **not** Docker.\n`;
e1 += `This is the mode the project was originally configured for in development.\n\n`;

e1 += `## Environment Verdict\n\n`;
e1 += `**BLOCKER:** No PostgreSQL instance is running or configured.\n\n`;
e1 += `Three recovery paths exist:\n`;
e1 += `1. **Install PostgreSQL for Windows** (recommended — matches existing .env)\n`;
e1 += `2. **Install Docker Desktop + run docker-compose.yml**\n`;
e1 += `3. **Connect to remote PostgreSQL** (would need render.yaml or Neon)\n`;

fs.writeFileSync(path.join(dir, 'EnvironmentAudit.md'), e1, 'utf8');
console.log('1/5 EnvironmentAudit.md');

// ═══════════════════════════════════════════════
// 2. DatabaseBootstrap.md
// ═══════════════════════════════════════════════
let e2 = `# Database Bootstrap — TRACK-13A.1\n\n**Date:** ${d}\n\n`;
e2 += `## Bootstrap Options\n\n`;
e2 += `### Option 1: Docker Compose (Simplest if Docker is available)\n\n`;
e2 += `\`\`\`powershell\n`;
e2 += `cd PREDICTION-ENGINE\n`;
e2 += `docker compose up -d postgres\n`;
e2 += `# Wait for healthy (pg_isready)\n`;
e2 += `# PostgreSQL available on localhost:5432 with database 'stockstory'\n`;
e2 += `\`\`\`\n\n`;
e2 += `**Pros:** Zero configuration, matches docker-compose.yml exactly, persistent volume\n`;
e2 += `**Cons:** Requires Docker Desktop installation (~10 min)\n\n`;
e2 += `### Option 2: Local PostgreSQL Installation\n\n`;
e2 += `1. Download PostgreSQL 16 from https://www.postgresql.org/download/windows/\n`;
e2 += `2. Install with:\n`;
e2 += `   - Port: 5432\n`;
e2 += `   - Superuser: postgres\n`;
e2 += `   - Password: postgres (matches .env)\n`;
e2 += `3. Create database:\n\`\`\`\npsql -U postgres -c "CREATE DATABASE stockstory;"\n\`\`\`\n\n`;
e2 += `**Pros:** Native Windows, no container overhead\n`;
e2 += `**Cons:** Manual installation, service management\n\n`;

e2 += `## Post-Connection: Migrations\n\n`;
e2 += `Once PostgreSQL is running and accessible at localhost:5432:\n\n`;
e2 += `\`\`\`powershell\n`;
e2 += `$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockstory"\n`;
e2 += `cd PREDICTION-ENGINE\n`;
e2 += `npm run migrate\n`;
e2 += `\`\`\`\n\n`;
e2 += `This executes \`src/db/migrate.ts\` which reads ALL .sql files from \`src/db/migrations/\` in order:\n`;
e2 += `1. \`001_create_warehouse_tables.sql\` — symbols, daily_prices, financial_snapshots\n`;
e2 += `2. \`002_create_feature_factor_tables.sql\` — feature_snapshots, factor_snapshots\n`;
e2 += `3. \`002b_create_user_profiles.sql\` — user_profiles\n`;
e2 += `4. \`003_create_investor_state.sql\` — investor_state\n`;
e2 += `5. \`004_create_company_intelligence_tables.sql\` — shareholding_patterns, valuation_snapshots, corporate_timeline\n`;
e2 += `6. \`005_add_stockstory_financial_columns.sql\` — ALTER financial_snapshots ADD roe, roic, etc.\n`;
e2 += `7. \`006_add_roa_column.sql\` — ALTER financial_snapshots ADD roa (TRACK-12)\n\n`;
e2 += `All migrations use \`CREATE TABLE IF NOT EXISTS\` and \`ADD COLUMN IF NOT EXISTS\` — idempotent and safe to re-run.\n\n`;

e2 += `## Data Population\n\n`;
e2 += `After migrations, the database is **structurally ready** but **empty**.\n`;
e2 += `To populate data for TRACK-13A/13/14, the following must occur:\n`;
e2 += `1. \`symbols\` table — must contain the Indian market universe (NIFTY 50/Next 50/Midcap 100)\n`;
e2 += `2. \`financial_snapshots\` — must have latest quarter-end data per symbol\n`;
e2 += `3. \`feature_snapshots\` — must have computed RSI, MACD, ADX, ATR, etc.\n`;
e2 += `4. \`factor_snapshots\` — must have computed quality_factor, growth_factor, etc.\n\n`;
e2 += `### Data Sources\n`;
e2 += `The system uses ProviderCoordinator which chains:\n`;
e2 += `- UpstoxFundamentalsProvider (Tier 1) → financial ratios\n`;
e2 += `- ScreenerProvider (Tier 2) → growth/margin data\n`;
e2 += `- YahooProvider (Tier 3) → price history, metadata\n`;
e2 += `- FinnhubProvider (Tier 4) → fallback financials\n\n`;
e2 += `### Backfill\n`;
e2 += `There is a \`backfill_jobs\` and \`backfill_chunks\` table in the schema but no automated backfill script was found in \`package.json\` scripts.\n`;
e2 += `Data population appears to be event-driven through the API route \`/api/stockstory/:symbol\` which populates on-demand.\n`;

fs.writeFileSync(path.join(dir, 'DatabaseBootstrap.md'), e2, 'utf8');
console.log('2/5 DatabaseBootstrap.md');

// ═══════════════════════════════════════════════
// 3. SchemaInventory.md
// ═══════════════════════════════════════════════
let e3 = `# Schema Inventory — TRACK-13A.1\n\n**Date:** ${d}\n\n`;
e3 += `## Core Tables Required for TRACK Calibration\n\n`;

const tables = [
  {
    name: 'symbols',
    migration: '001_create_warehouse_tables.sql',
    pk: 'id (SERIAL), symbol (UNIQUE VARCHAR(20))',
    keyCols: 'symbol, exchange, isin, company_name, sector, industry, listing_status',
    purpose: 'Master universe of Indian stocks. Source of truth for all symbol lookups.'
  },
  {
    name: 'financial_snapshots',
    migration: '001 + 005 + 006',
    pk: '(symbol, period_end)',
    keyCols: 'pe_ratio, pb_ratio, eps, dividend_yield, beta, free_float, market_cap, fcf_yield, ev_ebitda, roa, roe, roic, debt_to_equity, current_ratio, revenue_growth, profit_growth, eps_growth, fcf_growth, gross_margin, operating_margin',
    purpose: 'Per-period fundamental data. One row per symbol per quarter-end.'
  },
  {
    name: 'feature_snapshots',
    migration: '002_create_feature_factor_tables.sql',
    pk: '(symbol, trade_date)',
    keyCols: 'rsi, macd, macd_signal, macd_histogram, adx, atr, bollinger_width, momentum, volatility, relative_strength, moving_average_distance, trend_strength',
    purpose: 'Technical indicators computed daily. Input to MomentumEngine.'
  },
  {
    name: 'factor_snapshots',
    migration: '002_create_feature_factor_tables.sql',
    pk: '(symbol, trade_date)',
    keyCols: 'quality_factor, value_factor, growth_factor, momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations (JSONB)',
    purpose: 'Composite factor scores. These ARE the engine output scores. Core to all calibration audits.'
  },
  {
    name: 'daily_prices',
    migration: '001_create_warehouse_tables.sql',
    pk: '(symbol, trade_date)',
    keyCols: 'open, high, low, close, adjusted_close, volume',
    purpose: 'OHLCV data. Source for technical indicator computation.'
  },
];

for (const t of tables) {
  e3 += `### ${t.name}\n\n`;
  e3 += `| Property | Value |\n| --- | --- |\n`;
  e3 += `| Migration | ${t.migration} |\n`;
  e3 += `| Primary Key | ${t.pk} |\n`;
  e3 += `| Foreign Key | REFERENCES symbols(symbol) ON DELETE CASCADE |\n`;
  e3 += `| Key Columns | ${t.keyCols} |\n`;
  e3 += `| Purpose | ${t.purpose} |\n\n`;
}

e3 += `## Supporting Tables\n\n`;
e3 += `| Table | Migration | Purpose |\n| --- | --- | --- |\n`;
e3 += `| user_profiles | 002b | Firebase Auth user profiles |\n`;
e3 += `| investor_state | 003 | User watchlists, alerts, memory |\n`;
e3 += `| shareholding_patterns | 004 | Quarterly promoter/FII/DII/public holdings |\n`;
e3 += `| valuation_snapshots | 004 | Periodic PE/PB/EV_EBITDA ratings |\n`;
e3 += `| corporate_timeline | 004 | Corporate events (Results, Dividends, M&A) |\n`;
e3 += `| news_articles | 001 | RSS/news article storage |\n`;
e3 += `| provider_logs | 001 | API call logging for cost tracking |\n`;
e3 += `| backfill_jobs | 001 | Backfill job tracking metadata |\n`;
e3 += `| backfill_chunks | 001 | Backfill chunk execution state |\n\n`;

e3 += `## TRACK-13/14 Minimum Required Tables\n\n`;
e3 += `| Table | Required | Reason |\n| --- | --- | --- |\n`;
e3 += `| symbols | ✅ CRITICAL | Universe definition, sector classification |\n`;
e3 += `| financial_snapshots | ✅ CRITICAL | ROE, ROA, ROIC, D/E, revenue_growth, profit_growth, op_margin, market_cap |\n`;
e3 += `| factor_snapshots | ✅ CRITICAL | quality_factor, growth_factor, value_factor, momentum_factor, risk_factor — the engine output scores |\n`;
e3 += `| feature_snapshots | ✅ REQUIRED | RSI, ADX, momentum, trend_strength — technical validation |\n`;
e3 += `| daily_prices | ⚠️ OPTIONAL | Not directly used by TRACK audits; used for technical indicator computation |\n`;

fs.writeFileSync(path.join(dir, 'SchemaInventory.md'), e3, 'utf8');
console.log('3/5 SchemaInventory.md');

// ═══════════════════════════════════════════════
// 4. ExecutionPlan.md
// ═══════════════════════════════════════════════
let e4 = `# Execution Plan — TRACK-13A.1\n\n**Date:** ${d}\n\n`;
e4 += `## Recovery Path (Step by Step)\n\n`;
e4 += `### Phase 1: Get PostgreSQL Running\n\n`;
e4 += `**Recommended Path: Install PostgreSQL for Windows**\n\n`;
e4 += `1. Download PostgreSQL 16 from https://www.enterprisedb.com/downloads/postgres-postgresql-downloads\n`;
e4 += `2. Install with:\n`;
e4 += `   - Installation Directory: default (C:\\Program Files\\PostgreSQL\\16)\n`;
e4 += `   - Port: 5432\n`;
e4 += `   - Superuser password: postgres\n`;
e4 += `   - Locale: default\n`;
e4 += `3. After installation, add to PATH:\n`;
e4 += `   \`C:\\Program Files\\PostgreSQL\\16\\bin\`\n`;
e4 += `4. Create the stockstory database:\n`;
e4 += `\`\`\`\npsql -U postgres -c "CREATE DATABASE stockstory;"\n\`\`\`\n`;
e4 += `5. Verify:\n`;
e4 += `\`\`\`\npsql -U postgres -d stockstory -c "SELECT 1;"\n\`\`\`\n`;
e4 += `Estimated time: 15-20 minutes\n\n`;
e4 += `### Phase 2: Run Migrations\n\n`;
e4 += `\`\`\`powershell\n`;
e4 += `$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockstory"\n`;
e4 += `cd PREDICTION-ENGINE\n`;
e4 += `npm run migrate\n`;
e4 += `\`\`\`\n`;
e4 += `This creates all 7 migrations. Expected output:\n`;
e4 += `\`\`\`\n`;
e4 += `Starting warehouse migrations...\n`;
e4 += `Running migration: 001_create_warehouse_tables.sql...\n`;
e4 += `Completed migration: 001_create_warehouse_tables.sql\n`;
e4 += `... (6 more)\n`;
e4 += `All migrations completed successfully.\n`;
e4 += `\`\`\`\n`;
e4 += `Estimated time: < 1 minute\n\n`;
e4 += `### Phase 3: Populate symbols Table\n\n`;
e4 += `The symbols table requires the Indian market universe. This is seeded into the production database via:\n`;
e4 += `1. **ProviderCoordinator + MasterCompanyRegistry** — The system has a hardcoded registry of verified Indian companies in \`src/services/data/MasterCompanyRegistry.ts\`\n`;
e4 += `2. The \`generate500Stocks()\` function in \`src/services/stocks/generate500Stocks.ts\` produces 500+ verified symbols\n`;
e4 += `3. These are consumed by the API when symbols are queried\n\n`;
e4 += `**For a fresh database:** The symbols would need to be inserted. No automated seed script exists in \`package.json\`.\n`;
e4 += `The \`calibrate.ts\` script (which previously ran successfully and produced \`EngineCalibrationReport.md\`) queries symbols from the database, confirming that the database WAS populated at some point.\n\n`;
e4 += `### Phase 4: Populate Snapshot Data\n\n`;
e4 += `This is the critical phase. The database was previously populated with:\n`;
e4 += `- financial_snapshots: via ProviderCoordinator → UpstoxFundamentalsProvider + ScreenerProvider\n`;
e4 += `- feature_snapshots: via TechnicalIndicatorEngine computing from daily_prices\n`;
e4 += `- factor_snapshots: via FactorEngine processing features + financials\n\n`;
e4 += `**Evidence the database was populated:** \`calibrate.ts\` successfully queried and evaluated stocks against the StockStory engine, producing \`EngineCalibrationReport.md\`.\n\n`;
e4 += `**If the database IS still populated** (PostgreSQL was just stopped, not destroyed):\n`;
e4 += `- Starting PostgreSQL will restore all data\n`;
e4 += `- TRACK-13A/13/14 can execute immediately\n`;
e4 += `- Data location: default PostgreSQL data directory (C:\\Program Files\\PostgreSQL\\16\\data or similar)\n\n`;
e4 += `**If the database WAS destroyed:**\n`;
e4 += `- Re-population requires running the full pipeline:\n`;
e4 += `  1. Insert symbols from MasterCompanyRegistry\n`;
e4 += `  2. Run ProviderCoordinator.getFinancials() for each symbol\n`;
e4 += `  3. Run TechnicalIndicatorEngine.compute() for each symbol\n`;
e4 += `  4. Run FactorEngine.compute() for each symbol\n`;
e4 += `- This requires Upstox API credentials (present in .env) and Screener.in access\n`;
e4 += `- Estimated time: Hours to days depending on rate limits and symbol count\n\n`;
e4 += `### Phase 5: Run TRACK Audits\n\n`;
e4 += `Once Phase 1-2 are done (and Phase 3-4 if DB is fresh):\n\`\`\`powershell\n`;
e4 += `$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockstory"\n`;
e4 += `node scripts/track13a_audit.cjs   # Database readiness\n`;
e4 += `node scripts/track13_calibration_audit.cjs  # Calibration audit\n`;
e4 += `node scripts/track14_audit.cjs   # Ground truth validation\n`;
e4 += `\`\`\`\n\n`;
e4 += `### Phase 6: Reports\n\n`;
e4 += `All reports auto-generated to:\n`;
e4 += `- \`reports/track-13a/\` (7 files)\n`;
e4 += `- \`reports/track-13/\` (7 files)\n`;
e4 += `- \`reports/track-14/\` (7 files)\n\n`;
e4 += `## Estimated Total Recovery Time\n\n`;
e4 += `| Scenario | Time |\n| --- | --- |\n`;
e4 += `| PostgreSQL installed, data intact | **5 minutes** |\n`;
e4 += `| PostgreSQL installed, data lost | **2-8 hours** (depends on API rate limits) |\n`;
e4 += `| Fresh PostgreSQL installation | **30 minutes** (install) + data population |\n`;

fs.writeFileSync(path.join(dir, 'ExecutionPlan.md'), e4, 'utf8');
console.log('4/5 ExecutionPlan.md');

// ═══════════════════════════════════════════════
// 5. FinalVerdict.md
// ═══════════════════════════════════════════════
let e5 = `# Final Verdict — TRACK-13A.1\n\n**Date:** ${d}\n\n`;
e5 += `## Environment Recovery Status\n\n`;
e5 += `| Question | Answer |\n| --- | --- |\n`;
e5 += `| How was PostgreSQL intended to run? | **Local installation** (per .env DATABASE_URL=localhost:5432). Docker compose also supported. Render for production. |\n`;
e5 += `| Is Docker supported? | **Yes** — docker-compose.yml defines postgres:16-alpine service with persistent volume |\n`;
e5 += `| Can a fresh database be created automatically? | **Yes** — \`npm run migrate\` creates all 15 tables with idempotent CREATE IF NOT EXISTS |\n`;
e5 += `| Which migrations must run? | All 7 from src/db/migrations/ in order (001 → 002 → 002b → 003 → 004 → 005 → 006) |\n`;
e5 += `| Which seed scripts must run? | **None automated.** Symbols come from MasterCompanyRegistry (hardcoded). Snapshots from ProviderCoordinator API calls. |\n`;
e5 += `| Which snapshot-generation jobs must run? | Financial snapshots from UpstoxFundamentalsProvider + ScreenerProvider. Features from TechnicalIndicatorEngine. Factors from FactorEngine. All triggered through API or manual runs. |\n`;
e5 += `| Estimated time to full reconstruction? | **5 min** if data intact. **2-8 hours** if fresh DB requiring API-based data population. |\n\n`;

e5 += `## Key Finding\n\n`;
e5 += `The database was previously populated and functional — \`calibrate.ts\` produced \`EngineCalibrationReport.md\` from live database queries.\n`;
e5 += `The \`symbols\` table had verified Indian stocks with financial_snapshots, feature_snapshots, and factor_snapshots.\n\n`;
e5 += `The PostgreSQL Windows service is no longer registered but **the data directory likely still exists** at the default PostgreSQL location.\n\n`;

e5 += `## Recommended Action\n\n`;
e5 += `### If PostgreSQL was previously installed:\n`;
e5 += `1. Reinstall PostgreSQL 16 (Windows installer)\n`;
e5 += `2. During installation, point to existing data directory if prompted\n`;
e5 += `3. Start PostgreSQL service via Services app (services.msc) or PostgreSQL pgAdmin\n`;
e5 += `4. Data will be restored automatically\n`;
e5 += `5. Run TRACK-13A to verify row counts\n\n`;
e5 += `### If this is a fresh machine:\n`;
e5 += `1. Install Docker Desktop\n`;
e5 += `2. \`cd PREDICTION-ENGINE && docker compose up -d postgres\`\n`;
e5 += `3. \`npm run migrate\`\n`;
e5 += `4. Manually seed symbols + run provider backfill\n\n`;

e5 += `## TRACK-13/14 Readiness\n\n`;
e5 += `| Condition | Status |\n| --- | --- |\n`;
e5 += `| Audit scripts written | ✅ TRACK-13A (7 reports), TRACK-13 (7 reports), TRACK-14 (7 reports) |\n`;
e5 += `| Database schema complete | ✅ All 7 migrations defined, including TRACK-12 ROA column |\n`;
e5 += `| Database running | ❌ PostgreSQL service not found / not running |\n`;
e5 += `| Data populated | ⚠️ Unknown — depends on whether data directory survived |\n`;
e5 += `| Execution blocker | PostgreSQL installation or service start |\n\n`;

e5 += `**Next step:** Install or start PostgreSQL, then run \`node scripts/track13a_audit.cjs\` to assess data readiness.\n`;

fs.writeFileSync(path.join(dir, 'FinalVerdict.md'), e5, 'utf8');
console.log('5/5 FinalVerdict.md');
console.log(`\nAll reports written to ${dir}`);
