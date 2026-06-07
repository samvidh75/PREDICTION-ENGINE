# TRACK-36A AGENT 2: Ranking Dependency Audit
**Generated:** 2026-06-07T01:21+05:30
**Source:** Code definitions from `src/stockstory/engines/`, `src/stockstory/scoring/`

## Per-Engine Dependency Listing

### QualityEngine
- **File:** `src/stockstory/engines/QualityEngine.ts`
- **Signature:** `evaluate(inputs: EngineInputs): QualityEngineOutput`
- **Provider imports:** NONE
- **Database imports:** NONE (takes EngineInputs as parameter)
- **Output:** `{ score, commentary }`
- **Verdict:** PROVIDER_INDEPENDENT ✅

### GrowthEngine
- **File:** `src/stockstory/engines/GrowthEngine.ts`
- **Signature:** `evaluate(inputs: EngineInputs): GrowthEngineOutput`
- **Provider imports:** NONE
- **Database imports:** NONE
- **Output:** `{ score, commentary }`
- **Verdict:** PROVIDER_INDEPENDENT ✅

### ValuationEngine
- **File:** `src/stockstory/engines/ValuationEngine.ts`
- **Signature:** `evaluate(inputs: EngineInputs): ValuationEngineOutput`
- **Provider imports:** NONE
- **Database imports:** NONE
- **Output:** `{ score, commentary }`
- **Verdict:** PROVIDER_INDEPENDENT ✅

### MomentumEngine
- **File:** `src/stockstory/engines/MomentumEngine.ts`
- **Signature:** `evaluate(inputs: EngineInputs): MomentumEngineOutput`
- **Provider imports:** NONE
- **Database imports:** NONE
- **Helper:** `linearTrend()` for trend calculation from pre-computed prices
- **Output:** `{ score, commentary }`
- **Verdict:** PROVIDER_INDEPENDENT ✅

### RiskEngine
- **File:** `src/stockstory/engines/RiskEngine.ts`
- **Signature:** `evaluate(inputs: EngineInputs): RiskEngineOutput`
- **Provider imports:** NONE
- **Database imports:** NONE
- **Output:** `{ score, commentary }`
- **Verdict:** PROVIDER_INDEPENDENT ✅

### StabilityEngine
- **File:** `src/stockstory/engines/StabilityEngine.ts`
- **Signature:** `evaluate(inputs: EngineInputs): StabilityEngineOutput`
- **Provider imports:** NONE
- **Database imports:** NONE
- **Output:** `{ score, commentary }`
- **Verdict:** PROVIDER_INDEPENDENT ✅

### ConfidenceEngine
- **File:** `src/stockstory/engines/ConfidenceEngine.ts`
- **Signature:** `evaluate(inputs): confidenceScore`
- **Method:** `mapToLevel(score: number): ConfidenceLevel`
- **Provider imports:** NONE
- **Database imports:** NONE
- **Output:** `{ score, level, commentary }`
- **Verdict:** PROVIDER_INDEPENDENT ✅

### ConfidenceEngineV2
- **File:** `src/quality/ConfidenceEngineV2.ts`
- **Exists:** Compiles, not proven live (per TRACK-32 specification)
- **Provider imports:** NONE
- **Verdict:** PROVIDER_INDEPENDENT ✅

### SectorPercentileEngine
- **File:** `src/stockstory/scoring/SectorPercentileEngine.ts`
- **Signature:** Takes scores per sector
- **Provider imports:** NONE
- **Database imports:** NONE
- **Verdict:** PROVIDER_INDEPENDENT ✅

## Data Flow Diagram

```
┌─────────────┐
│  PROVIDERS   │  (Yahoo, Screener, Upstox, Finnhub)
│  (Live Data) │
└──────┬──────┘
       │ ProviderCoordinator invokeChain()
       ▼
┌─────────────┐
│  RAW STORAGE │  (daily_prices, financial_snapshots, symbols)
│  (Database)  │
└──────┬──────┘
       │ NightlyPopulationOrchestrator
       ▼
┌─────────────┐
│   FEATURE    │  (FeatureEngine → feature_snapshots)
│    STORE     │  (RSI, MACD, momentum, volatility)
└──────┬──────┘
       │ FactorEngine
       ▼
┌─────────────┐
│   FACTOR     │  (FactorEngine → factor_snapshots)
│    STORE     │  (quality_factor, growth_factor, etc.)
└──────┬──────┘
       │ RankingEngine (reads factor_snapshots)
       ▼
┌─────────────┐
│   RANKING    │  QualityEngine.evaluate(EngineInputs)
│   ENGINES    │  GrowthEngine.evaluate(EngineInputs)
│   (8 total)  │  ValuationEngine.evaluate(EngineInputs)
│              │  MomentumEngine.evaluate(EngineInputs)
│              │  RiskEngine.evaluate(EngineInputs)
│              │  StabilityEngine.evaluate(EngineInputs)
│              │  ConfidenceEngine.evaluate(inputs)
│              │  SectorPercentileEngine (cross-sector)
└──────────────┘
```

## Key Finding

**ALL 8 ranking engines are 100% PROVIDER-INDEPENDENT.**

They follow a pure functional pattern:
1. Receive `EngineInputs` (pre-computed data from factor_snapshots/feature_snapshots)
2. Compute scores using mathematical formulas
3. Return typed outputs with commentary

None of them:
- Import ProviderCoordinator
- Import any provider class (Yahoo, Finnhub, Screener, Upstox)
- Import pool or any database connection
- Contain HTTP calls or network requests
- Reference live market data

## Data Dependency Chain

```
EngineInputs (type from stockstory/types.ts)
├── financials: { pe_ratio, eps, roe, roa, roic, debt_to_equity, revenue_growth, etc. }
├── features: { rsi, macd, momentum, volatility, beta, etc. }
├── prices: { close[], trade_date[] }
└── metadata: { sector, market_cap, listing_status }
```

Where EngineInputs are populated FROM database snapshots, NOT from live providers:
- `financial_snapshots` → financials
- `feature_snapshots` → features
- `daily_prices` → prices
- `symbols` → metadata

## Verdict: **RANKINGS_PROVIDER_INDEPENDENT**

The ranking system is architecturally decoupled from providers. Rankings never depend on live prices. The TRACK-36 requirement "Rankings never depend on live prices" is already met in production code. Change #3 in the TRACK-36 spec ("Remove direct provider deps from ranking engines") is a **NO-OP** — the dependency was never there.
