# Intelligence Architecture Audit — Part 7

**Date:** 2026-06-28 | **Commit:** `af5e6079`

## System Classification

| System | Existing Files | Current Capability | Missing Intelligence Depth | Action |
|---|---|---|---|---|
| Financial Engine | `engines/FinancialEngine.ts` + `services/…/FinancialEngine/` (3 sub-scorers) | Quality/growth/debt scoring | No moat, earnings quality, or factor attribution | Enhance via new engines |
| Technical Engine | `engines/TechnicalEngine.ts` + `services/…/TechnicalEngine/` (3 sub-scorers) | Momentum/trend/volatility scoring | No regime classification, no overextended detection | Build Technical Regime Engine |
| Valuation Engine | `engines/ValuationEngine.ts` + `services/…/ValuationEngine/` (5 sub-scorers) | PE/PB/EV-EBITDA/FCF/Div scoring | No valuation regime (contextual classification) | Build Valuation Regime Engine |
| News Engine | `engines/NewsEngine.ts` + `services/…/NewsEngine/` (4 sub-scorers) | Sentiment/volume/recency/source scoring | No catalyst extraction, no event impact mapping | Build Catalyst Engine |
| Earnings Engine | `engines/EarningsEngine.ts` + `services/…/EarningsEngine/` (4 sub-scorers) | Beat/consistency/forward/quality scoring | No earnings quality depth (cash flow, margin stability) | Build Earnings Quality Engine |
| Risk Engine | `engines/RiskEngine.ts` + `services/…/RiskEngine/` (5 sub-scorers) | Financial/business/volatility/downside/tail risk | No governance, ownership, liquidity risk aggregation | Build Risk Radar + Governance + Ownership |
| Sector Engine | `engines/SectorEngine.ts` + `services/…/SectorEngine/` (5 sub-scorers) | Relative quality/growth/valuation/momentum/position | No sector-level intelligence profile, no peer graph | Build Sector Profile + Peer Graph |
| Event Engine | `engines/EventEngine.ts` + `services/…/EventEngine/` (3 sub-scorers) | Catalyst detection/impact/timing | Needs integration with Catalyst Engine | Build Catalyst Engine |
| RAG Engine | `engines/RAGEngine.ts` + `services/…/RAGEngine/` (5 sub-scorers, VectorStore) | Pattern/knowledge/macro/coverage/outcome scoring | No research memory persistence | Build Research Memory |
| LLM Explainer | `llm/LLMExplainer.ts` + 8 prompt files | Deterministic + cached + external LLM explain | Needs upgrade for deep intelligence signals | Upgrade Explainability |
| Orchestrator | `orchestrator/StockStoryOrchestrator.ts` | Parallel engine run + composite + classification | No deep intelligence pipeline integration | Update orchestrator |
| Scanner | `pages/ScannerPage.tsx` + `scoringEngine.ts` | Basic quality/value/momentum/stable scans | No NL queries, no opportunity classification | Build NL Scanner + Opportunity Classifier |
| Watchlist | `pages/` (PlaceholderPage) | Placeholder only | No thesis tracking, no alert intelligence | Build Watchlist Intelligence |
| Portfolio | `portfolio/` (4 files: Construction, Outcome, Sizing, types) | Theoretical portfolio construction | No thesis monitor (without fake P&L) | Build Portfolio Thesis Monitor |
| Evidence | `evidence/` (3 files: Collector, Types, Validator) | Evidence collection and validation | Needs integration with signals | Integrate with Signal Registry |

## Directory Status

All 20 new intelligence directories need creation. Existing foundations:
- ✅ Types (comprehensive `IntelligenceInput` and `StockIntelligenceReport`)
- ✅ LLM prompts (8 domain-specific prompts)
- ✅ Evidence system (collector + validator)
- ✅ Compliance (policy + text guard + forbidden language validator)
- ✅ Validation (numeric claim, research claim, output sanitizer)
- ✅ Confidence model
- ✅ Scoring utilities
