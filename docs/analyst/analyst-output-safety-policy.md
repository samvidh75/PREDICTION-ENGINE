# Analyst Output Safety Policy

## Validation checks

- No unsupported claims or invented numbers
- No fake filings, earnings, sector trends, peers
- No Buy/Sell advice or price targets
- No guaranteed return language
- No backend/provider/GPU wording in public UI
- No undefined/null/NaN in public output
- No raw copyrighted text leak
- No secrets in payloads or logs

## Forbidden user-facing language

Buy now, Strong Buy, Sell immediately, guaranteed return, sure shot, multibagger, risk-free, profit assured, best stock to buy, stock tips

## Allowed language

Research, Thesis, Risk, Compare, Track, Review, What changed, Why it matters, Research basis, Analyst brief, Evidence, Confidence, Needs review, Limited information, Not investment advice

## Escalation

- `auto_publish` — full evidence, validation passed
- `publish_with_limitations` — partial data
- `needs_review` — governance or low confidence
- `do_not_publish` — validation failure
