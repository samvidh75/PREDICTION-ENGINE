# Provider Chain — Final Architecture
## TRACK-8E Phase 3 — ProviderCoordinator Refactor Complete

**Generated**: 2026-06-06

---

## Final Provider Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ StockStory India — Provider Chain                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Quotes:       Upstox → Yahoo → Registry fallback           │
│  Metadata:     Registry → Finnhub → Yahoo                    │
│  Historical:   Upstox → Yahoo                                │
│  Financials:   UpstoxFundamentals → Finnhub → Yahoo          │
│  News:         Finnhub → Google News RSS                     │
│  Portfolio:    Upstox (getHoldings/getPositions/getFunds)    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Financials Chain (detailed)

| Tier | Provider | Status | Coverage |
|------|----------|--------|----------|
| 1 | UpstoxFundamentals | ✅ Coded (needs live token) | 100% Indian stocks |
| 2 | Finnhub | ⚠️ 403 (key expired) | Indian stocks via .NS |
| 3 | Yahoo | ✅ Fallback (minimal data) | Limited Indian |

## Provider Inventory

### Active
| Provider | Interfaces | Auth | Cost |
|----------|-----------|------|------|
| UpstoxProvider | BrokerProvider, PriceProvider*, HistoricalProvider* | OAuth | Free |
| UpstoxFundamentalsProvider | FinancialProvider | OAuth | Free |
| YahooProvider | PriceProvider, MetadataProvider, HistoricalProvider, FinancialProvider | Free tier | Free |
| FinnhubProvider | MetadataProvider, NewsProvider, FinancialProvider | API Key | Free tier |
| GoogleNewsRssProvider | NewsProvider | None | Free |

*Pre-existing architectural issue: UpstoxProvider doesn't implement PriceProvider/HistoricalProvider interfaces but is pushed to those chains (TS errors exist in original code).

### Removed
| Provider | Reason |
|----------|--------|
| AlphaVantageProvider | Empty NSE returns, 0/19 fields |
| IndianAPIProvider | Wrong endpoints, unreachable |
| DhanProvider | Never existed |
| TwelveDataProvider | Never existed |
| FMPProvider | Never existed |

## TypeScript Status
- `tsc --noEmit`: 2 pre-existing errors (UpstoxProvider interface mismatch)
- No new errors introduced by TRACK-8E cleanup
