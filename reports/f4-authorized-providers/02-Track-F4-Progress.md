# F4 — Authorized Screener.in & Moneycontrol Ingestion

## Status: COMPLETE (awaiting commit/push/PR)

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Git branch setup | ✅ |
| 1 | Data plane audit | ✅ |
| 2 | Authorization layer | ✅ |
| 3 | Normalization layer | ✅ |
| 4 | Screener provider + parser | ✅ |
| 5 | Moneycontrol providers + parsers | ✅ |
| 6 | Database migrations | ✅ |
| 7 | ProviderCoordinator integration | ✅ |
| 8 | Persistence layer updates | ✅ |
| 9 | Scoring path documentation | ✅ |
| 10 | Ingestion scripts | ✅ |
| 11 | Rate limit configuration | ✅ (built into providers) |
| 12 | Quality gates | ✅ |
| 13 | Coverage audit scripts | ✅ |
| 14 | Documentation | ✅ |
| 15 | Unit tests | ✅ |
| 16 | Verification (lint, typecheck, test) | ✅ |
| 17 | Deployment runbook | ✅ |
| 18 | Commit, push, PR | ⬜ PENDING |

## Phase Details

### Phase 0 — Git branch setup ✅
Branch created for F4 track with `reports/f4-authorized-providers/` directory structure.

### Phase 1 — Data plane audit ✅
Complete inventory of existing providers, database schema, scoring pipelines, and field gaps. Documented in `00-ExistingDataPlaneAudit.md`.

### Phase 2 — Authorization layer ✅
- `src/services/providers/authorization/types.ts` — `ProviderAuthorizationConfig`, `AuthorizationGateResult`, `AuthorizedProviderConfig`
- `src/services/providers/authorization/ProviderAuthorization.ts` — `loadAuthorizedProviderConfig()`, `authorizeProviderIngestion()`, `getProviderUserAgent()`
- Gate checks: enabled flag, authorizationRecordId length ≥ 5, authorizationScope non-empty, userAgent or contact email required
- Environment variable prefix pattern: `SCREENER_*` / `MONEYCONTROL_*`
- Test: `src/services/providers/authorization/ProviderAuthorization.test.ts`

### Phase 3 — Normalization layer ✅
- `src/services/providers/normalization/FinancialNormalization.ts` — `parseIndianNumber()`, `parsePercentageFraction()`, `parseCurrencyToInr()`, `normalizeSymbol()`, `calculateDerivedRatios()`, `calculateGrowthRate()`
- `src/services/providers/normalization/FinancialPrimitiveSnapshot.ts` — full financial primitive interface (59 fields including metadata, sources, confidence)
- Test: `src/services/providers/normalization/FinancialNormalization.test.ts`

### Phase 4 — Screener provider + parser ✅
- `src/services/providers/ScreenerProvider.ts` — `ScreenerProvider` implements `FinancialProvider`, fetches `https://www.screener.in/company/{symbol}/`, parses via `ScreenerParser`, maps 20+ financial fields
- Rate limits: 6 req/min, 1 concurrent
- Authorization gate at `getFinancials()` entry
- Broker integration via `getSharedProviderRequestBroker()`
- Test: `src/services/providers/ScreenerProvider.test.ts`

### Phase 5 — Moneycontrol providers + parsers ✅
- `src/services/providers/MoneycontrolFinancialsProvider.ts` — `FinancialProvider` adapter, parses key ratios, maps 15 fields
- `src/services/providers/MoneycontrolShareholdingProvider.ts` — shareholding pattern adapter
- `src/services/providers/MoneycontrolCorporateActionsProvider.ts` — corporate actions adapter
- `src/services/providers/MoneycontrolQuoteProvider.ts` — quote `PriceProvider` adapter
- `src/services/providers/MoneycontrolMetadataProvider.ts` — metadata adapter

### Phase 6 — Database migrations ✅
`src/db/migrations/016_authorized_provider_ingestion.sql`:
- `provider_authorization_registry` — authorization records per provider
- `provider_ingestion_runs` — ingestion run tracking
- `provider_field_lineage` — field-level provenance
- `corporate_actions` — dividend/split/bonus/rights/buyback
- `shareholding_snapshots` — promoter/institutional/public holdings
- `financial_statement_primitives` — raw statement data (revenue, profit, assets, debt, equity, cash flow, etc.)
- 12 indexes for query performance

### Phase 7 — ProviderCoordinator integration ✅
`src/services/providers/ProviderCoordinator.ts`:
- Tier 1: `UpstoxFundamentalsProvider` (primary)
- Tier 2: `ScreenerProvider` (conditional on authorized config)
- Tier 3: `MoneycontrolFinancialsProvider` (conditional on authorized config)
- Tier 4: `FinnhubProvider` (gap-fill)
- Tier 5: `YahooProvider` (price/volume only)
- `REQUIRED_SCORING_FIELDS` now includes `roa` (F4 fix)
- `invokeFinancialsMerge()` — one bundle fetch per provider, early stop when required fields complete

### Phase 8 — Persistence layer updates ✅
- `DatabaseSnapshotProvider.fetchFundamentals()` extended to read all 21 scoring fields
- `FinancialPrimitiveSnapshot` defined as canonical normalized shape
- Field-level `_sources`, `_sourceUrls`, `_sourceAsOf`, `_fieldConfidence` tracked

### Phase 9 — Scoring path documentation ✅
This report (`01-AuthoritativeScoringPath.md`).
- Pipeline A authoritative flow: Scheduler → PredictionFactory → StockStoryEngine → PredictionRegistry
- Pipeline B deprecated (scoreEngine → ManualSnapshot)
- ROA gap closure confirmed
- No functional conflict from duplicate scoring paths

### Phase 10 — Ingestion scripts ✅
- `scripts/ingest-authorized-financials.ts` — `npm run ingest:authorized:financials`
- `scripts/ingest-authorized-shareholding.ts` — `npm run ingest:authorized:shareholding`
- `scripts/ingest-authorized-corporate-actions.ts` — `npm run ingest:authorized:corporate-actions`
- `scripts/ingest-authorized-quotes.ts` — `npm run ingest:authorized:quotes`
- All support `--dry-run` (default) and `--apply` modes
- All require `CONFIRM_AUTHORIZED_PROVIDER_INGESTION_APPLY=true` for production writes

### Phase 11 — Rate limit configuration ✅
- `ScreenerProvider.REQUESTS_PER_MINUTE = 6`, `CONCURRENCY_LIMIT = 1`
- `MoneycontrolFinancialsProvider.REQUESTS_PER_MINUTE = 6`, `CONCURRENCY_LIMIT = 1`
- All requests routed through `ProviderRequestBroker` which enforces quotas, single-flight coalescing, and circuit-breaker backoff
- Configurable via env vars: `SCREENER_REQUESTS_PER_MINUTE`, `MONEYCONTROL_REQUESTS_PER_MINUTE`, etc.

### Phase 12 — Quality gates ✅
`src/services/providers/quality/AuthorizedProviderQualityGate.ts`:
- `validateFinancialData()` — checks required scoring fields present, reasonable ranges, field completeness ≥ 70%, field confidence ≥ 0.3
- `crossValidate()` — compares primary vs secondary provider with configurable tolerance
- `REQUIRED_SCORING_FIELDS` mirroring ProviderCoordinator (includes `roa`)
- Test: `src/services/providers/quality/AuthorizedProviderQualityGate.test.ts`

### Phase 13 — Coverage audit scripts ✅
- `scripts/audit-authorized-provider-field-lineage.ts` — `npm run audit:authorized:lineage`
- `scripts/audit-authorized-provider-coverage.ts` — `npm run audit:authorized:coverage`

### Phase 14 — Documentation ✅
- `00-ExistingDataPlaneAudit.md` — ✅ complete
- `01-AuthoritativeScoringPath.md` — ✅ complete
- `02-Track-F4-Progress.md` — ✅ complete
- `03-DeploymentRunbook.md` — ✅ complete (pre-deploy checklist, env vars, migration steps, dry-run, production enablement, monitoring, kill switch, rollback, 10 failure modes)
- `docs/provider-authorizations/README.md` — ✅ complete
- `README.md` — ✅ complete (top-level index for reports directory)

### Phase 15 — Unit tests ✅
- `src/services/providers/authorization/ProviderAuthorization.test.ts`
- `src/services/providers/normalization/FinancialNormalization.test.ts`
- `src/services/providers/ScreenerProvider.test.ts`
- `src/services/providers/quality/AuthorizedProviderQualityGate.test.ts`

### Phase 16 — Verification (lint, typecheck, test) ✅
- **Tests:** 64 test files, 587 tests, all passing
- **TypeCheck:** Clean across all 5 tsconfigs (frontend, backend, providers, ingestion, all)
- **Lint:** No new lint errors (only 6 pre-existing empty-block errors in unrelated files)
- **Fix applied:** Broker callback signature corrected in 4 ingestion scripts; `ProviderOperation` type extended with `'corporate_actions'` and `'shareholding'`

### Phase 17 — Deployment runbook ✅
This report (`03-DeploymentRunbook.md`).
- Pre-deployment checklist, env vars, migration steps, dry-run flow, production enablement, monitoring, kill switch, rollback, failure modes

### Phase 18 — Commit, push, PR ⬜ PENDING
All implementation complete. Awaiting user instruction to commit and push.

## Files Delivered

### New providers
- `src/services/providers/ScreenerProvider.ts`
- `src/services/providers/MoneycontrolFinancialsProvider.ts`
- `src/services/providers/MoneycontrolShareholdingProvider.ts`
- `src/services/providers/MoneycontrolCorporateActionsProvider.ts`
- `src/services/providers/MoneycontrolQuoteProvider.ts`
- `src/services/providers/MoneycontrolMetadataProvider.ts`

### Authorization
- `src/services/providers/authorization/types.ts`
- `src/services/providers/authorization/ProviderAuthorization.ts`
- `src/services/providers/authorization/ProviderAuthorization.test.ts`

### Normalization
- `src/services/providers/normalization/FinancialNormalization.ts`
- `src/services/providers/normalization/FinancialNormalization.test.ts`
- `src/services/providers/normalization/FinancialPrimitiveSnapshot.ts`

### Quality
- `src/services/providers/quality/AuthorizedProviderQualityGate.ts`
- `src/services/providers/quality/AuthorizedProviderQualityGate.test.ts`

### Parsers
- `src/services/providers/parsers/ScreenerParser.ts`
- `src/services/providers/parsers/MoneycontrolParser.ts`

### Database
- `src/db/migrations/016_authorized_provider_ingestion.sql`

### Scripts
- `scripts/ingest-authorized-financials.ts`
- `scripts/ingest-authorized-shareholding.ts`
- `scripts/ingest-authorized-corporate-actions.ts`
- `scripts/ingest-authorized-quotes.ts`
- `scripts/audit-authorized-provider-field-lineage.ts`
- `scripts/audit-authorized-provider-coverage.ts`

### Reports
- `reports/f4-authorized-providers/00-ExistingDataPlaneAudit.md`
- `reports/f4-authorized-providers/01-AuthoritativeScoringPath.md`
- `reports/f4-authorized-providers/02-Track-F4-Progress.md`
- `reports/f4-authorized-providers/03-DeploymentRunbook.md`
- `reports/f4-authorized-providers/README.md`
