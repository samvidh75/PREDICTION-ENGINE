# Upstox Architecture Audit — RC-UPSTOX-001

**Generated:** 2026-06-05T15:44:28.877Z

---

## Current Provider Chain

| Category | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|:---------|:-------|:-------|:-------|:-------|
| Quotes | Yahoo | IndianMarket | AlphaVantage | — |
| Metadata | Yahoo | Finnhub | — | — |
| Historical | Yahoo | IndianMarket | AlphaVantage | — |
| Financials | Finnhub | Yahoo (fallback) | — | — |
| News | Finnhub | GoogleNewsRSS | — | — |
| Portfolio | ❌ None | — | — | — |

## Target Provider Chain (RC-UPSTOX-001)

| Category | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|:---------|:-------|:-------|:-------|:-------|
| Quotes | **Upstox** | Yahoo | Registry | — |
| Metadata | Registry | Provider fallback | — | — |
| Historical | **Upstox** | Yahoo | — | — |
| Financials | Finnhub | — | — | — |
| News | Finnhub | GoogleNewsRSS | — | — |
| Portfolio | **Upstox** | — | — | — |

## Provider Changes

| Provider | Before | After | Reason |
|:---------|:-------|:------|:-------|
| Upstox | ❌ Not in chain | ✅ Tier 1 (Quotes, Historical, Portfolio) | Primary broker API; real-time NSE/BSE data |
| Yahoo | Tier 1 (Quotes, Metadata, Historical) | Tier 2 (Quotes, Historical) | Downgraded — Upstox provides more accurate data |
| IndianMarket | Tier 2 (Quotes, Historical) | ❌ Removed | Upstox replaces; Yahoo covers fallback |
| AlphaVantage | Tier 3 (Quotes, Historical) | ❌ Removed | Always optional; never reliable for India |
| Finnhub | Tier 4 (Metadata, Financials, News) | Tier 1 (Financials, News), Tier 2 (Metadata) | Fundamentals unchanged |
| Registry | Tier 2 (Metadata via coordinator) | Tier 1 (Metadata) | MasterCompanyRegistry is authoritative for Indian stocks |

## Files Modified

| File | Change |
|:-----|:-------|
| `ProviderCoordinator.ts` | Add Upstox as Tier 1; reorder chains |
| `UpstoxProvider.ts` (providers/) | NEW — implements PriceProvider + HistoricalProvider + existing interfaces |
| `UpstoxOAuthService.ts` (providers/auth/) | NEW — OAuth 2.0 login + token lifecycle |
| `PortfolioProvider.ts` (portfolio/) | NEW — portfolio ingestion interface |
| `PortfolioSnapshot.ts` (portfolio/) | NEW — normalized snapshot types |
| `PortfolioNormalizer.ts` (portfolio/) | NEW — symbol/ISIN/exchange normalization |

## Breakage Risk

| Existing Dependency | Impact | Mitigation |
|:--------------------|:-------|:-----------|
| `MarketDataGateway.getQuote()` | Upstox added as Tier 1 — existing Yahoo fallback unchanged | No breakage; Yahoo still serves if Upstox fails |
| `MarketDataGateway.getHistory()` | Upstox added as Tier 1 | No breakage |
| `ProviderCoordinator.getFinancials()` | Unchanged | No impact |
| `MetadataProviderCoordinator.getMetadata()` | Unchanged | No impact |
| `brokers/UpstoxProvider.ts` | Replaced by providers/ version | Old file kept as backward-compat re-export |

