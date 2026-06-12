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
