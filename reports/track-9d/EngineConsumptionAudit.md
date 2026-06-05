# TRACK-9D Engine Consumption Audit

Generated: 2026-06-05T19:32:32.453Z

A field is marked used only if nulling it changed health score or at least one direct engine/confidence score at runtime.

| Field | Declared/expected engine | Runtime used? | Total abs health delta | Total abs engine/confidence delta | Status |
| --- | --- | --- | ---: | ---: | --- |
| peRatio | ValuationEngine | YES | 4 | 24 | ACTIVE |
| pbRatio | ValuationEngine | YES | 5 | 20 | ACTIVE |
| roe | QualityEngine | YES | 12 | 97 | ACTIVE |
| roic | QualityEngine | YES | 10 | 42 | ACTIVE |
| roa | No StockStory engine input consumer | NO | 0 | 0 | DEAD |
| debtToEquity | StabilityEngine | YES | 28 | 102 | ACTIVE |
| evEbitda | ValuationEngine | YES | 2 | 14 | ACTIVE |
| revenueGrowth | GrowthEngine | YES | 6 | 16 | ACTIVE |
| profitGrowth | GrowthEngine | YES | 4 | 10 | ACTIVE |
| operatingMargin | QualityEngine/StabilityEngine | NO | 0 | 0 | DEAD |
| dividendYield | ConfidenceEngine/Factor only if mapped | YES | 0 | 1 | ACTIVE |
| bookValue | Not in EngineInputs schema | NO | 0 | 0 | DEAD |
| marketCap | RiskEngine/ConfidenceEngine | YES | 0 | 1 | ACTIVE |
| eps | ConfidenceEngine/general only | NO | 0 | 0 | DEAD |
| freeCashFlow | Not in EngineInputs schema | NO | 0 | 0 | DEAD |
