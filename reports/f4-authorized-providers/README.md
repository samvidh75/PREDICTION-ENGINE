# F4 — Authorized Screener.in & Moneycontrol Ingestion

This directory contains deliverables for the F4 track, which adds authorized ingestion from Screener.in and Moneycontrol as Tier 2 and Tier 3 financial data providers.

## Reports

| File | Description |
|------|-------------|
| `00-ExistingDataPlaneAudit.md` | Data plane audit of existing providers, fields, schema, and scoring paths before F4 changes |
| `01-AuthoritativeScoringPath.md` | Confirmation of authoritative scoring pipeline (Pipeline A) through PredictionFactory → StockStoryEngine → PredictionRegistry |
| `02-Track-F4-Progress.md` | Master status tracker for all 18 phases with per-phase details |
| `03-DeploymentRunbook.md` | Production deployment instructions, env vars, migration steps, dry-run procedure, kill switch, rollback, and failure modes |

## Code

All implementation code lives under `src/services/providers/`:

| Directory/File | Contents |
|----------------|----------|
| `authorization/` | Authorization config types, env-based config loader, `authorizeProviderIngestion()` gate check |
| `normalization/` | `FinancialPrimitiveSnapshot` type, Indian number parsing (`parseIndianNumber`, `parsePercentageFraction`, `parseCurrencyToInr`), ratio calculation (`calculateDerivedRatios`), symbol normalization |
| `parsers/` | `ScreenerParser` and `MoneycontrolParser` (regex-based HTML extraction from public financial pages) |
| `quality/` | `AuthorizedProviderQualityGate` — field completeness validation (≥70%), reasonable range checks, cross-validation between providers |
| `ScreenerProvider.ts` | Screener.in `FinancialProvider` adapter — fetches `/company/{symbol}/`, parses 21 financial fields |
| `MoneycontrolFinancialsProvider.ts` | Moneycontrol `FinancialProvider` adapter — fetches key ratios, maps 15 fields |
| `MoneycontrolShareholdingProvider.ts` | Moneycontrol shareholding pattern adapter |
| `MoneycontrolCorporateActionsProvider.ts` | Moneycontrol corporate actions (dividend/split/bonus) adapter |
| `MoneycontrolQuoteProvider.ts` | Moneycontrol quote `PriceProvider` adapter |
| `MoneycontrolMetadataProvider.ts` | Moneycontrol metadata adapter |

## Database

Migration `016_authorized_provider_ingestion.sql` adds 6 new tables:

| Table | Purpose |
|-------|---------|
| `provider_authorization_registry` | Authorization records per provider (seeded before use) |
| `provider_ingestion_runs` | Ingestion run tracking with status, symbol counts, error summaries |
| `provider_field_lineage` | Field-level provenance (which provider, URL, confidence) |
| `corporate_actions` | Dividend, split, bonus, rights, buyback events |
| `shareholding_snapshots` | Promoter, institutional, public holdings per period |
| `financial_statement_primitives` | Raw financial statement data (revenue, profit, assets, debt, cash flow) |

## Provider Chain

ProviderCoordinator financials priority order (after F4):

1. **UpstoxFundamentalsProvider** (Tier 1 — primary)
2. **ScreenerProvider** (Tier 2 — conditional on auth config)
3. **MoneycontrolFinancialsProvider** (Tier 3 — conditional on auth config)
4. **FinnhubProvider** (Tier 4 — gap-fill)
5. **YahooProvider** (price/volume only)

Early stop when all `REQUIRED_SCORING_FIELDS` (19 fields including `roa`) are populated.

## Usage

See `03-DeploymentRunbook.md` for full deployment instructions including:

- Environment variable setup
- Migration execution
- Dry-run procedure
- Production enablement
- Monitoring and audit commands
- Kill switch and rollback
- Failure mode reference
