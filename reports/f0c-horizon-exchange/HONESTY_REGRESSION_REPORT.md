# F0C Honesty Regression Report

## Exchange Display Repair

Previous behaviour in `src/pages/StockStoryPage.tsx`:

```ts
const exchange = metadata.data?.exchange || liveQuote.quote?.exchange || "NSE";
```

This invented `NSE` when exchange metadata was absent.

Current behaviour:

```ts
function formatExchange(metadataExchange?: string | null, quoteExchange?: string | null): string {
  const exchange = metadataExchange || quoteExchange;
  return exchange && exchange.trim().length > 0 ? exchange : "Data unavailable";
}
```

If metadata and live quote exchange are absent, the UI renders:

```text
Data unavailable
```

## Regression Tests

`src/pages/StockStoryPage.test.tsx` proves:

- missing exchange renders `Data unavailable`
- missing exchange does not render invented `NSE`
- every supported horizon is sent to `/api/stockstory/:ticker?horizon=...`
- changing horizon updates visible analysis
- `WhyItChangedTab` receives the selected horizon
- cache keys are horizon-specific

`src/backend/web/routes/__tests__/stockstory.horizon.test.ts` proves:

- unsupported horizon values return `400`
- selected supported horizon is passed to `prediction_registry`

`src/backend/web/routes/__tests__/predictionExplain.horizon.test.ts` proves:

- unsupported explanation horizon values return `400`
- selected horizon is passed to the explanation engine and freshness query

## Static Scan Evidence

Scan command:

```bash
rg -n 'exchange.*\|\|.*"NSE"|metadata\.data\?\.exchange \|\||liveQuote\.quote\?\.exchange \|\| "NSE"' \
  src/pages/StockStoryPage.tsx
```

Result: no matches.

## No Cross-Horizon Cache Collision

The client-side StockStory cache uses:

```text
stockstory:<TICKER>:horizon:<HORIZON>
```

Regression assertion:

```ts
expect(makeStockStoryCacheKey("TCS", 30)).not.toBe(makeStockStoryCacheKey("TCS", 90));
```
