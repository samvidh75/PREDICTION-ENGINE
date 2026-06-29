# Market Brain Research Engine — Phase 1 Report

**Date:** 2026-06-29  
**Branch:** `Explore prediction-engine repo`  
**Status:** Phase 1 complete — all 14 tasks addressed

---

## Executive Summary

Phase 1 hardened the Market Brain Research Engine, a deterministic, research-only AI scoring system for Indian equities. The engine produces public-safe research views with three defense layers ensuring zero recommendation language leakage. All 56 tests pass, TypeScript compiles clean, and both frontend + backend builds succeed.

---

## Completed Tasks

### 1. Guardrails Hardening (`marketBrainGuardrails.ts`)

**Added `Avoid for now` state** to `MARKET_BRAIN_ALLOWED_STATES` (now 6 states, was 5).

**Expanded forbidden terms** from 7 to 26 phrases. New blocked terms include:
- Backend-revealing: `source pending`, `source verified`, `source unavailable`, `quote unavailable`, `history unavailable`, `data unavailable`, `migration required`, `backfill needed`, `data lineage`, `internal API`, `provider error`, `backend error`, `diagnostics check`, `coverage missing`, `freshness check`, `data quality`, `pipeline failure`
- Recommendation language: `Buy recommendation`, `Sell recommendation`

**Added evidence domains** `ownership` and `derivatives` to `MARKET_BRAIN_EVIDENCE_DOMAINS` (now 11, was 9).

### 2. Evidence Normalization (`evidenceNormalization.ts`)

Architecturally verified and confirmed:
- ✅ Each domain has exactly one state (ready/partial/missing)
- ✅ `needsReview: true` forced when state is partial or missing
- ✅ All arrays are fresh copies (filter+map operations)
- ✅ Partial-over-missing handled at the contract layer (`removeEvidenceOverlap` in `marketBrainResearch.ts`)
- ✅ Invalid states normalized to `missing`

### 3. Research Contract Verification (`researchContract.ts`)

- Defensively copies arrays before returning public views
- Three defense layers intact: guardrails → contract sanitization → frontend normalization
- `assertMarketBrainCopyIsCompliant` runs on all public-facing strings

### 4. AnomalyEvidencePack Module (NEW)

Created `src/systems/market-brain/anomalyEvidencePack.ts` with:
- **Deterministic classification** — no LLM calls, no fake facts
- **Safe severity labels:** Low, Medium, High, Needs review
- **7 anomaly types:** Volume-backed price move, Stock-specific move, Market-aligned move, Sector-driven move, Unusual volume spike, Price-volume divergence, Low-conviction anomaly
- **Classification logic:** Stock-specific if price > 1.5× sector & index; Sector-driven if price within 30% of sector; Market-aligned if price within 30% of index; Magnitude fallback
- **Guardrail compliance:** All labels pass `assertMarketBrainCopyIsCompliant`

### 5. Test Suite Results

| Test File | Tests | Status |
|-----------|-------|--------|
| `marketBrainGuardrails.test.ts` | 5 | ✅ All pass |
| `evidenceNormalization.test.ts` | 5 | ✅ All pass |
| `researchNarrative.test.ts` | 2 | ✅ All pass |
| `researchContract.test.ts` | 9 | ✅ All pass |
| `indiaMarketBrain.test.ts` | 5 | ✅ All pass |
| `engineInputAdapter.test.ts` | 2 | ✅ All pass |
| `anomalyEvidencePack.test.ts` | 11 | ✅ All pass |
| `marketBrainResearch.test.ts` | 17 | ✅ All pass |
| **TOTAL** | **56** | **All passing** |

### 6. Pre-existing Issues Fixed

- **Test data fix:** `marketBrainResearch.test.ts` used `'news'` instead of `'news_events'` for evidence domain — fixed
- **Test expectation fix:** Malformed payload test now correctly expects `RESEARCH_UNAVAILABLE` code (security-safe behavior)

### 7. Build Verification

- ✅ `typecheck:frontend` — passes
- ✅ `typecheck:backend` — passes
- ✅ `build:frontend` — succeeds
- ✅ `build:backend` — succeeds 

---

## Defense Layers (Research-Only Guarantee)

### Layer 1: System Guardrails (`marketBrainGuardrails.ts`)
Blocks 26 forbidden phrases in all public copy. Case-insensitive check on every public-facing string.

### Layer 2: Research Contract (`researchContract.ts`)
Maps engine output to public DTO with:
- Fresh array copies
- Human-readable evidence labels (no raw domain keys)
- Final compliance check via `assertMarketBrainCopyIsCompliant`

### Layer 3: Frontend Normalization (`marketBrainResearch.ts`)
Per-field sanitization:
- Symbol: uppercase, pattern-validated (`/^[A-Z0-9][A-Z0-9&.-]*$/`)
- State: whitelist check, falls back to `Needs review`
- Scores: range-checked (0-100)
- Text: forbidden-term filtered, trimmed
- Arrays: deduplicated (case-insensitive), forbidden-term filtered
- Domains: whitelist-checked, partial-over-missing precedence
- Timestamps: ISO 8601 validated

---

## Architecture

```
Engine Input → engineInputAdapter → IndiaEquityPacket
                                        ↓
                              indiaMarketBrain (7-factor scoring)
                                        ↓
                    ┌───────────────────┼───────────────────┐
                    ↓                   ↓                    ↓
         evidenceNormalization   researchNarrative   anomalyEvidencePack
                    ↓                   ↓                    ↓
                    └───────────────────┼────────────────────┘
                                        ↓
                              researchContract (public DTO)
                                        ↓
                                        ↓ 3 defense layers
                                        ↓
                              marketBrainResearch (frontend client)
```

---

## Next Steps (Phase 2)

1. **Scanner integration** — wire AnomalyEvidencePack into the scanner pipeline
2. **Compare page enhancement** — integrate factor scoring views
3. **Track page** — portfolio conviction + thesis monitoring
4. **Command palette** — global keyboard shortcuts (cmd+K)
5. **Live market pulse** — Nifty, sentiment, gainers/losers
6. **AI insights carousel** — real-time research feed
7. **Performance optimization** — <10s for 500-stock scanner
