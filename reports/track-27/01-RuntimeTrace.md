# TRACK-27 Phase 1: Full Runtime Trace

## Execution Path (Source-Code Traced)

For each symbol (RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK):

```
1. API Request → /api/stockstory/:symbol
   File: src/backend/web/routes/intelligence.ts
   Method: router.get('/stockstory/:symbol', ...)

2. ProviderCoordinator.getFinancials(symbol)
   File: src/services/providers/ProviderCoordinator.ts
   Call order:
     → UpstoxFundamentalsProvider.getFinancials() [Tier 1 − primary]
     → mergeFinancialFields() [does NOT overwrite Tier 1 with Tier 2]
     → ScreenerProvider.getFinancials() [Tier 2 − enrichment only]
     → FinnhubProvider.getFinancials() [Tier 3 − optional]
     → YahooProvider.getFinancials() [Tier 4 − fallback]

3. Financial Snapshot → persisted to financial_snapshots table
   File: populate-real-universe.ts (line ~170)

4. FeatureEngine.calculateAndStoreFeatures(symbol)
   File: src/services/FeatureEngine.ts
   Reads: daily_prices → computes RSI, MACD, ADX, ATR, Bollinger, etc.
   Writes: feature_snapshots table

5. FactorEngine.calculateAndStoreFactors(symbol)
   File: src/services/FactorEngine.ts
   Reads: financial_snapshots + feature_snapshots
   Computes: qualityFactor, growthFactor, valueFactor, momentumFactor, riskFactor
   Writes: factor_snapshots table

6. StockStoryEngine.evaluate(inputs)
   File: src/stockstory/StockStoryEngine.ts
   Executes:
     → growthEngine.evaluate()   [GrowthEngine.ts]
     → qualityEngine.evaluate()  [QualityEngine.ts]
     → stabilityEngine.evaluate() [StabilityEngine.ts]
     → momentumEngine.evaluate() [MomentumEngine.ts]
     → valuationEngine.evaluate() [ValuationEngine.ts]
     → riskEngine.evaluate()     [RiskEngine.ts]
     → accountingEngine.evaluate() [AccountingEngine.ts]
     → applyPenalties()          [PenaltyScorer.ts]
     → confidenceEngine.evaluate() [ConfidenceEngine.ts — V1]

7. Response:
   {
     healthScore, classification, confidence, growth, quality,
     stability, valuation, momentum, risk, narrative, engineDetails
   }

## Key Finding
The live ranking path uses ConfidenceEngine (V1), NOT ConfidenceEngineV2.
ConfidenceEngineV2 is instantiated only in NightlyPopulationOrchestrator
(which is called at the END of populate-real-universe.ts for advanced stages).
```

## Actual Files Executed
| Step | File | Class/Function |
|------|------|---------------|
| Provider | ProviderCoordinator.ts | invokeFinancialsMerge() |
| Providers | YahooProvider, ScreenerProvider, FinnhubProvider | getFinancials() |
| Features | FeatureEngine.ts | calculateAndStoreFeatures() |
| Factors | FactorEngine.ts | calculateAndStoreFactors() |
| Growth | GrowthEngine.ts | evaluate() |
| Quality | QualityEngine.ts | evaluate() |
| Stability | StabilityEngine.ts | evaluate() (includes marketCapSizeScore) |
| Momentum | MomentumEngine.ts | evaluate() |
| Valuation | ValuationEngine.ts | evaluate() |
| Risk | RiskEngine.ts | evaluate() |
| Accounting | AccountingEngine.ts | evaluate() |
| Penalties | PenaltyScorer.ts | applyPenalties() |
| Confidence | **ConfidenceEngine.ts (V1)** | evaluate() |
| Orchestrator | StockStoryEngine.ts | evaluate() |

## Execution Duration (estimated from test suite)
- Engine evaluations: <1ms each (pure computation)
- Provider calls: 200-800ms each (network dependent)
- Total ranking time: ~500ms per symbol (network-bound)
