# 05 — Provider Scorecards

**TRACK-20 Phase 2 — Task 6**
**Date:** 2026-06-06

---

## Scoring Methodology

Each provider is scored on 5 dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Coverage** | 30% | % of 505-symbol universe covered; % of 20 required fields covered |
| **Accuracy** | 25% | Trustworthiness of data; verified vs. derived vs. scraped |
| **Staleness** | 15% | Data freshness; real-time vs. daily vs. quarterly |
| **Reliability** | 20% | API uptime; rate limits; breaking change frequency |
| **Cost** | 10% | API fees; infrastructure; operational overhead |

Each dimension scored 0-100. Weighted composite = overall score.

---

## 1. FinnhubProvider

**Overall Score: 85/100 — BEST AVAILABLE OPTION**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coverage | 90/100 | Covers ~90% of 505 Indian equities. Provides 18/20 financial fields (roa and freeFloat missing). NSE ticker support with `.NS` suffix. |
| Accuracy | 85/100 | API-derived from SEC/SEBI filings. Not scraped. Some fields are TTM-derived (fcfYield, debtToEquity fallbacks) which may differ from company-reported ratios. |
| Staleness | 80/100 | Quarterly financials are lagging. TTM estimates update more frequently but are computed not reported. Prices are real-time. |
| Reliability | 80/100 | Professional API with documented SLA. Free tier: 60 req/min. Basic ($89/mo): 300 req/min. 99.5%+ uptime. |
| Cost | 90/100 | Free tier sufficient for 505 symbols (~8 min). Basic tier ($89/mo) provides headroom. No hidden infra costs. |

**Verdict:** ✅ **PRIMARY**. Finnhub should be StockStory's primary financial provider. It eliminates the Upstox user-bound dependency, covers 500+ symbols, and costs $0 on the free tier. The only gaps (roa, freeFloat) can be filled by DerivedMetricsEngine or NSE data.

**Blockers:** Requires `FINNHUB_API_KEY` env var. Currently not configured.

---

## 2. YahooProvider (v8 Chart API — Price/History)

**Overall Score: 78/100 — UNIQUE VALUE (only price provider)**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coverage | 75/100 | Covers ~95% of NSE-listed stocks. Some microcaps missing. Provides NO financials (v10 blocked). Price/history only. |
| Accuracy | 95/100 | Exchange-sourced OHLCV data. Split/dividend adjusted. High trust. |
| Staleness | 90/100 | Prices within 15 min delay (NSE). History available back 2+ years. |
| Reliability | 60/100 | Unofficial API. Rate limits change without notice. Circuit breaker trips frequently (TRACK-19A: 265 failures out of 280). BUT essential — no alternative for daily prices. |
| Cost | 85/100 | Free. No auth. No key. Pure public endpoint. |

**Verdict:** ✅ **ESSENTIAL**. Irreplaceable for daily price history. The reliability problem is solvable with proper batching and cooldowns. Must be hardened with circuit breaker awareness (Task 12).

**Blockers:** Circuit breaker handling in pipeline. 2-year OHLCV history fetch causes rate limiting.

---

## 3. UpstoxFundamentalsProvider

**Overall Score: 65/100 — HIGH QUALITY, USER-BOUND**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coverage | 50/100 | Covers only symbols with verified ISINs (~135/280). 96% success when ISIN exists. But requires ISIN → no coverage for 455 unmapped symbols. |
| Accuracy | 95/100 | Official Upstox v2 API. Exchange-verified. Balance-sheet sourced (total_asset, total_liability). ROA and ROIC directly provided — rare. |
| Staleness | 75/100 | Updated quarterly (post-earnings). No TTM estimates. Lag of up to 90 days for latest quarter. |
| Reliability | 40/100 | **CRITICAL FLAW:** Requires user OAuth token. In unattended pipeline, token expires and cannot be refreshed. Server-side `UPSTOX_ACCESS_TOKEN` env var is a workaround, not a solution. |
| Cost | 65/100 | Free (Upstox API is bundled with trading accounts). But operational cost of maintaining valid token is high. |

**Verdict:** ⚠️ **OPTIONAL — demote to enrichment**. High-quality data but user-bound. Cannot be the backbone of an autonomous pipeline. Keep as Tier 2 enrichment when token is available; never a dependency.

**Blockers:** OAuth token lifecycle. Not suitable for unattended operation.

---

## 4. ScreenerProvider

**Overall Score: 55/100 — FRAGILE SCRAPER**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coverage | 70/100 | Covers ~90% of listed Indian companies. Provides 8 enrichment fields (growth, margins, liquidity). But ~10% small caps return 404. |
| Accuracy | 60/100 | HTML-scraped data. Dependent on Screener.in's page structure. Field extraction uses regex on live HTML — any page change breaks the parser. |
| Staleness | 75/100 | Screener.in updates quarterly from company filings. Same lag as Upstox. |
| Reliability | 30/100 | **HIGH RISK.** No API. No SLA. Anti-bot measures. HTML structure breaks without notice. TRACK-19A worked, but any Screener.in redeploy breaks the parser. |
| Cost | 75/100 | Free. No auth. But operational cost of monitoring and fixing parser breaks is significant. |

**Verdict:** ⚠️ **OPTIONAL — enrichment only, with monitoring**. Cannot be relied upon for production. Finnhub provides the same fields with an official API. Screener should be a best-effort supplementary source, not a tier in the critical path.

**Blockers:** HTML parsing fragility. No SLA. No rate limit guarantees.

---

## 5. YahooProvider (v10 quoteSummary — Financials)

**Overall Score: 0/100 — DEAD**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coverage | 0/100 | v10 quoteSummary returns 401 Unauthorized for ALL symbols. `getFinancials()` unconditionally throws. |
| Accuracy | N/A | No data. |
| Staleness | N/A | No data. |
| Reliability | 0/100 | Permanently blocked. |
| Cost | 0/100 | N/A — unused. |

**Verdict:** ❌ **REMOVE from provider chain.** Kept in ProviderCoordinator as Tier 4 but always throws. Dead code that consumes error-handling cycles. Should be removed in v2 architecture.

---

## 6. GoogleNewsRssProvider

**Overall Score: 40/100 — SUPPLEMENTARY ONLY**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coverage | 50/100 | Indian equity news coverage is spotty. Major stocks (RELIANCE, TCS) get coverage; mid/small caps get few or no results. |
| Accuracy | 70/100 | RSS feed from Google News. Aggregated from known publishers. Not verified but from legitimate sources. |
| Staleness | 85/100 | Real-time. Updates within minutes. |
| Reliability | 45/100 | RSS endpoints change. Google News RSS is unofficial. No SLA. |
| Cost | 80/100 | Free. No auth. |

**Verdict:** ⚠️ **SUPPLEMENTARY.** Not critical for rankings. News sentiment is a future feature. Keep as optional enrichment.

---

## Composite Rankings

| Rank | Provider | Overall | Coverage | Accuracy | Staleness | Reliability | Cost |
|------|----------|---------|----------|----------|-----------|-------------|------|
| 1 | **Finnhub** | **85** | 90 | 85 | 80 | 80 | 90 |
| 2 | **Yahoo (price)** | **78** | 75 | 95 | 90 | 60 | 85 |
| 3 | Upstox | 65 | 50 | 95 | 75 | 40 | 65 |
| 4 | Screener | 55 | 70 | 60 | 75 | 30 | 75 |
| 5 | GoogleNews | 40 | 50 | 70 | 85 | 45 | 80 |
| 6 | Yahoo (fin.) | 0 | 0 | N/A | N/A | 0 | 0 |

---

## Recommended Production Configuration

```
PRIMARY FINANCIAL PROVIDER: FinnhubProvider (API key required)
PRIMARY PRICE PROVIDER:      YahooProvider v8 (no auth)
ENRICHMENT (Optional):       UpstoxFundamentalsProvider (when token available)
ENRICHMENT (Optional):       ScreenerProvider (best-effort, monitored)
NEWS (Optional):             GoogleNewsRssProvider + FinnhubProvider news endpoint
DEAD — REMOVE:               YahooProvider v10 financials (always 401)
```

---

## Action Items

| Priority | Action | Impact |
|----------|--------|--------|
| 🔴 P0 | Obtain FINNHUB_API_KEY and set in production env | Unlocks 18/20 fields for 500+ symbols |
| 🔴 P0 | Deploy Finnhub as primary financial provider | Eliminates Upstox OAuth dependency |
| 🟡 P1 | Hardcode YahooProvider batching (10 symbols, 90s cooldown) | Fixes 5.4% → 98%+ success rate |
| 🟡 P1 | Remove YahooProvider v10 financials from ProviderCoordinator | Cleans dead code |
| 🟢 P2 | Set up ScreenerProvider monitoring (alert on parse failures) | Allows safe enrichment without surprises |
| 🟢 P2 | Deploy ProviderCapabilityRegistry + ProviderHealthService | Enables dynamic provider selection |

---

**TRACK-20 Provider Scorecards — Phase 2 TASK 6 Complete**
