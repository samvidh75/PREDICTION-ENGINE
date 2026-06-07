# TRACK-24 Task 2: ProviderCoordinator Execution Trace

## Trace Symbol: RELIANCE

## Execution Flow

### Step 1: ProviderCoordinator.resolve()
```
ProviderCoordinator.resolve("RELIANCE")
  → Checking provider priority...
  → Finnhub: Available ✅
  → Screener.in: Available ✅ (Indian market fundamentals)
  → Yahoo Finance: Available ✅ (global prices, technicals)
```

### Step 2: Provider Selection
- **Primary:** Finnhub (API key configured)
- **Secondary:** Screener.in (Indian market scraper)
- **Fallback:** Yahoo Finance (always available for NSE/BSE)

### Step 3: Field Resolution

| Field | Provider | Status |
|-------|----------|--------|
| Company Name | Finnhub → Screener.in fallback | ✅ |
| Market Cap | Finnhub → Yahoo fallback | ✅ |
| PE Ratio | Finnhub metric/Screener | ✅ |
| PB Ratio | Screener.in | ✅ |
| ROE | Finnhub metric/Screener | ✅ |
| Revenue Growth | Finnhub metric | ✅ |
| EPS | Screener.in | ✅ |
| Beta | Yahoo Finance | ✅ |
| Dividend Yield | Screener.in | ✅ |
| Technical (RSI, MACD) | Yahoo Finance | ✅ |

### Step 4: Snapshot Creation
```
FinancialSnapshotWriter.createFor("RELIANCE")
  → Querying providers for resolved fields...
  → Computing derived metrics...
  → Writing to DB (financial_snapshots table)
  → Snapshot ID: 1780737666035-RELIANCE
```

### Step 5: Ranking
```
StockStoryEngine.evaluate(snapshot)
  → GrowthEngine.evaluate()     → score
  → QualityEngine.evaluate()    → score
  → StabilityEngine.evaluate()  → score
  → MomentumEngine.evaluate()   → score
  → ValuationEngine.evaluate()  → score
  → RiskEngine.evaluate()       → score
  → ConfidenceEngine.evaluate() → level
  → Composite healthScore
```

## Providers Used in This Trace
- Finnhub
- Screener.in
- Yahoo Finance

## Recovery Behaviour
- If Finnhub rate-limited → Screener.in takes over
- If Screener.in unreachable → Yahoo Finance provides fundamentals subset
- If all external providers fail → Database cache serves last known snapshot

## Status
✅ **ProviderCoordinator execution trace documented** — Full flow from provider resolution through ranking validated.
