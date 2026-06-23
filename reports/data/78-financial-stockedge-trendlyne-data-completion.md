# Financial Data Pipeline, StockEdge, Trendlyne — Data Completion

## Baseline Commit
`dbf225a92`

## Railway Result
✅ Green — backend serving on port 8080, all 26 migrations applied, Firebase OK

## Vercel Result
✅ Green — `https://www.stockstory-india.com`

## Financial Series Result
All 7 financial histogram metrics now have **real 7-year annual data** for RELIANCE via IndianAPI `/stock` endpoint:

| Metric | Source | Years | Valid |
|--------|--------|-------|-------|
| Revenue | IndianAPI `/stock` → INC.TotalRevenue | FY20-FY26 | 7/7 |
| PAT / Net Profit | IndianAPI → INC.NetIncome / INC.IncomeAvailabletoComExclExtraOrd | FY20-FY26 | 7/7 |
| EBITDA | Derived (OperatingIncome + Depreciation) | FY20-FY26 | 7/7 |
| Operating Profit | IndianAPI → INC.OperatingIncome | FY20-FY26 | 7/7 |
| EPS | IndianAPI → INC.DilutedNormalizedEPS | FY20-FY26 | 7/7 |
| Operating Margin | Derived (OperatingIncome / Revenue) | FY20-FY26 | 7/7 |
| Net Margin | Derived (NetIncome / Revenue) | FY20-FY26 | 7/7 |

## Financial Ingestion Result
- **Not needed** — data is fetched live from IndianAPI at request time with 12-hour server-side cache
- No DB persistence required — the `/stock` endpoint returns 16 financial periods (7 annual + 9 interim)
- `FinancialSeriesMapper.ts` extracts and derives all 7 metrics
- No fake FY periods, no 0-filled missing values, no NaN/Infinity

## Stock Detail Histogram Result
- Frontend fetches `GET /api/financial-series/:symbol` alongside research and news data
- FinancialHistogram receives real `FinancialSeries[]` with 7 metrics × 7 years
- If data exists, bars render correctly
- If not, compact empty state shown
- No fake bars, no 0-filled, no NaN/null/undefined in rendered output

## StockEdge Config Result (Railway)
- `STOCKEDGE_ENABLED=true`, credentials configured
- Login strategy: `http_form`
- Error: `STOCKEDGE_DISCOVERY_REQUIRED`

## StockEdge Login Result (Railway)
- `STOCKEDGE_DISCOVERY_REQUIRED` — the HTTP form login endpoint is not explicitly configured
- `STOCKEDGE_PLAYWRIGHT_ENABLED=true` is set but Playwright is no longer auto-fallback (removed in Part CT)
- Playwright login is job-only/smoke-only

## StockEdge Discovery Result
Cannot proceed without a valid session (circular dependency). No endpoints discovered.

## StockEdge Extraction Result
Cannot proceed without discovery.

**Exact Blocker:** `STOCKEDGE_DISCOVERY_REQUIRED` — the actual StockEdge login form endpoint is unknown. The guessed `/api/login` endpoint was removed in Part CT. To resolve:
1. Set `STOCKEDGE_LOGIN_FORM_ACTION` to the actual login POST endpoint
2. Or run Playwright-based endpoint discovery in an environment with Playwright browsers
3. Or set `STOCKEDGE_SESSION_COOKIE` with a manually-obtained session cookie

## Trendlyne Config Result
- `TRENDLYNE_ENABLED=false` (not set in any environment)
- Widget mode: `script` (default)
- Embed allowed: `false`

## Trendlyne Smoke Result
- Status: `TRENDLYNE_DISABLED`
- No Trendlyne env vars configured on Railway
- TrendlyneWidget component exists with lazy-loading but is not connected to stock detail page

**Exact Blocker:** No Trendlyne environment variables configured. To activate:
1. Set `TRENDLYNE_ENABLED=true` and `TRENDLYNE_EMBED_ALLOWED=true`
2. Widget UI component already exists and loads from Trendlyne CDN
3. No API key required for public embed widgets

## Scanner Data-Depth Result
- Scanner presets exist (Quality Compounders, etc.)
- Scanner returns real factor-based data from backend scoring engine
- 29 symbols covered in financial_snapshots
- No fake scan results
- Premium gating works (free: 3 rows gated)

## Healthometer Smoke Result
```
RELIANCE: PASS — Score: 59, Dimensions: 7 (7 valid)
ITC: PASS — Score: 53, Dimensions: 7 (7 valid)
TCS: PASS — Score: 52, Dimensions: 7 (7 valid)
INFY: PASS — Score: 47, Dimensions: 7 (7 valid)
HDFCBANK: PASS — Score: 67, Dimensions: 7 (7 valid)
```
All 5 symbols pass: finite scores, 0-100 dimensions, no NaN/null/undefined.

## News Result
- `GET /api/news/:symbol` returns real Google News RSS data
- 12-hour server-side cache
- Returns 15 real items for RELIANCE
- No fake news

## Production Smoke Result
- Homepage: HTTP 200
- Health: HTTP 200
- Plans: HTTP 200
- Research RELIANCE: HTTP 200
- Research ITC: HTTP 200
- StockStory RELIANCE: HTTP 200
- StockStory ITC: HTTP 200
- FinancialSeries RELIANCE: HTTP 200 — 7 metrics populated
- News RELIANCE: HTTP 200

## Tests Result
- `npm run typecheck:all` — PASS
- `npm run lint` — PASS
- `npm run test:unit` — **1542 passed**
- `npm run build:frontend` — PASS
- `npm run build:backend` — PASS
- `npm run validate:hygiene` — PASS

## E2E Result
**50 passed, 0 failed**

## Remaining Blockers
1. **StockEdge:** `STOCKEDGE_DISCOVERY_REQUIRED` — needs login endpoint configuration or Playwright discovery
2. **Trendlyne:** `TRENDLYNE_DISABLED` — needs env vars to activate
3. **IndianAPI `/stock_fundamentals` endpoint:** Not available on current plan — only `/stock` endpoint works
4. **Financial data for non-RELIANCE/ITC symbols:** Needs to be verified (other symbols may have different data availability from IndianAPI)

## Confirmations
- ✅ No fake data added
- ✅ No secrets committed
- ✅ No cookies committed
- ✅ No raw provider payloads committed
- ✅ No fake broker integrations
- ✅ No DNS changes
- ✅ No Buy/Sell/Hold labels
- ✅ No price targets
