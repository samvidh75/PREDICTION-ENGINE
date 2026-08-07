# PSE Edge Real-Data Pipeline

This app pulls real data from PSE's own disclosure system, [edge.pse.com.ph](https://edge.pse.com.ph), rather than fabricating figures. This doc is the map: what's real, what's still estimated, how each file gets generated, and how the scraping mechanism actually works.

## The core mechanism (`src/services/scrapers/PSEEdgeScraper.ts`)

PSE Edge identifies companies by a numeric `cmpy_id`, not free-text search. `KNOWN_CMPY_IDS` maps ~280 of ~294 PSE tickers to their real `cmpy_id`, resolved via PSE Edge's own `/autoComplete/searchCompanyNameSymbol.ax?term={symbol}` JSON endpoint. The 14 unmapped tickers (ATNB, BCB, CAB, COAL, DMPA1, DMPA2, DMPI, DTEL, FJPB, FYNB, LCB, MAB, MAHB, OPMB) are mostly preferred-share/bond-style instruments that autocomplete doesn't index — left unresolved rather than guessed.

Company disclosures are fetched by POSTing `keyword={cmpy_id}` (yes, the numeric ID goes in the `keyword` field) to `companyDisclosures/search.ax`, optionally with `tmplNm` set to the exact **Template Name** text PSE Edge uses (not the SEC form number) — see `TEMPLATE_NAMES` in the scraper. Each disclosure's actual content is behind a second request: `/openDiscViewer.do?edge_no={id}` → either an inline HTML iframe (`/downloadHtml.do?file_id=`) or a PDF attachment.

## Data files and what generates them

| File | Script | Real content | Cadence |
|---|---|---|---|
| `data/pse-fundamentals.json` | `scripts/scrape-pse-fundamentals.ts` | Latest quarter's totalAssets/Liabilities/Equity, netIncome, revenue, EPS, derived ROE/debtToEquity, per company (17-Q filings) | weekly |
| `data/pse-ownership.json` | `scripts/scrape-pse-ownership.ts` | Insider % vs Public Float %, outstanding shares (POR-1 Public Ownership Reports) | weekly |
| `data/pse-sectors.json` | `scripts/scrape-pse-sectors.ts` | Real sector/subsector, cmpy_id, security_id, listing date (company directory, 282 companies, 6 pages) | weekly |
| `data/pse-disclosures.json` | `scripts/scrape-pse-disclosures.ts` | Most recent ~8 disclosures per company, any type (Press Releases, Material Info, etc.) | weekly |
| `data/pse-financial-history.json` | `scripts/scrape-pse-financial-history.ts` | Real multi-quarter (up to 8) revenue/net-income time series per company (17-Q filings) | **monthly** — ~8x the request volume of the weekly job |
| `data/pse-insider-filings.json` | `scripts/scrape-pse-insider-filings.ts` | Real form 17-7 beneficial-ownership-change filings: reporting person, relationship to issuer, transaction description (no share count/value — not present in this filing type's rendering) | **monthly** |

Every loader (`PSEOwnershipData.ts`, `PSEFinancialHistoryData.ts`, `PSESectorsData.ts`, `PSEDisclosuresData.ts`, `PSEInsiderFilingsData.ts`, and `api/_lib/services/pseFundamentalsProvider.ts`) follows the same rule: **no synthetic fallback**. A symbol with no scraped record returns `null`/`[]`, never a fabricated substitute. Callers decide what to show for that honest-empty state (usually: hide the section, or fall back to a clearly-labeled estimate elsewhere).

## Scheduled jobs (`.github/workflows/`)

- `pse-scrape-weekly.yml` — fundamentals, ownership, sectors, disclosures (the lighter, 1-request-or-few-per-company jobs)
- `pse-financial-history-monthly.yml` — the 8-request-per-company history job
- `pse-insider-filings-monthly.yml` — the insider filings job (listing + per-filing fetch)

All three commit their regenerated JSON straight to `main` if the diff is non-empty (`continue-on-error: true` so a partial failure doesn't block).

## `/api/pse/*` endpoints (Render server: `src/render/apiRouter.ts`)

These routes expose the scraped PSE data directly to clients:

| Endpoint | Source | Notes |
|---|---|---|
| `GET /api/pse/disclosures/:symbol` | `pse-disclosures.json` | Most recent ~8 disclosures for a company |
| `GET /api/pse/insider-filings/:symbol` | `pse-insider-filings.json` | Form 17-7 beneficial-ownership changes |
| `GET /api/pse/ownership/:symbol` | `pse-ownership.json` | Insider % vs Public Float % |
| `GET /api/pse/sector/:symbol` | `pse-sectors.json` | Real sector/subsector, cmpy_id, listing date |
| `GET /api/pse/stocks` | `pse-sectors.json` | Full company/sector directory |
| `GET /api/pse/summary` | `pseDataPipeline.getMarketSummary()` | Constituent/market summary |
| `GET /api/pse/gainers` / `GET /api/pse/losers` | `pseDataPipeline.getTopGainers(15)` / `getTopLosers(15)` | Derived from live prices |
| `GET /api/pse/history/:symbol` | `pseDataPipeline.getHistoricalData(symbol)` | Historical OHLCV |

All of them follow the same no-synthetic-fallback rule: a symbol with no record returns
`null`/`[]`, never a fabricated substitute.

## The `operatingIncome` field (and why it's not EBITDA)

`PSEFinancialHistoryData` parses each real 17-Q (quarterly) / 17-A (annual) filing and can
carry an `operatingIncome` value — the **Operating Income** line from the statement text.
Because PSE filings do **not** report a distinct labeled "EBITDA" line, we deliberately do
**not** model EBITDA. Exactly one of two things happens:

- The "Operating Income" line is parseable → `operatingIncome` is set and the financial
  chart shows it under the label **"Operating Income"**.
- It is genuinely absent for a filer (e.g. banks structure their income statement
  differently) → the point is left `null`/empty, never estimated.

Internally this value is surfaced through the chart series keyed as `ebitda` only for
backwards-compatibility with the existing chart component; the user-facing label is always
"Operating Income", and the doc/gap note in `apiRouter.ts` marks it as real Operating
Income, not EBITDA.

## Momentum / backtest / prediction work

- **Momentum scoring** — `src/research/features/momentumFeatures.ts` exposes
  `computeMomentumFeatures(candles, relativeStrength)`, a self-contained (no `@/` alias)
  scorer returning a breakdown: `priceTrendScore`, `relativeStrengthScore`,
  `shortTermScore`, `mediumTermScore`, `overallMomentum`, `confidence`, and `missingInputs`
  (zero lookahead — each window uses only closes at/before its endpoint). Real EODHD-based
  bars feed it, so `overallMomentum` is real, not a neutral default.
- **`momentumBreakdown` in the Prediction type** — added to the `Prediction` type and to
  both API providers (`api/stock/[symbol].ts` and `src/render/apiRouter.ts`); the front end
  renders it in `PredictionPage.tsx`.
- **Real-data walk-forward backtest** — `src/backtest/realDataWalkForward.ts` +
  `scripts/run-real-backtest.ts` run an anti-lookahead `WalkForwardValidator`
  (`src/services/backtest/WalkForwardValidator.ts`) on actual `daily_prices` bars. This is
  a genuine long-only momentum strategy (long when the train-window mean return > 0), with
  honest reporting: any symbol with **fewer than 316 bars** (252 train + 63 test + 1) is
  reported as `insufficient data` — never backfilled or fabricated.


## What's real vs. estimated on the Stock page today

`api/stock/[symbol].ts` and `src/render/apiRouter.ts` (the two live server variants — **update both** for any data-layer change; they don't share code, and the backend build's `rootDir: "src"` means it can't import from `api/_lib/`) set `dataSources` on the response:

- `financials`: `'pseApi'` (real multi-quarter series from `pse-financial-history.json`) → `'partial-real'` (real latest-quarter EPS/ROE/debt-equity from `pse-fundamentals.json`, but the chart itself is still the market-cap/sector-median model) → `'synthetic'` (nothing real available)
- `shareholding`: `'real'`/`'pseApi'` when `pse-ownership.json` has a record, otherwise the Shareholdings card doesn't render at all (no fabricated FII/DII split — PSE Edge doesn't even report that category)
- `thesis`: `'real'` for an AI-generated narrative, `'synthetic'` for the templated fallback text, `'unavailable'` when neither exists
- `news`: `'real'` for a live feed, `'disclosures'` for the real-disclosure fallback (`pse-disclosures.json`), `'estimated'`/absent otherwise

`StockPage.tsx` reads these and shows a **Verified** / **Estimated** / **PSE filings** badge per card — never a blanket disclaimer regardless of what's actually real.

## Known gaps

- EBITDA is never populated from real filings — not cleanly parseable out of PSE 17-Q statement text, left empty rather than modeled.
- Annual (as opposed to quarterly) financial history isn't scraped — the monthly job only fetches 17-Q quarterly filings.
- Insider filings have no share quantity or transaction value — genuinely not present in this filing type's PSE Edge rendering.
- 9 symbols in `KNOWN_CMPY_IDS` have zero "Quarterly Report" filings on PSE Edge (confirmed live, not a scraper bug — e.g. AAA has 35 disclosures total but none are quarterly reports, likely a dormant/non-reporting issuer).
- Real sector data covers the company directory's ~282 listed companies; `KNOWN_CMPY_IDS` covers ~280 — not identical sets, check both if a symbol is missing sector data specifically.

## Regenerating data locally

Every scrape script accepts `MAX_SYMBOLS=<n>` to sample a run for validation instead of hitting the full universe:

```bash
MAX_SYMBOLS=6 npx tsx scripts/scrape-pse-fundamentals.ts
```

Full runs (no env var) can take anywhere from a few minutes (fundamentals/ownership, ~280 single requests) to 20-40 minutes (financial history, ~280 × up to 8 requests). Be polite to PSE Edge — don't lower the `DELAY_MS`/`CONCURRENCY` constants without a reason; an earlier run got a transient "Blocked site" response after a burst of rapid requests (unrelated to PSE — looked like a local network-layer rate limit, cleared after backing off).
