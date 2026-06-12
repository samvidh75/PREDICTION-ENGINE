# F1 Data Source Decision

Selected provider for this branch: `existing-database`.

Authorization basis: the provider reads data already present in the deployment database. No new external automated data access is introduced.

Endpoint type: local database tables, primarily `daily_prices` and `financial_snapshots`.

Rate limit: not applicable for local reads.

Fields ingested/read: OHLCV prices and available financial snapshot fields such as PE, PB, EPS, ROE, debt-to-equity, margins, and growth fields.

Unsupported fields: revenue, operating profit, net profit, total assets, total debt, equity, and operating cash flow are not reliably present in the current schema.

Fallback behavior: missing fields remain `null` and lower completeness/confidence. They are not converted to zero or neutral `50`.

Disable behavior: do not run `npm run pipeline:predictions`; apply mode also requires `CONFIRM_F1_PIPELINE_APPLY=true`.

Screener.in and Moneycontrol were considered only as disabled placeholders. Automated ingestion permission was not confirmed in this task, so no adapters or scrapers were implemented.

HTML scraping was rejected because the mission forbids unauthorized scraping and requires documented endpoints, rate limits, attribution, provider adapters, and explicit licensing/authorization.

