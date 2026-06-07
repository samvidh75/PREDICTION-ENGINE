# Agent F — Live Evidence Engine

## Verdict: EVIDENCE GENERATED (from alpha_research_registry)

## Daily Evidence (auto-computed)
### 30d Horizon
- **Hit Rate**: 55.03%
- **Sample Size (n)**: 34,980
- **95% CI**: 54.50% – 55.55%
- **Sharpe Ratio**: 0.378
- **Mean Return**: 89.62%
- **Avg Confidence**: 0.0%
- **Calibration Delta** (confidence - hit rate): N/App

### 90d Horizon
- **Hit Rate**: 58.01%
- **Sample Size (n)**: 33,810
- **95% CI**: 57.49% – 58.54%
- **Sharpe Ratio**: 0.368
- **Mean Return**: 245.01%
- **Avg Confidence**: 0.0%
- **Calibration Delta** (confidence - hit rate): N/App

### 365d Horizon
- **Hit Rate**: 69.82%
- **Sample Size (n)**: 28,170
- **95% CI**: 69.28% – 70.35%
- **Sharpe Ratio**: 0.470
- **Mean Return**: 1344.64%
- **Avg Confidence**: 0.0%
- **Calibration Delta** (confidence - hit rate): N/App

## Evidence Generation Schedule
| Frequency | Metric | Computation |
|-----------|--------|------------|
| Daily | Sample size growth | COUNT new validated predictions |
| Weekly | Hit rate trend | Recompute with newly matured outcomes |
| Monthly | Full evidence pack | Hit rate, Sharpe, calibration, CI refresh |
| Quarterly | Model comparison | Current model vs historical benchmarks |

## EvidenceEngine.ts Design
```typescript
export class EvidenceEngine {
  static async generateDaily(): Promise<DailyEvidence>;
  static async generateWeekly(): Promise<WeeklyEvidence>;
  static async generateMonthly(): Promise<MonthlyEvidence>;
  static async publishToTrust(json: TrustCenterData): Promise<void>;
}
```

## Publishing Readiness
- **30d**: ✅ READY (n=34,980, CI width=1.04pp)
- **90d**: ✅ READY (n=33,810, CI width=1.05pp)
- **365d**: ✅ READY (n=28,170, CI width=1.07pp)
