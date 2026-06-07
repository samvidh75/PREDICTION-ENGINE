# SEBI Compliance Hardening — TRACK-44 Agent G

**Generated:** 2026-06-06T21:16:10.391Z
**Files Audited:** 788
**Total Violations Found:** 259

---

## Executive Summary

| Component | Pre-Audit | Post-Audit | Status |
|-----------|-----------|------------|--------|
| ResearchOnlyGuard | MISSING | CREATED | RESOLVED |
| ComplianceBanner | MISSING | CREATED | RESOLVED |
| MarketDataDisclosure | MISSING | CREATED | RESOLVED |

## Violations by Category

| Category | Count |
|----------|-------|
| Investment Advice | 128 |
| Valuation Claim | 44 |
| Performance Claim | 29 |
| Recommendation | 26 |
| Advice | 19 |
| Directive | 4 |
| Risk Claim | 3 |
| Price Target | 3 |
| Guarantee | 3 |

## Non-Compliant Terms Found

- **"/buy/gi"** → "Research Score Positive" (Investment Advice)
- **"/sell/gi"** → "Research Score Negative" (Investment Advice)
- **"/strong buy/gi"** → "High Research Score" (Investment Advice)
- **"/strong sell/gi"** → "Low Research Score" (Investment Advice)
- **"/target price/gi"** → "Historical Price Range" (Price Target)
- **"/recommended/gi"** → "Ranked" (Recommendation)
- **"/outperform/gi"** → "Above Benchmark" (Performance Claim)
- **"/undervalued/gi"** → "Below Historical Median" (Valuation Claim)
- **"/overvalued/gi"** → "Above Historical Median" (Valuation Claim)
- **"/should buy/gi"** → "ranks favorably on" (Directive)
- **"/should sell/gi"** → "ranks below on" (Directive)
- **"/must buy/gi"** → "shows positive indicators on" (Directive)
- **"/best stock/gi"** → "top-ranked security" (Superlative)
- **"/pick of the/gi"** → "top ranking in" (Superlative)
- **"/guaranteed return/gi"** → "Historical Return Range" (Guarantee)
- **"/risk-free/gi"** → "low-volatility" (Risk Claim)
- **"/multibagger/gi"** → "high-growth observation" (Promotional)
- **"/tip\b(?!\s*of)/gi"** → "observation" (Advice)

## Top Files with Violations

| File | Violations |
|------|-----------|
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\services\intelligence\clientIntelligenceProvider.ts | 15 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\services\portfolio\PortfolioEngine.ts | 15 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\predictions\PredictionCredibilityScorer.ts | 14 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\components\OrderTicket.tsx | 13 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\components\charts\CinematicChart.tsx | 12 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\services\charting\BeginnerInterpretationLayer.ts | 12 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\calibration\EngineCalibrationEngine.ts | 10 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\lib\compliance\complianceCopyFilter.ts | 10 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\views\CommunityHub.jsx | 10 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\components\telemetry\ValuationSignal.tsx | 8 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\services\charting\AIAssistedVisualAnalysis.ts | 8 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\stockstory\__tests__\StockStoryEngine.test.ts | 8 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\components\company\FactorTransparencyPanel.tsx | 7 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\services\CompanyIntelligenceEngine.ts | 7 |
| C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\stockstory\docs\PercentileMigrationAudit.md | 7 |

## Replacement Mapping

| Non-Compliant Term | Compliant Replacement |
|-------------------|----------------------|
| "/buy/gi" | "Research Score Positive" |
| "/sell/gi" | "Research Score Negative" |
| "/strong buy/gi" | "High Research Score" |
| "/strong sell/gi" | "Low Research Score" |
| "/target price/gi" | "Historical Price Range" |
| "/recommended/gi" | "Ranked" |
| "/outperform/gi" | "Above Benchmark" |
| "/undervalued/gi" | "Below Historical Median" |
| "/overvalued/gi" | "Above Historical Median" |
| "/should buy/gi" | "ranks favorably on" |
| "/should sell/gi" | "ranks below on" |
| "/must buy/gi" | "shows positive indicators on" |
| "/best stock/gi" | "top-ranked security" |
| "/pick of the/gi" | "top ranking in" |
| "/guaranteed return/gi" | "Historical Return Range" |
| "/risk-free/gi" | "low-volatility" |
| "/multibagger/gi" | "high-growth observation" |
| "/tip\b(?!\s*of)/gi" | "observation" |

## Actions Taken

1. Created `src/compliance/ResearchOnlyGuard.ts` — text sanitizer and validator
2. Created `src/compliance/ComplianceBanner.tsx` — UI banner component
3. Created `src/compliance/MarketDataDisclosure.ts` — data source disclosures
4. Created `src/compliance/index.ts` — barrel export

## Remaining Work

- Integrate ComplianceBanner into App.tsx layout
- Add ResearchOnlyGuard.validate() to API response pipeline
- Add MarketDataDisclosure to all data-displaying components
- Manual review of 259 violations
- Add pre-commit hook to block non-compliant language
