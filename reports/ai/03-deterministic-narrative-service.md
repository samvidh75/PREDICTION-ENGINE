# Deterministic Narrative Service — Phase 4

## Service
Located: `src/stockstory/research/ResearchNarrativeService.ts`

## Methods
| Method | Input | Output |
|--------|-------|--------|
| generateCompanyThesis | StockStoryResearchInput | string |
| generateBullCase | StockStoryResearchInput | string |
| generateBearCase | StockStoryResearchInput | string |
| generateWhatChanged | StockStoryResearchInput | string |
| generateWhyItMatters | StockStoryResearchInput | string |
| generateWatchNext | StockStoryResearchInput | string |
| generateRiskSummary | StockStoryResearchInput | string |
| generatePeerContext | StockStoryResearchInput | string |
| generateComplianceSafeLabel | StockStoryResearchInput | string |
| generateFullNarrative | StockStoryResearchInput | StockStoryNarrativeOutput |

## Templates Created
- Company thesis: 5 classification levels (Excellent/Healthy/Stable/Weakening/At Risk)
- Bull case: Quality differentiator, valuation + quality combo, momentum, stability
- Bear case: Risk elevation, demanding valuation, risk flags, technical weakness, growth lag
- What changed: Recent developments list + improving/declining thesis assessment
- Why it matters: Quality + growth, stability + valuation, momentum, sector context
- Watch next: Quarter results, valuation signals, debt servicing, price trends, sector factors
- Risk summary: Flag descriptions or clean state
- Peer context: Percentile rank + strengths/weaknesses when available
- Methodology: Static deterministic note
- Safe labels: Research — {Strong/Healthy/Stable} Profile / Needs Review / Elevated Risk

## Input/Output Examples

### Input: Score 85, Quality 85, Growth 75, Valuation 60
**Thesis**: "Excellent Co presents a compelling research profile with strong fundamentals across quality, growth, and financial stability."

### Input: Score 25, Quality 20, Risk 80
**Thesis**: "Risky Co registers elevated risk indicators. This is better suited as a research candidate than an immediate action candidate."

## Validation Result
- All narrative outputs pass ResearchOutputValidator
- No forbidden patterns in any output
- All fields populated with non-empty strings

## Tests
Located: `src/stockstory/research/__tests__/ResearchNarrativeService.test.ts` — 27 tests

Edge cases covered:
- High quality + expensive valuation
- Low debt + weak growth
- Strong momentum + high risk
- Missing technicals
- Missing valuation
- High dividend trap
- Smallcap risk
- Null-heavy input
- Forbidden copy blocked
- No hallucinated facts

## Limitations
- Templates are static and may produce repetitive language across similar companies
- No semantic understanding — templates fire based on score thresholds
- Peer context requires peer data to be loaded
- WhatChanged requires external inputs (not auto-detected)

## Future LLM Preparation
- The StockStoryNarrativeOutput contract is LLM-ready
- Templates define the expected tone and structure
- LLM can refine existing templates without changing the contract
- Validation layer is LLM-agnostic and will validate any provider output
