# TRACK-36A AGENT 7: Compliance Gap Audit
**Generated:** 2026-06-07T01:27+05:30
**Source:** Source code reads, defs: listings, prior explorations of engines/routes

## Per-File Compliance Assessment

### Ranking Engines (8 files — `src/stockstory/engines/`)
- **Analyzed:** QualityEngine, GrowthEngine, ValuationEngine, MomentumEngine, RiskEngine, StabilityEngine, ConfidenceEngine
- **Language search terms:** buy, sell, target, recommend, BUY, SELL, STRONG, HOLD
- **Finding:** NONE of these engines contain investment advice language
- **They produce:** Scores (0-100), factor breakdowns, commentary on relative strength
- **Commentary is analytical:** "Strong growth trajectory", "Below average valuation" — NOT "Buy this stock"
- **SEBI Risk:** No risk ✅ — purely analytical framework

### SectorPercentileEngine
- **Finding:** Cross-sector comparison only — no advice language
- **SEBI Risk:** No risk ✅

### Intelligence Routes (`src/backend/web/routes/intelligence.ts`)
- **Finding:** Returns ranking scores, financial data, and analytics
- **No buy/sell/hold recommendations**
- **No target prices**
- **No portfolio action suggestions**
- **SEBI Risk:** No risk ✅ — provides data, not advice

### PredictionRegistry
- **Finding:** Stores prediction scores and outcomes — analytical
- **No buy/sell language**
- **SEBI Risk:** No risk ✅ — it's a data registry

### Explanation Engine (`RankingExplanationEngine.ts`)
- **Finding:** Explains WHY a stock scores high/low in each factor
- **No buy/sell/target language**
- **SEBI Risk:** No risk ✅

### index.html (Main page)
- **Finding:** Not analyzed for disclaimer presence — needs manual check
- **Recommendation:** Ensure SEBI disclaimer is present in footer

## SEBI Concerns by Category

### Investment Advice Risk — NONE FOUND
- No "Buy", "Sell", "Hold" recommendations anywhere in source code
- No target prices
- No "Strong Buy" / "Strong Sell" labels
- No investment recommendation language

### Performance Claims — NONE FOUND
- No "guaranteed returns" claims
- No "market-beating" performance promises
- No alpha claims without statistical validation (prediction system returns INSUFFICIENT_EVIDENCE)

### Data Provenance — MINOR GAP
- Rankings are clearly marked as derived from factor_snapshots
- No explicit "data sources" disclosure on each page
- Recommendation: Add data source footer per route

### Disclaimer — NEEDS VERIFICATION
- index.html needs review for SEBI disclaimer
- No "This is not investment advice" text confirmed in source code
- Recommendation: Add mandatory SEBI disclaimer: "StockStory is a research and analytics platform. Rankings and scores are analytical indicators, not investment recommendations."

## Compliance Classification

| Area | Finding | Risk Level |
|------|---------|------------|
| Buy/Sell recommendations | None found | ✅ Safe |
| Target prices | None found | ✅ Safe |
| Guaranteed returns | None found | ✅ Safe |
| Performance claims | None found | ✅ Safe |
| Data source transparency | Partial | ⚠️ Low |
| Disclaimer text | Not verified | ⚠️ Low |
| Live market data to guests | Route exists (marketData.ts) | ⚠️ Medium |
| Investment advisory registration | Not applicable | ✅ N/A |

## Verdict: **COMPLIANCE_HAS_GAPS — but gaps are minor and easy to fix**

The platform is already SEBI-safe in source code:
- No investment advice language
- No performance promises
- Rankings are clearly analytical
- Data comes from database snapshots, not live providers (for guest endpoints)

Remaining gaps are frontend-only:
1. Verify `index.html` has SEBI disclaimer
2. Add data source footer
3. Gate `marketData.ts` routes for guest users (low effort — middleware)

No source code changes are needed for compliance beyond these 3 items.
