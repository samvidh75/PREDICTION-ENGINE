# Data Providers

## existing-database

Source type: local application database.

Authorization status: permitted because it reads already-configured deployment data.

Expected fields: OHLCV prices from `daily_prices`; available valuation, profitability, leverage, margin, and growth fields from `financial_snapshots`.

Rate limits: none for local reads.

Environment variables: `SQLITE_DB_PATH`, `DB_ADAPTER`, and `DATABASE_URL` use the existing database adapter.

Fallback behavior: missing data remains unavailable or partial. The F1 pipeline does not fabricate zeroes, neutral `50`s, or sentinel values.

Disable provider: do not run the pipeline scripts; apply mode requires `CONFIRM_F1_PIPELINE_APPLY=true`.

## Disabled External Providers

Screener.in, Moneycontrol, Google Finance, Yahoo Finance, NSE, and BSE scraping are not implemented in this branch.

Automated ingestion may only be added behind a provider adapter when terms, documented endpoints or licensed access, attribution, rate limits, and credential handling are confirmed. HTML scraping, CAPTCHA bypass, browser automation, and cookie reuse are prohibited.

