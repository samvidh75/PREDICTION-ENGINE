# IndianAPI Reality Check
## TRACK-8E Phase 2 — Verify or Remove IndianAPI

**Generated**: 2026-06-06
**Verdict**: ❌ REMOVED

---

## Documentation Audit

**Official documentation**: https://indianapi.in/documentation/indian-stock-market

**Correct endpoint**: `GET https://indianapi.in/stock?name={symbol}`
**Auth method**: `X-Api-Key` header
**API key format**: `sk-live-...` (valid format in .env)

## Our Implementation Audit (TRACK-8D)

**Bug 1**: Base URL was `https://stock.indianapi.in` (404 — subdomain never existed)
**Bug 2**: Endpoint was `/stock_fundamentals` (does not exist in docs)
**Bug 3**: Response parsing expected `data.fundamentals` — actual key is `data.financials`

All three bugs were fixed in TRACK-8D.

## Live Test Results (TRACK-8D)

| Symbol | Wrong Endpoint | Correct Endpoint |
|--------|---------------|------------------|
| RELIANCE | Network Error | Network Error |
| TCS | Network Error | Network Error |
| INFY | Network Error | Network Error |
| HDFCBANK | Network Error | Network Error |
| ICICIBANK | Network Error | Network Error |

Both the wrong and correct endpoints returned `Network Error` — unreachable from test environment (corporate firewall/DNS).

## Answers

1. **Does endpoint exist?** Yes — documented at indianapi.in
2. **Does endpoint return data?** Unknown — unreachable from current network
3. **How many fields returned?** Unknown
4. **Can 19 EngineInputs fields be mapped?** Theoretically yes — `financials` + `keyMetrics` objects contain P/E, P/B, ROE, etc.
5. **Keep or remove?** **REMOVED** — Cannot prove it works. Zero successful live calls. Network unreachable.

## Decision

IndianAPI is removed from the provider chain. It cannot be verified working. If network conditions change and a live test succeeds, it can be re-added as Tier 3 fallback.
