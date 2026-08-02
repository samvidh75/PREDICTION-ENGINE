# Data Providers

## existing-database

Source type: local application database.

Authorization status: permitted because it reads already-configured deployment data.

Expected fields: OHLCV prices from `daily_prices`; available valuation, profitability, leverage, margin, and growth fields from `financial_snapshots`; sector metadata from `master_security_registry` when present.

Rate limits: none for local reads.

Environment variables: `SQLITE_DB_PATH`, `DB_ADAPTER`, and `DATABASE_URL` use the existing database adapter.

Fallback behavior: missing data remains unavailable or partial. The F1 pipeline does not fabricate zeroes, universal neutral `50`s, sentinel values, or provider results.

Sector-relative behavior: `sector_score` is calculated only when a symbol has sector metadata and at least two distinct peer-base scores exist in that sector. Otherwise `sector_score` remains unavailable and the partial snapshot is not promoted into the immutable prediction registry.

Invalid OHLC behavior: invalid records remain preserved in `daily_prices`, may be copied into `rejected_market_records`, and are excluded from scoring by validation. Null volume is accepted when OHLC values are valid. Negative or non-finite volume is rejected.

Disable provider: do not run the pipeline scripts. Prediction apply mode requires `CONFIRM_F1_PIPELINE_APPLY=true`. Repair apply mode requires `CONFIRM_F1_REPAIR_APPLY=true`.

## Disabled External Providers

Screener.in, Moneycontrol, Google Finance, Yahoo Finance, NSE, and BSE scraping are not implemented or activated in this branch.

Automated ingestion may only be added behind a provider adapter when all of the following are confirmed:

- a documented endpoint, licensed feed, export contract, or written authorization;
- provider terms that permit the intended automated use;
- attribution requirements;
- rate limits and retry policy;
- credential storage through environment variables or a secrets manager;
- field-level lineage and freshness metadata;
- a kill switch that disables the provider without code changes.

HTML scraping, CAPTCHA bypass, browser automation, cookie reuse, and committing API keys to the repository are prohibited.

## yfinance optional bridge

Source type: Python `yfinance` library through `scripts/yfinance_bridge.py`.

Authorization status: opt-in only. yfinance is available for explicit CLI runs when a reviewer wants a secondary Yahoo-backed comparison or local enrichment path. It must not be used to scrape Yahoo Finance webpages directly. Review Yahoo's terms before any production activation.

Activation:

```bash
python3 -m pip install -r requirements-yfinance.txt
npm run ingest:fundamentals -- --provider=yfinance --symbols=RELIANCE,TCS,INFY --dry-run
python3 scripts/yfinance_bridge.py historical-batch RELIANCE.NS,TCS.NS,INFY.NS 1mo 1d
```

Guarded apply:

```bash
CONFIRM_F1_FUNDAMENTALS_APPLY=true \
npm run ingest:fundamentals -- --provider=yfinance --symbols=RELIANCE,TCS,INFY --apply
```

Bridge behavior: fundamentals come from paced per-symbol `Ticker.info` calls because those fields are retrieved per ticker. Historical-price support uses chunked `yf.download()` calls with space-separated ticker batches through the `historical-batch` bridge command. `yf.download()` receives `threads=true`, a bounded timeout, dividend/split actions, and repair mode. Empty or failed batches return explicit errors rather than invented OHLC values.

Caching and pacing controls:

- `YFINANCE_CACHE_PATH=tmp/yfinance-cache.json` sets the atomic JSON result cache.
- `YFINANCE_CACHE_SECONDS=3600` sets the cache TTL.
- `YFINANCE_REQUEST_CACHE_ENABLED=true` enables the optional `requests-cache` HTTP session when compatible with the installed yfinance runtime. The bridge automatically falls back to native yfinance sessions when the cached session is rejected.
- `YFINANCE_REQUEST_CACHE_NAME=tmp/yfinance-http-cache` sets the HTTP cache storage name.
- `YFINANCE_BATCH_SIZE=40` limits tickers per historical batch; values are bounded between `1` and `100`.
- `YFINANCE_DOWNLOAD_TIMEOUT_SECONDS=15` bounds historical-download wait time.
- `YFINANCE_MIN_DELAY_SECONDS=0.75` and `YFINANCE_MAX_DELAY_SECONDS=1.75` control randomized delays between uncached per-ticker fundamentals requests.

Normalized fields: yfinance fields map to the same internal fundamentals shape. Decimal ratios such as `returnOnEquity`, `revenueGrowth`, `earningsGrowth`, `operatingMargins`, and `profitMargins` are converted to percentages. yfinance `debtToEquity` values above `10` are treated as percentage-style values and converted to a ratio. Missing, empty, non-finite, or malformed values remain `null`.

Lineage behavior: apply mode records `source_name = yfinance` and token-free Yahoo query endpoint templates in `prediction_input_lineage`. No API keys are required, printed, or persisted for this provider.

Sector-resolution order for explicit yfinance runs:

1. Existing `master_security_registry.sector`
2. yfinance quote metadata sector
3. IndianAPI metadata sector only when `INDIANAPI_KEY` is configured
4. `null`

## F3.1B Broker-Migrated Providers

The following live adapters are routed through the quota-aware provider request broker:

- IndianAPI: quote, metadata, history.
- Upstox Fundamentals: key-ratios and balance-sheet as separate broker operations.
- Yahoo v8 chart: quote, metadata, history.
- Google News RSS: news.

Provider-local retry loops are not used by these adapters. The broker owns cache, stale-while-revalidate, negative cache, retry classification, `Retry-After`, cooldown, and quota accounting.

Missing credentials block before outbound requests for IndianAPI, and Upstox. Missing or ambiguous source data remains unavailable; adapters must not fabricate exchange, fiscal period, or OHLC candles from close-only series.

Inbound API requests are rate-limited by normalized route family so query variants share counters and client bursts cannot amplify provider calls.
