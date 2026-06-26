# Policy Guardrails — Phase 10

## Service
Located: `src/stockstory/policy/PolicyGuardrails.ts`

## Blocked Terms (41 patterns)
| Category | Examples |
|----------|---------|
| Guarantees | guaranteed returns, sure shot, target guaranteed |
| Recommendations | buy now, sell immediately, strong buy, strong sell |
| Multibagger | multibagger |
| Price targets | price target, target price |
| Fake data | fake broker, fake order, fake portfolio, fake P&L |
| Backend wording | provider status, provider health, api name, api endpoint |
| Backend diagnostics | coverage diagnostics, freshness unavailable, symbol gap |
| Source/data terms | data source, source label, source lineage |
| Raw data errors | raw quote, raw history, raw fundamental |
| Internal wording | internal verification, database wording, migration, backfill |
| Personal advice | direct personal advice, investment advice, financial advice |
| Invented data | invented source, invented data freshness |
| Broker security | broker credentials, login with broker, connect your broker |

## Allowed Exceptions
- Test files (`__tests__/`, `tests/`, `fixtures/`, `spec`)
- Reports (`reports/`)
- Policy/test source files (PolicyGuardrails, forbiddenCopy)
- Filter library files (complianceCopyFilter, productLanguageCopyFilter)

## Methods
| Method | Returns | Description |
|--------|---------|-------------|
| check(text, context?) | PolicyCheckResult | Check if text contains forbidden terms |
| sanitize(text, context?) | string | Replace forbidden terms with [filtered] |
| validateOutput(output, context?) | { valid, violations } | Check all object fields |

## Tests
Located: `src/stockstory/policy/__tests__/PolicyGuardrails.test.ts` — 16 tests

## Examples Blocked
- ❌ "This stock offers guaranteed returns"
- ❌ "This is a sure shot multibagger"
- ❌ "Buy now for best results"
- ❌ "Strong Buy recommendation"
- ❌ "Price target is 500"
- ❌ "Provider status: active"
- ❌ "Investment advice"
- ❌ "Symbol gap detected in database"

## Examples Allowed
- ✅ "Research this company before investing"
- ✅ "Thesis: The company presents a compelling research profile"
- ✅ "Confidence is supported by available data"
- ✅ "Monitor quarterly results and sector trends"

## Remaining Legal/Compliance Limitations
- Policy guardrails are technical filters, not legal review
- Final compliance review should be performed by qualified legal counsel
- Guardrails operate on text output only — cannot prevent misuse of product features
- Broker handoff flow should have separate compliance review
