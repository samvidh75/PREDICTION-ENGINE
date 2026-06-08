# TRACK-71 Agent E — Build Truth (TypeScript)

**Generated:** 2026-06-07T13:38:32.295Z

## TypeScript Compilation

- **Status:** ✗ FAILED (310 errors)

## Error Summary

```
src/backend/web/routes/intelligence.ts(284,46): error TS7006: Parameter 'h' implicitly has an 'any' type.
src/backend/web/routes/intelligence.ts(286,35): error TS7006: Parameter 'curr' implicitly has an 'any' type.
src/backend/web/routes/intelligence.ts(346,45): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/backend/web/routes/intelligence.ts(376,35): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/backend/web/routes/intelligence.ts(423,29): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/backend/web/routes/intelligence.ts(853,48): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/backend/web/routes/intelligence.ts(860,47): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/backend/web/routes/intelligence.ts(899,37): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/backend/web/routes/intelligence.ts(914,33): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/backend/web/routes/system.ts(7,43): error TS2307: Cannot find module 'express' or its corresponding type declarations.
src/backend/web/routes/system.ts(8,10): error TS2724: '"../../../ops/SystemHealthEngine"' has no exported member named 'getSystemHealthEngine'. Did you mean 'SystemHealthEngine'?
src/backend/web/routes/system.ts(11,10): error TS2724: '"../../../explainability/RankingExplanationEngine"' has no exported member named 'getRankingExplanationEngine'. Did you mean 'RankingExplanationEngine'?
src/backtest/BenchmarkEngine.ts(146,38): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/backtest/PortfolioSimulator.ts(57,28): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/backtest/PortfolioSimulator.ts(202,51): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/calibration/DynamicWeightEngine.ts(111,41): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/calibration/EngineCalibrationEngine.ts(114,20): error TS2488: Type 'Promise<CalibrationIssue[]>' must have a '[Symbol.iterator]()' method that returns an iterator.
src/calibration/EngineCalibrationEngine.ts(307,43): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/calibration/EngineCalibrationEngine.ts(313,46): error TS7006: Parameter 'sum' implicitly has an 'any' type.
src/calibration/EngineCalibrationEngine.ts(313,51): error TS7006: Parameter 's' implicitly has an 'any' type.
src/monitoring/RankingHealthMonitor.ts(46,28): error TS2552: Cannot find name 'averageScore'. Did you mean 'avgScore'?
src/portfolio/PortfolioConstructionEngine.ts(95,51): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/portfolio/PortfolioConstructionEngine.ts(150,48): error TS7006: Parameter 'sym' implicitly has an 'any' type.
src/predictions/BenchmarkTracker.ts(85,28): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/predictions/DailyPredictionCapture.ts(143,28): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/predictions/EngineAttributionAnalyzer.ts(24,22): error TS2322: Type '"quality_score"' is not assignable to type 'number | unique symbol | "repeat" | "charAt" | "charCodeAt" | "concat" | "indexOf" | "lastIndexOf" | "localeCompare" | "match" | "replace" | "search" | "slice" | "split" | "substring" | ... 35 more ... | "valueOf"'.
src/predictions/EngineAttributionAnalyzer.ts(25,21): error TS2322: Type '"growth_score"' is not assignable to type 'number | unique symbol | "repeat" | "charAt" | "charCodeAt" | "concat" | "indexOf" | "lastIndexOf" | "localeCompare" | "match" | "replace" | "search" | "slice" | "split" | "substring" | ... 35 more ... | "valueOf"'.
src/predictions/EngineAttributionAnalyzer.ts(26,20): error TS2322: Type '"value_score"' is not assignable to type 'number | unique symbol | "repeat" | "charAt" | "charCodeAt" | "concat" | "indexOf" | "lastIndexOf" | "localeCompare" | "match" | "replace" | "search" | "slice" | "split" | "substring" | ... 35 more ... | "valueOf"'.
src/predictions/EngineAttributionAnalyzer.ts(27,23): error TS2322: Type '"momentum_score"' is not assignable to type 'number | unique symbol | "repeat" | "charAt" | "charCodeAt" | "concat" | "indexOf" | "lastIndexOf" | "localeCompare" | "match" | "replace" | "search" | "slice" | "split" | "substring" | ... 35 more ... | "valueOf"'.
src/predictions/EngineAttributionAnalyzer.ts(28,19): error TS2322: Type '"risk_score"' is not assignable to type 'number | unique symbol | "repeat" | "charAt" | "charCodeAt" | "concat" | "indexOf" | "lastIndexOf" | "localeCompare" | "match" | "replace" | "search" | "slice" | "split" | "substring" | ... 35 more ... | "valueOf"'.
src/predictions/EngineAttributionAnalyzer.ts(29,21): error TS2322: Type '"sector_score"' is not assignable to type 'number | unique symbol | "repeat" | "charAt" | "charCodeAt" | "concat" | "indexOf" | "lastIndexOf" | "localeCompare" | "match" | "replace" | "search" | "slice" | "split" | "substring" | ... 35 more ... | "valueOf"'.
src/predictions/EngineAttributionAnalyzer.ts(64,23): error TS7053: Element implicitly has an 'any' type because expression of type 'number | unique symbol | "repeat" | "charAt" | "charCodeAt" | "concat" | "indexOf" | "lastIndexOf" | "localeCompare" | "match" | "replace" | "search" | "slice" | "split" | "substring" | ... 35 more ... | "valueOf"' can't be used to index type 'PredictionRecord'.
  No index signature with a parameter of type 'number' was found on type 'PredictionRecord'.
src/predictions/HistoricalRankingRebuilder.ts(158,28): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/predictions/PredictionFactory.ts(33,40): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/predictions/PredictionRegistry.ts(292,28): error TS7006: Parameter 'row' implicitly has an 'any' type.
src/providers/yfinance/CorporateActionsEngine.ts(274,37): error TS7016: Could not find a declaration file for module 'yfinance'. 'C:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/node_modules/yfinance/dist/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/yfinance` if it exists or add a new declaration (.d.ts) file containing `declare module 'yfinance';`
src/providers/yfinance/DailyMarketUpdater.ts(8,16): error TS7016: Could not find a declaration file for module 'yfinance'. 'C:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/node_modules/yfinance/dist/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/yfinance` if it exists or add a new declaration (.d.ts) file containing `declare module 'yfinance';`
src/providers/yfinance/DailyMarketUpdater.ts(128,57): error TS2576: Property 'toYahooSymbol' does not exist on type 'IndianSymbolMapper'. Did you mean to access the static member 'IndianSymbolMapper.toYahooSymbol' instead?
src/providers/yfinance/DailyMarketUpdater.ts(135,32): error TS2576: Property 'toYahooSymbol' does not exist on type 'IndianSymbolMapper'. Did you mean to access the static member 'IndianSymbolMapper.toYahooSymbol' instead?
src/providers/yfinance/DailyMarketUpdater.ts(373,33): error TS2339: Property 'getUniverseSymbols' does not exist on type 'IndianSymbolMapper'.
src/providers/yfinance/DailyMarketUpdater.ts(374,39): error TS7006: Parameter 's' implicitly has an 'any' type.
src/providers/yfinance/DailyMarketUpdater.ts(374,57): error TS2576: Property 'toYahooSymbol' does not exist on type 'IndianSymbolMapper'. Did you mean to access the static member 'IndianSymbolMapper.toYahooSymbol' instead?
src/providers/yfinance/HistoricalUniversePopulator.ts(64,33): error TS2554: Expected 2 arguments, but got 0.
src/providers/yfinance/HistoricalUniversePopulator.ts(200,44): error TS2339: Property 'downloadBatch' does not exist on type 'YFinanceBatchProvider'.
src/providers/yfinance/HistoricalUniversePopulator.ts(233,11): error TS2322: Type 'BackfillSymbolResult' is not assignable to type 'number'.
src/providers/yfinance/HistoricalUniversePopulator.ts(233,65): error TS2345: Argument of type 'any[]' is not assignable to parameter of type '"1D" | "1W" | "1M" | "3M" | "1Y" | "5Y" | "6M" | "Max"'.
src/providers/yfinance/HistoricalUniversePopulator.ts(245,53): error TS2339: Property 'computeQualityScore' does not exist on type 'MarketDataIntegrityEngine'.
src/providers/yfinance/YFinanceBatchProvider.ts(12,16): error TS7016: Could not find a declaration file for module 'yfinance'. 'C:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/node_modules/yfinance/dist/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/yfinance` if it exists or add a new declaration (.d.ts) file containing `declare module 'yfinance';`
src/providers/yfinance/YFinanceProvider.ts(11,16): error TS7016: Could not find a declaration file for module 'yfinance'. 'C:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/node_modules/yfinance/dist/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/yfinance` if it exists or add a new declaration (.d.ts) file containing `declare module 'yfinance';`
src/scripts/calibrate.ts(78,52): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/scripts/calibrate.ts(87,50): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/scripts/calibrate.ts(96,56): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/scripts/calibrate.ts(151,23): error TS2339: Property 'trade_date' does not exist on type '{}'.
src/scripts/calibrate.ts(152,17): error TS2339: Property 'trade_date' does not exist on type '{}'.
src/scripts/calibrate.ts(153,20): error TS2339: Property 'trade_date' does not exist on type '{}'.
src/scripts/calibrate.ts(154,27): error TS2339: Property 'trade_date' does not exist on type '{}'.
src/scripts/calibrate.ts(157,19): error TS2339: Property 'rsi' does not exist on type '{}'.
src/scripts/calibrate.ts(157,45): error TS2339: Property 'rsi' does not exist on type '{}'.
src/scripts/calibrate.ts(158,20): error TS2339: Property 'macd' does not exist on type '{}'.
src/scripts/calibrate.ts(158,47): error TS2339: Property 'macd' does not
```


... truncated (36821 total chars)

## Verdict

✗ 310 TypeScript errors must be fixed.
