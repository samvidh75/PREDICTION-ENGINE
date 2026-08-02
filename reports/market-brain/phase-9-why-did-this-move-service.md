# Phase 9 — "Why Did This Move" Service

## Baseline

- Baseline commit: `8a0271c2` (Phase 8)
- Work target: `main`
- No production services, routes, or DB schemas added.

## Objective

Build a deterministic service that answers "Why did this stock move?" by combining anomaly evidence, historical similarity, evidence pack domain coverage, and adapter evidence state into a single structured result. No LLM call — pure deterministic analysis.

## Structure

This phase delivered 1 new module and wiring across 3 existing files.

### 1. WhyDidThisMove service (`src/systems/market-brain/whyDidThisMove.ts`)

Core types and builder:

- `MoveDirection` — `'up' | 'down' | 'sideways' | 'mixed'`
- `MoveConfidence` — `'strong' | 'moderate' | 'weak' | 'insufficient'`
- `WhyDidThisMoveInput` — input packet with `anomalyReview`, `historicalSimilarityReview`, `evidencePack`, `adapterEvidenceState`, `fundamentals`
- `WhyDidThisMoveResult` — output with `direction`, `confidence`, `magnitudePct`, `primaryDriver`, `contributingFactors`, `risksToThesis`, `summary`, `keyLevels`, `neededContext`
- `buildWhyDidThisMoveResult()` — deterministic builder that combines all evidence sources

Key design decisions:

| Decision | Rationale |
|---|---|
| No LLM call | LLMs are too slow/unreliable for real-time move analysis; keep deterministic |
| Function-based, not class-based | Consistent with existing module patterns (no OOP refactor needed) |
| Forbidden-copy audit at build time | Every result is validated before return via `assertMarketBrainCopyIsCompliant()` |
| Confidence from anomaly severity | High → strong, Medium → moderate, Low → weak, no evidence → insufficient |
| Direction from anomaly type | Volume/delivery → up, volatility/gap → mixed, stock-specific → up, market-aligned → sideways |
| Fallback chain | If no anomaly, falls back to historical similarity; if none, "Insufficient evidence" |

### 2. DTO (`src/services/marketBrainResearch.ts`)

- Added `MarketBrainWhyDidThisMoveView` — the sanitized public shape
- Added `normalizeWhyDidThisMoveView()` — safe coercion with `asDirection()`, `asConfidence()`, `asNullableNumber()`
- Added `whyDidThisMove` field to `MarketBrainResearchView`
- Wired into `normalizeResearchResponse()` for the public API

### 3. Wiring (`src/systems/market-brain/indiaMarketBrain.ts`)

- Added optional `whyDidThisMove?: WhyDidThisMoveInput | null` to `IndiaEquityPacket`
- Added `whyDidThisMove: WhyDidThisMoveResult | null` to `IndiaMarketBrainResult`
- `evaluateIndiaEquity()` calls `buildWhyDidThisMoveResult()` when input is provided

### 4. Export (`src/systems/market-brain/index.ts`)

- Added `export * from './whyDidThisMove'`

## Test results

| Module | Tests |
|---|---|
| `whyDidThisMove.test.ts` | 12 pass |
| `indiaMarketBrain.test.ts` | 9 pass |
| `marketBrainResearch.publicShape.test.ts` | 3 pass |

**Full market-brain suite:** 143 passed, 0 failed
**Full services suite:** 52 passed, 0 failed

## Files changed

```
?? src/systems/market-brain/whyDidThisMove.ts        (new, +260) — Service types + builder
?? src/systems/market-brain/whyDidThisMove.test.ts   (new, +244) — 12 tests
 M src/systems/market-brain/index.ts                  (+1) — Export
 M src/systems/market-brain/indiaMarketBrain.ts        (+9) — Input/result wiring
 M src/services/marketBrainResearch.ts                (+37) — DTO types + normalizer
 M src/services/marketBrainResearch.publicShape.test.ts (+1) — Expected key
```

## Safety confirmations

- ✅ No fake data added
- ✅ No secrets touched
- ✅ No broker execution added
- ✅ No direct recommendation language added
- ✅ All public output is sanitized via `assertMarketBrainCopyIsCompliant()`
- ✅ No public provider/backend plumbing exposed
- ✅ No backend routes, provider calls, DB schema, migrations, or environment config changed
- ✅ No LLM dependency — fully deterministic

## Remaining tasks

Proceed to Phase 4 Financial Intelligence: ROA, dividend yield, and market-cap scoring — these were identified as priority engine activations by the elder audit.
