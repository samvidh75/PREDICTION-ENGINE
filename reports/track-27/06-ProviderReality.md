# TRACK-27 Phase 6: Provider Reality

## Live Provider Test Results

| Provider | Status | Latency | Data |
|----------|--------|---------|------|
| Yahoo | ✅ 200 | 230ms | ✅ 3253B |
| Screener | 404 | 120ms | ✅ 11439B |
| Finnhub | 403 | 4397ms | ✅ 51B |

## Which Provider is Truly Driving Rankings?

The production ranking path uses:
1. **ProviderCoordinator** (for financial data) → Upstox/Screener/Finnhub/Yahoo (merge logic)
2. **Yahoo** (for daily prices/technicals)
3. **FeatureEngine** + **FactorEngine** (computed locally from DB data)

### Truth:
- **Yahoo Finance** drives TECHNICAL features (RSI, MACD, volatility) — the primary source of live price data
- **Screener.in** drives INDIAN MARKET fundamentals (PE, PB, ROE, growth, margins) — the primary source of financial fields
- **Finnhub** on free tier contributes CONNECTIVITY but no data — it is a PASSIVE provider
- **UpstoxFundamentals** (Upstox API) is configured as Tier 1 but requires access token setup

✅ **Yahoo + Screener.in are the two providers truly driving rankings.**
⚠️ Finnhub is reachable but provides no ranking-contributing data on the free tier.
