# India Market Brain v0

This document defines the first concrete implementation layer for a StockStory India market intelligence engine.

## What was added

`src/systems/market-brain/indiaMarketBrain.ts` adds a pure TypeScript deterministic evaluator for Indian equities. It is intentionally model-agnostic and does not depend on any external data vendor or LLM.

The engine accepts a normalized `IndiaEquityPacket` and returns:

- compliance-safe research state
- conviction score
- quality score
- growth score
- valuation score
- stability score
- momentum score
- risk score
- ownership score
- thesis bullets
- risks to review
- watch-next checklist
- missing evidence domains

The LLM layer should use this output only for explanation. It must not invent facts, scores, or direct recommendations.

## Product rule

Database and deterministic scoring are the source of truth. The LLM is the explanation layer.

Normal users should see research, thesis, conviction, risk, compare, track, review, invest, methodology, what changed, and why it matters. Normal users should not see data-provider plumbing or operational diagnostics.

## Input domains

The v0 evaluator recognizes these domains:

- instrument master
- prices
- fundamentals
- financial statements
- shareholding
- corporate actions
- news and events
- technicals
- sector context

Future versions should connect these to existing ingestion, authorized data feeds, and internal snapshots rather than scraping directly from public UI pages.

## Scoring model

The v0 model uses transparent weighted sub-scores:

- Quality: ROE, ROIC, ROA, operating margin
- Growth: revenue growth, profit growth
- Valuation: PE, PB, EV/EBITDA, FCF yield
- Stability: debt/equity, current ratio, volatility, market cap size
- Momentum: momentum, relative strength, trend strength, volatility
- Risk: leverage, volatility, promoter pledge
- Ownership: promoter holding, promoter pledge, FII/DII holding

The output labels avoid direct recommendation language and stay within research-oriented states:

- High conviction
- Thesis improving
- Watch
- Needs review
- Risk rising

## GitHub repositories reviewed for inspiration

No external code was copied into this repository. The following public repositories were useful as research references for possible future adapters and tooling patterns:

- Tapetide-hq/nse-bse-indian-stock-market-data-mcp
- 0xramm/Indian-Stock-Market-API
- anjulgarg/sharewatch
- ilangurudev/IndianStocksR

Any future integration must be reviewed for license, reliability, legality, data redistribution terms, rate limits, and production suitability before use.

## Next implementation steps

1. Wire `evaluateIndiaEquity` to existing internal normalized stock snapshots.
2. Add unit tests for the factor scoring boundaries.
3. Add a backend-only adapter that converts current engine inputs into `IndiaEquityPacket`.
4. Add a research narrative adapter that converts `IndiaMarketBrainResult` into product-facing copy.
5. Keep provider/API status out of normal frontend routes.
6. Add audit checks to prevent direct recommendation language before compliance review.

## Non-goals

This is not a new LLM. It is the deterministic market brain that a StockStory-specific LLM or explainer can use. It is also not a licensed data feed, a broker integration, or a trading system.
