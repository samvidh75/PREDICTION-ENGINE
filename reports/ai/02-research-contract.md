# Research Output Contract — Phase 3

## Contract Fields

### StockStoryResearchInput
Located: `src/stockstory/research/types.ts`

| Field | Type | Description |
|-------|------|-------------|
| symbol | string | Trading symbol |
| companyName | string | Company display name |
| sector | string | Sector classification |
| score | number | Composite health score 0-100 |
| conviction | number | Conviction/confidence score |
| factorScores | object | { quality, valuation, growth, stability, risk, momentum } |
| factorBreakdowns | object | Detailed sub-scores per factor |
| topPositiveDrivers | string[] | Key positive drivers |
| topNegativeDrivers | string[] | Key negative drivers |
| riskFlags | RiskFlag[] | Identified risk flags |
| valuationContext | ValuationContext | Detailed valuation sub-scores |
| growthContext | GrowthContext | Detailed growth sub-scores |
| qualityContext | QualityContext | Detailed quality sub-scores |
| momentumContext | MomentumContext | Detailed momentum sub-scores |
| whatChangedInputs | string[] | Recent change descriptions |
| peerContext | PeerContext? | Optional peer comparison data |
| dataCompletenessForInternalUseOnly | number | Internal data completeness metric |

### StockStoryNarrativeOutput
| Field | Type | Description |
|-------|------|-------------|
| thesis | string | Company thesis summary |
| bullCase | string | Bull/business case |
| bearCase | string | Bear/risk case |
| whatChanged | string | Recent changes |
| whyItMatters | string | Why the company matters |
| keyRisks | string | Risk summary |
| watchNext | string | What to monitor |
| peerContextSummary | string | Peer comparison context |
| confidenceNote | string | Confidence assessment |
| methodologyNote | string | Methodology disclaimer |
| complianceSafeLabel | string | Safe classification label |

## Validation Rules (ResearchOutputValidator)
Located: `src/stockstory/validation/ResearchOutputValidator.ts`

1. All 11 fields must be present and non-empty strings
2. No forbidden patterns allowed in any field:
   - Buy/Sell recommendations (buy now, strong buy, sell now)
   - Price targets
   - Guarantees
   - Multibagger claims
   - Provider/backend wording
   - API/coverage/database/freshness/source/lineage
   - NaN/N/A/null/undefined

## Forbidden Output Policy
- No hallucinated facts
- No target prices
- No guaranteed returns
- No Buy/Hold/Sell unless compliance-supported
- No invented broker state
- No invented events/news/results

## Valid Output Examples
- "Thesis: The company presents a compelling research profile with strong fundamentals..."
- "BullCase: Business quality is a differentiator..."
- "BearCase: Risk indicators are elevated relative to sector norms..."

## Rejected Output Examples
- ❌ "Buy now for guaranteed returns"
- ❌ "Strong Buy — target price 500"
- ❌ "Provider status: healthy"
- ❌ "This is a multibagger"
- ❌ "API endpoint: /data"

## Tests
- `src/stockstory/validation/__tests__/ResearchOutputValidator.test.ts` — 13 tests
