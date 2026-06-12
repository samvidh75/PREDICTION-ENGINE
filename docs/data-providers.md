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

## Finnhub fundamentals ingestion

Source type: Finnhub REST API through `src/services/providers/FinnhubProvider.ts`.

Authorization status: enabled only when a deployment/user supplies a Finnhub API key. `FINNHUB_KEY` is the preferred backend variable. `FINNHUB_API_KEY` is accepted as a compatibility alias. Secret values must be configured through the environment or deployment secrets and must never be committed.

Activation:

```bash
npm run ingest:fundamentals -- --provider=finnhub --symbols=RELIANCE,TCS,INFY --dry-run
npm run ingest:fundamentals -- --provider=finnhub --universe=nifty50 --dry-run
```

Guarded apply:

```bash
CONFIRM_F1_FUNDAMENTALS_APPLY=true \
npm run ingest:fundamentals -- --provider=finnhub --symbols=RELIANCE,TCS,INFY --apply
```

Missing-key behavior: dry-run and apply fail clearly with `Finnhub API key is required. Set FINNHUB_KEY or FINNHUB_API_KEY.` when neither key is configured.

Normalized fields: `marketCap`, `peRatio`, `pbRatio`, `eps`, `roe`, `debtToEquity`, `revenueGrowth`, `earningsGrowth`, `operatingMargin`, and `netMargin`. Missing, empty, non-finite, or malformed provider values remain `null`. The ingestion script does not replace missing values with `0`, `50`, `-250`, sentinels, or synthetic scores.

Completeness behavior: completeness is `availableFields / trackedFields`, rounded to a percentage. Snapshots at `>= 70%` are accepted for scoring review, `40%–69%` remain partial, and `< 40%` remain unavailable for full prediction generation. Fundamental ingestion never writes `prediction_registry` and never runs prediction generation automatically.

Lineage behavior: apply mode writes field-level lineage to `prediction_input_lineage` for every tracked field. Valid fields use `availability = real`; absent fields use `availability = unavailable` and `rejection_reason = provider field missing`. Source URLs use the token-free Finnhub metric endpoint template and never persist API keys.

Audit tables: apply mode writes `ingestion_runs`, `financial_snapshots`, `data_completeness_metrics`, and `prediction_input_lineage`. Sector metadata may be backfilled into `master_security_registry` only when the current sector is absent.

Sector-resolution order:

1. Existing `master_security_registry.sector`
2. Finnhub company profile sector
3. IndianAPI metadata sector only when `INDIANAPI_KEY` is configured
4. `null`

Rate-limit guidance: the CLI defaults to `--concurrency=3` and rejects values above `5`. The provider retry policy handles transient HTTP and network errors with bounded retries; one symbol failure does not abort the whole batch.

No-scraping policy: this path does not scrape Screener.in, Moneycontrol, Google Finance, Yahoo Finance webpages, NSE webpages, or BSE webpages. It does not use browser automation, cookie reuse, CAPTCHA bypass, undocumented HTML selectors, or hard-coded API keys.

IndianAPI fallback: `INDIANAPI_KEY` is optional and only used for missing sector metadata when Finnhub profile data is absent. Finnhub remains the primary fundamentals provider.

## yfinance optional bridge

Source type: Python `yfinance` library through `scripts/yfinance_bridge.py`.

Authorization status: opt-in only. Finnhub remains the primary audited fundamentals provider for F1. yfinance is available for explicit CLI runs when a reviewer wants a secondary Yahoo-backed comparison or local enrichment path. It does not require Finnhub credentials and must not be used to scrape Yahoo Finance webpages directly.

Activation:

```bash
python3 -m pip install -r requirements-yfinance.txt
npm run ingest:fundamentals -- --provider=yfinance --symbols=RELIANCE,TCS,INFY --dry-run
```

Guarded apply:

```bash
CONFIRM_F1_FUNDAMENTALS_APPLY=true \
npm run ingest:fundamentals -- --provider=yfinance --symbols=RELIANCE,TCS,INFY --apply
```

Bridge behavior: fundamentals come from paced per-symbol quote/info calls because yfinance exposes fundamentals that way. Historical price support uses `yf.download()` with a batch ticker string through the `historical-batch` bridge command, so bulk price checks can avoid looping one ticker at a time.

Caching and rate limits: the bridge uses a local JSON cache for quote/fundamental responses under `tmp/yfinance-quote-cache.json` by default. `YFINANCE_CACHE_PATH` and `YFINANCE_CACHE_SECONDS` can tune the cache location and TTL. Per-symbol quote calls sleep between symbols; batch history uses threaded `yf.download()` and should still be kept to modest batches. A `requests-cache` session is not injected because current yfinance/curl runtimes reject external cached sessions.

Normalized fields: yfinance fields map to the same internal fundamentals shape as Finnhub. Decimal ratios such as `returnOnEquity`, `revenueGrowth`, `earningsGrowth`, `operatingMargins`, and `profitMargins` are converted to percentages. yfinance `debtToEquity` values above `10` are treated as percentage-style values and converted to a ratio. Missing, empty, non-finite, or malformed values remain `null`.

Lineage behavior: apply mode records `source_name = yfinance` and token-free Yahoo query endpoint templates in `prediction_input_lineage`. No API keys are required, printed, or persisted for this provider.

Sector-resolution order for explicit yfinance runs:

1. Existing `master_security_registry.sector`
2. yfinance quote metadata sector
3. IndianAPI metadata sector only when `INDIANAPI_KEY` is configured
4. `null`

Secret handling: yfinance does not use the Finnhub secret. If Finnhub credentials are supplied, they are ignored for explicit `--provider=yfinance` runs.
