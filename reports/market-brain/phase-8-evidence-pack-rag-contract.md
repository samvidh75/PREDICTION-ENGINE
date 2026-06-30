# Phase 8 — Evidence Pack Contract + RAG Retrieval Types

## Baseline

- Baseline commit: `c53cba66` (Phase 6)
- Work target: `main`
- Final commit: `8a0271c2`

## Objective

Build the canonical Evidence Pack contract types, a sanitization pipeline, and RAG retrieval type system so the Market Brain can ingest structured evidence packs (from DB, file, or RAG pipeline) and produce safe, normalized public output.

## Structure

This phase delivered 3 new modules:

### 1. Evidence Pack Contract (`src/systems/market-brain/evidencePackContract.ts`)

Extended existing evidence pack file with Phase 8 canonical types:

- `EvidenceDomain` — 8 values: `financial_statements`, `price_action`, `news_sentiment`, `ownership`, `derivatives_market`, `sector_macro`, `corporate_actions`, `filings`
- `EvidenceStrength` — `'strong' | 'moderate' | 'weak' | 'missing'`
- `EvidenceItem` — single evidence payload with domain, strength, title, summary, url
- `EvidencePack` — top-level container with symbol, generatedAt, items, domain arrays, needsReview

All existing Phase 2 types (`EvidenceDomainView`, `EvidencePackView`, `humanizeDomain()`, `evidencePackToCoverage()`, `evidencePackToView()`, `assertCleanPublicView()`) remain unchanged.

### 2. Evidence Sanitization (`src/systems/market-brain/evidenceSanitization.ts`)

6 sanitizers + builder function:

| Function | What it does |
|---|---|
| `sanitizeEvidenceDomain` | Rejects unknown domains, strips non-domain values |
| `sanitizeEvidenceStrength` | Defaults unknown strengths to `"missing"`, allows valid set |
| `sanitizeEvidenceText` | Strips ~20 banned plumbing terms case-insensitively |
| `sanitizeEvidenceUrl` | Drops non-http/non-https URLs |
| `sanitizeEvidenceItem` | Drops items where title+summary both empty, chains sanitizers |
| `buildEvidencePack` | Full builder: defaults, sanitizes, dedupes, compresses stale items |

Banned terms removed from user-facing evidence text: `provider`, `api`, `backend`, `endpoint`, `webhook`, `database`, `cache`, `adapter`, `pipeline`, `connector`, `ingestion`, `schema`, `proxy`, `internal`, `raw`, `unsafe`, `fallback`, `retry`, `timeout`, `null`.

### 3. RAG Retrieval Contract (`src/services/rag/ragRetrievalContract.ts`)

- `RagDocumentType` — 8 types: `annual_report`, `quarterly_result`, `transcript`, `filing`, `analyst_report`, `news_article`, `blog_post`, `social_post`
- `RagDocumentChunk` — chunk shape with content, page, chunkIndex, relevanceScore
- `RagRetrievalQuery` — query interface (symbol, domain, maxChunks, minRelevance)
- `RagRetrievalResult` — results container with symbol, domain, chunks, metadata
- Helpers: `emptyRetrievalResult()`, `resultHasContent()`, `resultDomains()`

### 4. RAG Evidence Pack Builder (`src/services/rag/ragEvidencePackBuilder.ts`)

Maps document types → evidence domains, derives strength from relevance score, builds `EvidencePack` via sanitization chain:

- `buildEvidencePackFromRagResult()` — entry point
- Document type → domain mapping (e.g. `annual_report` → `financial_statements`)
- Strength derived from relevance score thresholds (>= 0.8 → strong, >= 0.5 → moderate, >= 0.2 → weak, else missing)

### 5. Wiring (`src/systems/market-brain/indiaMarketBrain.ts`)

- Added optional `evidencePack?: EvidencePack | null` to `IndiaEquityPacket`
- Replaced `missingEvidence`/`partialEvidence` with `evidenceSummary: string[]` in `IndiaMarketBrainResult`
- Processing logic extracts available domain labels via `humanizeDomain()`

### 6. DTO (`src/services/marketBrainResearch.ts`)

- Added `evidenceSummary: string[]` to `MarketBrainResearchView`
- Added normalization in `normalizeResearchResponse()`

## Test results

| Module | Tests |
|---|---|
| `evidencePackContract.test.ts` | 13 pass |
| `evidenceSanitization.test.ts` | 21 pass |
| `ragRetrievalContract.test.ts` | 6 pass |
| `ragEvidencePackBuilder.test.ts` | 7 pass |
| `indiaMarketBrain.test.ts` | 9 pass |
| `marketBrainResearch.test.ts` | 17 pass |
| `researchContract.test.ts` | 9 pass |
| `marketBrainResearch.publicShape.test.ts` | 3 pass |
| `adapterEvidenceState.test.ts` | 12 pass |

**Full suite:** 1794 passed, 7 skipped, 0 failed

## Fixes applied during phase

- Fixed `adapterEvidenceState.test.ts` UNSAFE_PUBLIC_COPY regex — `API` without word boundary matched "api" inside "capital". Changed to `\bAPI\b`.
- Fixed public shape test — added `evidenceSummary` to expected key list (15 keys).

## Files changed

11 files, 823 insertions, 3 deletions:

- `src/systems/market-brain/evidencePackContract.ts` (+53) — Added canonical types
- `src/systems/market-brain/evidenceSanitization.ts` (new, +127) — Sanitization pipeline
- `src/systems/market-brain/evidenceSanitization.test.ts` (new, +174) — 21 tests
- `src/services/rag/ragRetrievalContract.ts` (new, +96) — RAG type system
- `src/services/rag/ragRetrievalContract.test.ts` (new, +56) — 6 tests
- `src/services/rag/ragEvidencePackBuilder.ts` (new, +86) — RAG → EvidencePack mapper
- `src/services/rag/ragEvidencePackBuilder.test.ts` (new, +71) — 7 tests
- `src/systems/market-brain/indiaMarketBrain.ts` (+8) — Evidence wiring
- `src/services/marketBrainResearch.ts` (+2) — DTO expansion
- `src/services/marketBrainResearch.publicShape.test.ts` (+1) — Updated expected keys
- `src/systems/market-brain/adapterEvidenceState.test.ts` (+1, -1) — Regex fix

## Safety confirmations

- No fake data added
- No secrets touched
- No broker execution added
- No direct recommendation language added
- No public provider/backend plumbing exposed
- No backend routes, provider calls, database schema, migrations, or environment config changed
- All public output stays sanitized via evidenceSanitization banned-term checks

## Next remaining task

Proceed to Phase 4 Financial Intelligence: ROA, dividend yield, and market-cap scoring.
