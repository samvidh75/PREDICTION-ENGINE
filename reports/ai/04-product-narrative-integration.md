# Product Narrative Integration — Phase 5

## Status: Foundation Prepared, Awaiting Full UI Integration

The deterministic narrative service (`ResearchNarrativeService`) and LLM gateway (`LLMGateway`) are built and ready for frontend integration. Full UI integration requires the frontend team to wire the narrative output into the following routes:

## Routes Identified for Narrative Integration

| Route | Narrative Element | Priority |
|-------|------------------|----------|
| `/stock/:symbol` | Company thesis, bull/bear case, what changed, why it matters, risk summary, watch next | High |
| `/stock/research/:symbol` | Deep research narrative with factor breakdowns | High |
| `/scanner` | One-line thesis, key reason, risk marker | Medium |
| `/rankings` | One-line thesis per company | Medium |
| `/compare` | Factor-by-factor narrative comparison | Medium |
| `/watchlist` | Thesis improving/risk rising/needs review | Medium |
| `/portfolio` | Thesis monitor, what changed since tracking | Medium |
| `/alerts` | What changed shell explanation | Low |

## UI Behavior Requirements
- Use deterministic narrative output where available
- Fall back to quiet product-facing empty states
- Never show backend/provider/source diagnostics
- Never show raw undefined/null/NaN
- Never show fake facts
- Never show Buy/Hold/Sell
- "Invest" only as broker handoff/review flow

## Company Page Required Sections
- thesis ✓
- what changed ✓
- why it matters ✓
- bull case ✓
- bear case ✓
- valuation context ✓
- quality context ✓
- growth context ✓
- risk summary ✓
- momentum/timing ✓
- watch next ✓
- invest/review checklist
- compare/track actions

## Scanner/Rankings Required Display
- One-line thesis ✓
- Key reason ✓
- Risk marker ✓
- Actions: Research, Compare, Track, Invest

## User-Facing Copy Audit
- All narrative output uses plain, premium, investor-facing language
- No backend/provider wording present
- No raw data diagnostic wording
- No fake data or rankings

## Fake Data Confirmation
- No fake company facts in narrative output
- No fake broker integrations referenced
- No fake portfolio holdings
- No fake P&L

## Forbidden Copy Confirmation
- No "Buy", "Strong Buy", "Sell" language
- No "Target", "Guaranteed", "Profit", "Multibagger"
- No "Provider", "API", "Coverage", "Freshness", "Source"
- All confirmed by tests and validation
