# Sector Calibration Audit

**Generated:** 2026-06-28T17:47:14.135Z

**Sectors Calibrated:** 7

## Sector Thresholds

| Sector | PE Range | PB Range | Max D/E | Q-Mult | Key Metrics | Factor Weights | Status |
|--------|----------|----------|---------|--------|-------------|----------------|--------|
| Banking | 8–22 | 0.8–3.5 | 15 | 1 | npaRatio, netInterestMargin, casaRatio, loanGrowth | quality:0.35 | valuation:0.25 | momentum:0.2 | risk:0.2 | review |
| IT Services | 15–40 | 2–15 | 0.5 | 1.1 | revenueGrowth, attrition, dealWins, utilization | quality:0.3 | valuation:0.25 | momentum:0.25 | risk:0.2 | review |
| FMCG | 25–70 | 5–25 | 0.5 | 1.2 | volumeGrowth, marketShare, distributionReach, roce | quality:0.4 | valuation:0.2 | momentum:0.2 | risk:0.2 | review |
| Pharmaceuticals | 15–45 | 2–10 | 1 | 1 | fdaCompliance, pipelineStrength, exportShare, rndSpend | quality:0.35 | valuation:0.25 | momentum:0.15 | risk:0.25 | review |
| Automobile | 10–35 | 1–8 | 1.5 | 1 | volumeGrowth, marketShare, evTransition, exportShare | quality:0.3 | valuation:0.25 | momentum:0.25 | risk:0.2 | active |
| Cement | 15–50 | 1.5–8 | 1.5 | 1 | capacityUtilization, realizationPerTon, powerCost, regionalPresence | quality:0.3 | valuation:0.3 | momentum:0.2 | risk:0.2 | active |
| Power | 8–30 | 0.8–5 | 3 | 0.9 | plantLoadFactor, regulatedReturns, receivables, capacityExpansion | quality:0.25 | valuation:0.35 | momentum:0.15 | risk:0.25 | review |
| Default | 10–30 | 1–5 | 1.5 | 1 | revenueGrowth, profitMargin, roce | quality:0.3 | valuation:0.3 | momentum:0.2 | risk:0.2 | active |

## Review Items

### Banking
- **Notes:** High D/E tolerance — flag for capital-intensive sectors

### IT Services
- **Notes:** High PB ceiling — verify for asset-light sectors

### FMCG
- **Notes:** High PE ceiling — verify for cyclical sectors; High PB ceiling — verify for asset-light sectors

### Pharmaceuticals
- **Notes:** High PB ceiling — verify for asset-light sectors

### Power
- **Notes:** High D/E tolerance — flag for capital-intensive sectors

## Test Symbol Validation

| Symbol | Sector | PE Range Valid? | PB Range Valid? | D/E Acceptable? |
|--------|--------|-----------------|-----------------|-----------------|
| RELIANCE | Oil & Gas | ✅ | ✅ | ✅ |
| TCS | IT Services | ✅ | ✅ | ✅ |
| HDFCBANK | Banking | ✅ | ✅ | ✅ |
| ITC | FMCG | ✅ | ✅ | ✅ |
| TATAMOTORS | Automobile | ✅ | ✅ | ❌ |