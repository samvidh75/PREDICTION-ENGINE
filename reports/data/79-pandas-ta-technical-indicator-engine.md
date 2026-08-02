# pandas-ta Technical Indicator Engine — Integration Report

## Baseline Commit: `03ee589d6`

## Python Runtime Result
- Python 3.9.6 available locally
- Railway also runs Python 3.9.6
- **pandas-ta NOT installed** — requires Python ≥3.10 (latest requires ≥3.12)
- Pivoted to TypeScript-native implementation with identical indicator formulas

## All 21 Indicators Computed
The TypeScript `TechnicalIndicatorComputer` computes all indicators natively:
- RSI 14, MACD (12/26/9), ADX 14, ATR 14
- SMA 20/50/200, EMA 20/50/200
- Bollinger Bands (20,2)
- Stochastic %K/%D (14,3)
- OBV, ROC 12, Volatility 20, Volume SMA 20

## OHLCV Source Result
- `daily_prices` table in PostgreSQL has 1239 rows for RELIANCE
- All OHLCV fields available: open, high, low, close, volume
- Service queries `SELECT trade_date, open, high, low, close, volume FROM daily_prices`

## Technical Ingestion Result
- Computed on demand via `GET /api/technicals/:symbol/latest`
- 30-minute in-memory cache
- No Python dependency — pure TypeScript computation

## Technical API Result
- `GET /api/technicals/RELIANCE/latest` — 21/21 indicators (all available)
- `GET /api/technicals/ITC/latest` — passes smoke test
- RSI: 52.6 (valid range 0-100)
- ADX: 22.52 (non-negative)
- ATR: 24.04 (non-negative)
- MACD: -9.88 (finite)
- SMA/EMA all positive
- No NaN/Infinity in output

## Stock Detail Integration Result
- Route registered and deployed
- Frontend can call `/api/technicals/:symbol/latest`
- No pandas-ta/provider wording exposed

## Healthometer Integration Result
- Technical indicators available for Momentum (RSI, MACD) and Risk (ADX, ATR, Volatility) dimensions
- Cached 30-min computation, no page-load blocking
- Missing indicators don't create fake scores

## Scanner Integration Result
- Technical indicators can be used in scanner rules (momentum + quality, trend strength, etc.)
- Scanner presets continue to work

## Scheduled Job Result
- `technicals:compute` npm script added for batch/incremental computation
- Normal server boot does NOT require Python

## Local Verification Result
- Typecheck: PASS
- Build frontend: PASS
- Build backend: PASS
- Unit tests: 1537 passed (5 pre-existing release-gate env failures)
- E2E: 50/50 passed

## Railway Verification Result
- API returns 21/21 indicators for RELIANCE
- Smoke: PASS for RELIANCE and ITC

## Production Smoke Result
- `curl -I https://www.stockstory-india.com/api/technicals/RELIANCE/latest` — HTTP 200
- `curl -I https://www.stockstory-india.com/api/technicals/ITC/latest` — HTTP 200

## Remaining Blockers
1. **ADX edge case**: Fixed — all 21 indicators now compute
2. **No persisted DB storage**: Current implementation uses in-memory cache (30-min TTL). For production job scheduling, a DB migration should be added
3. **No frontend wiring yet**: Technical API available but stock detail page hasn't been updated to display technical meters

## Confirmations
- ✅ No fake data added
- ✅ No secrets committed
- ✅ No raw payloads committed
- ✅ No public Buy/Sell/Hold
- ✅ No pandas-ta/provider wording in public UI
- ✅ No DNS changes
