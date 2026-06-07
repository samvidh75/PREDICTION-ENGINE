# TRACK-9D Final Verdict

Generated: 2026-06-05T19:32:32.453Z

## Active fields

- peRatio: ValuationEngine; total abs health delta 4, total abs engine/confidence delta 24
- pbRatio: ValuationEngine; total abs health delta 5, total abs engine/confidence delta 20
- roe: QualityEngine; total abs health delta 12, total abs engine/confidence delta 97
- roic: QualityEngine; total abs health delta 10, total abs engine/confidence delta 42
- debtToEquity: StabilityEngine; total abs health delta 28, total abs engine/confidence delta 102
- evEbitda: ValuationEngine; total abs health delta 2, total abs engine/confidence delta 14
- revenueGrowth: GrowthEngine; total abs health delta 6, total abs engine/confidence delta 16
- profitGrowth: GrowthEngine; total abs health delta 4, total abs engine/confidence delta 10
- dividendYield: ConfidenceEngine/Factor only if mapped; total abs health delta 0, total abs engine/confidence delta 1
- marketCap: RiskEngine/ConfidenceEngine; total abs health delta 0, total abs engine/confidence delta 1

## Dead fields

- roa: no measurable runtime score impact
- operatingMargin: no measurable runtime score impact
- bookValue: no measurable runtime score impact
- eps: no measurable runtime score impact
- freeCashFlow: no measurable runtime score impact

## Conclusion

Only fields that changed at least one runtime score are classified as ACTIVE. Populated fields with zero score impact are classified as DEAD under the TRACK-9D rule. No mocked or synthetic values were introduced; all baseline values came through ProviderCoordinator and EngineInputs.
