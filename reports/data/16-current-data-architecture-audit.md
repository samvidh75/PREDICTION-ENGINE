# Phase 16: Current Data Architecture Audit

> Generated at baseline commit `c8322853`

## Classification

| Area | Existing files | Current capability | Data source | Gaps | Required action |
|------|---------------|-------------------|-------------|------|-----------------|
| equity universe | `src/stockstory/ingestion/StockUniverseIngestion.ts`, `scripts/generate-stock-universe.ts`, scripts/sync-official-symbols.ts | NSE/BSE stocks with sector, industry, ISIN | DB stocks table + provider probes | No separate universe builder module; no canonical symbol normalization; no listing-status tracking | Create IndianEquityUniverseBuilder + SymbolNormalizer |
| symbol master | `stocks` table in DB | Basic symbol, exchange, ISIN, name | DB | No alias resolution; no symbol-change history; no cross-exchange mapping | Create CompanyIdentityResolver + CompanyAliasResolver |
| company identity | `company_profile_overviews` table | NSE/BSE codes, ISIN, sector, industry, website | IndianAPI premium | No formal identity resolution layer; no conflict detection | Create CompanyIdentityTypes + Resolver |
| financials | `company_fundamental_snapshots`, `company_financial_statement_tables` | PE, PB, ROCE, ROE, D/E, margins, growth rates | IndianAPI premium + authorized ingestion | No formal quarterly result ingestion module; no YoY/QoQ normalization | Create QuarterlyResultIngestion + Normalizer |
| prices/candles | `market_live_price_snapshots` | Live price, OHLC, volume, market cap | IndianAPI premium | No dedicated candle data types | Covered by existing |
| technical indicators | `TechnicalIndicatorService` | Computed indicators | Built from prices | No derivatives/F&O context | Create DerivativesContextEngine |
| news | `src/stockstory/ingestion/NewsIngestion.ts` | News ingestion exists | Provider probes | No quality scoring; no dedup; no entity matching | Create NewsQualityScorer + NewsDeduper |
| earnings/results | `stock_intelligence_history` | Result metrics in generic snapshot | IndianAPI premium | No structured result types; no impact engine; no segment data | Create QuarterlyResultTypes + ResultImpactEngine |
| annual reports | **None** | Not ingested | N/A | No document ingestion for annual reports | Create DocumentIngestionService + Parser |
| investor presentations | **None** | Not ingested | N/A | No document ingestion for presentations | Covered by document module |
| concall transcripts | **None** | Not ingested | N/A | Not available/legal | Create conditional module |
| exchange announcements | **None** | Not ingested | N/A | No filing ingestion system | Create FilingIngestionService + Classifier |
| corporate actions | `company_corporate_actions` table | Dividends, splits, bonuses stored | IndianAPI premium | No formal normalizer; no event mapper | Create CorporateActionNormalizer + EventMapper |
| shareholding/promoter | `company_shareholding_snapshots` table | Promoter, FII, DII, public % | IndianAPI premium | No pledge data; no risk mapping | Create ShareholdingRiskMapper |
| bulk/block/insider | **None** | Not ingested | N/A | No disclosure ingestion | Create DisclosureIngestion + Classifier |
| index membership | **None** | Not tracked | N/A | No index membership tracking | Create IndexMembershipService |
| sector/industry | `stocks.sector`, `company_profile_overviews.sector/industry` | Basic sector classification | DB | No formal taxonomy; no sector hierarchy | Create SectorTaxonomy + SectorMapper |
| RAG/documents | `src/stockstory/ingestion/RagDocumentIngestion.ts` | Basic document ingestion | N/A | No corpus store; no chunker; no retriever | Create ResearchCorpusStore + RagRetriever |
| evidence IDs | `src/stockstory/intelligence/evidence/EvidenceTypes.ts` | EvidenceKind, ResearchEvidence, EvidenceBoundClaim | Intelligence | No dedicated data-layer evidence | Create DataEvidenceTypes + DataLineageService |
| data freshness | Ad-hoc via fetched_at columns | Per-row timestamps | DB | No systematic freshness scoring | Create DataFreshnessScorer |
| data validation | `scripts/validate-data-integrity.ts`, `scripts/validate-schema-contract.ts` | Schema + integrity checks | Manually run | No data quality scoring or automated reporting | Create DataQualityScorer + validation scripts |
| ingestion jobs | Multiple `scripts/ingest-*`, `scripts/refresh-*`, `scripts/sync-*` | Various ad-hoc scripts | Various | No unified job framework; no `--dry-run`/`--since`/`--changed-only` conventions | Create standardized ingestion job scripts |
| production APIs | `src/render/` backend | REST APIs for frontend | Backend | No internal data ops API; no filings/results/corp actions endpoints | Create internal + public data API routes |
| frontend research | `src/pages/StockPage.tsx`, `src/pages/CompanyResearchReport.tsx` | Company research views | Intelligence | No filings/results/shareholding/research-basis UI | Update frontend surfaces |

## Key Findings

1. **No dedicated `src/stockstory/data/` layer** — data types, registries, quality, evidence are scattered across ingestion, intelligence, and scripts
2. **Filings module completely missing** — exchange announcements, annual reports, investor presentations not ingested
3. **Index membership not tracked** — no Nifty/BSE index membership data
4. **No sector taxonomy** — sectors are free-text strings in DB
5. **No news quality/dedup** — news ingested but not scored or deduplicated
6. **No disclosure module** — bulk/block/insider trades not handled
7. **No derivatives context** — F&O data not tracked
8. **No formal data reconciliation** — conflicts handled ad-hoc or silently
9. **RAG is basic** — no corpus store, chunker, or retriever abstraction
10. **No data quality scoring** — freshness/completeness/confidence not systematized
