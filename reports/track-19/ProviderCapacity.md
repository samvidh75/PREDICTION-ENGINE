# TRACK-19 — Phase 3: Provider Capacity Analysis

## ProviderCapacity: Upstox, Yahoo, Screener Coverage

---

## 1. PROVIDER REGISTRY

Each provider is analyzed for:
- NIFTY 50 coverage
- 505-symbol universe coverage
- Fields available
- Fields missing
- Rate limits
- Expected runtime

---

## 2. UPSTOX FUNDAMENTALS PROVIDER

**File:** `src/services/providers/UpstoxFundamentalsProvider.ts`  
**Tier:** 1 (primary financials)

### Coverage

| Universe | Coverage |
|----------|----------|
| NIFTY 50 | ✅ 100% — all NIFTY 50 constituents have ISINs in MasterCompanyRegistry |
| 505-symbol universe | ⚠️ **CONDITIONAL** — only symbols with valid ISIN in MasterCompanyRegistry (about 50 verified, ~455 from generate500Stocks lack ISINs) |

### Fields Available (from Upstox v2 Fundamentals API)

| Field | Source API | Reliability |
|-------|-----------|-------------|
| `peRatio` | `/v2/fundamentals/{isin}/key-ratios` — P/E or P/E ratio | ✅ High |
| `pbRatio` | P/B or P/B ratio | ✅ High |
| `roe` | ROE | ✅ High |
| `roa` | ROA | ✅ High |
| `roic` | ROCE (return on capital employed) | ✅ High |
| `evEbitda` | EV/EBITDA | ✅ Medium |
| `debtToEquity` | Derived from balance sheet (total_liability / (total_asset - total_liability)) | ⚠️ Derived (lines 105-113) |
| `totalAssets` | Balance sheet `total_asset` in crores → INR | ✅ High |
| `totalLiabilities` | Balance sheet `total_liability` in crores → INR | ✅ High |
| `totalEquity` | Derived (total_asset - total_liability) | ⚠️ Derived |

### Fields Missing (not provided by Upstox)

| Field | Status |
|-------|--------|
| `marketCap` | ❌ Not provided (undefined in return) |
| `eps` | ❌ Not provided |
| `dividendYield` | ❌ Not provided |
| `beta` | ❌ Not provided |
| `fcfYield` | ❌ Not provided |
| `freeFloat` | ❌ Not provided |
| `revenueGrowth` | ❌ Not provided |
| `profitGrowth` | ❌ Not provided |
| `epsGrowth` | ❌ Not provided |
| `fcfGrowth` | ❌ Not provided |
| `grossMargin` | ❌ Not provided |
| `operatingMargin` | ❌ Not provided |
| `currentRatio` | ❌ Not provided |
| `pbRatio` | ✅ Provided |

### Rate Limits

| Limit | Value |
|-------|-------|
| API calls per minute | ~20 req/min (Upstox API) |
| 2 endpoints per symbol (key-ratios + balance-sheet) | 2 calls/symbol |
| Max symbols per minute | ~10 symbols/min |
| **505 symbols at 10/min** | ~50.5 minutes |

### Critical Dependency

**UpstoxFundamentalsProvider requires an active Upstox OAuth access token** (line 33-35 of `UpstoxFundamentalsProvider.ts`):

```typescript
constructor(getToken: UpstoxTokenProvider) {
  this.getToken = getToken;
}
// ...
const token = this.getToken();
if (!token) {
  throw new Error('UpstoxFundamentals: no access token — user must connect Upstox');
}
```

In the `populate-real-universe.ts` constructor, the token is obtained from (ProviderCoordinator.ts lines 49-55):
```typescript
const upstoxFundamentals = new UpstoxFundamentalsProvider(() => {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('upstox_access_token') ?? null;
  }
  if (typeof process !== 'undefined') {
    return process.env.UPSTOX_ACCESS_TOKEN ?? process.env.VITE_UPSTOX_ACCESS_TOKEN ?? null;
  }
  return null;
});
```

**Verdict:** Upstox is a USER-BOUND provider. In a server-side batch population (`populate-real-universe.ts`), the `UPSTOX_ACCESS_TOKEN` env var must be set. Without it, UpstoxFundamentalsProvider throws an error immediately.

---

## 3. SCREENER PROVIDER

**File:** `src/services/providers/ScreenerProvider.ts`  
**Tier:** 2 (enrichment only — cannot overwrite Upstox fields)

### Coverage

| Universe | Coverage |
|----------|----------|
| NIFTY 50 | ✅ 100% — all NIFTY 50 constituents have Screener.in pages |
| 505-symbol universe | ⚠️ **~90-95%** — Screener.in covers most listed Indian companies, but some small/micro caps may not have consolidated financials |

### Fields Available (from Screener.in HTML scraping)

| Field | Source | Reliability |
|-------|--------|-------------|
| `revenueGrowth` | "Compounded Sales Growth" table (TTM/3Y/5Y) | ⚠️ HTML parse — fragile |
| `profitGrowth` | "Compounded Profit Growth" table (TTM/3Y/5Y) | ⚠️ HTML parse — fragile |
| `epsGrowth` | "EPS in Rs" row — derived growth from last 2 columns | ⚠️ Derived, fragile |
| `fcfGrowth` | "Free Cash Flow" row — derived growth | ⚠️ Derived, fragile |
| `operatingMargin` | "OPM %" row (latest column) | ⚠️ HTML parse — moderate |
| `currentRatio` | "Current Ratio" row (latest column) | ⚠️ HTML parse — moderate |
| `dividendYield` | Top ratios list "Dividend Yield" | ⚠️ HTML parse — moderate |
| `bookValue` | Top ratios list "Book Value" | ⚠️ HTML parse — moderate |
| `marketCap` | Top ratios list "Market Cap" (crores → INR) | ⚠️ HTML parse — moderate |

### Fields Missing (not provided by Screener)

| Field | Status |
|-------|--------|
| `peRatio` | ❌ Not used (Upstox territory) |
| `pbRatio` | ❌ Not used |
| `roe` | ❌ Not used |
| `roa` | ❌ Not used |
| `roic` | ❌ Not used |
| `evEbitda` | ❌ Not used |
| `debtToEquity` | ❌ Not used |
| `eps` | ❌ Not provided |
| `beta` | ❌ Not provided |
| `fcfYield` | ❌ Not provided |
| `grossMargin` | ❌ Not provided |

### Rate Limits

| Limit | Value |
|-------|-------|
| Recommended crawl rate | ~5-10 pages/min (Screener.in anti-bot) |
| **505 symbols at 6/min** | ~84 minutes |

ScreenerProvider fetches the full HTML page (line 16-24), then parses it.
- Each page fetch: ~500ms-2s
- RetryPolicy: 2 retries with 1s-5s backoff
- Risk of IP block if too aggressive

### Critical Risk

Screener.in is a **third-party website with no official API**. The scraper relies on HTML structure (line 50-138). Breaks frequently. Not suitable for automated production pipelines.

---

## 4. FINNHUB PROVIDER

**File:** `src/services/providers/FinnhubProvider.ts`  
**Tier:** 3 (fallback financials)

### Coverage

| Universe | Coverage |
|----------|----------|
| NIFTY 50 | ✅ 100% — all NIFTY 50 tickers with `.NS` suffix |
| 505-symbol universe | ⚠️ **~80-90%** — Finnhub covers Indian NSE stocks but some mid/small caps may return empty metrics |

### Fields Available (from Finnhub Stock Metrics API)

| Field | Source API | Reliability |
|-------|-----------|-------------|
| `marketCap` | `marketCapitalization` × 1,000,000 | ✅ High |
| `peRatio` | `peNormalizedAnnual` or `peBasicExclExtraTTM` | ✅ High |
| `pbRatio` | `pbAnnual` or `priceToBookPerShareTTM` | ✅ High |
| `evEbitda` | `enterpriseValueOverEBITDA` | ✅ Medium |
| `eps` | `epsNormalizedAnnual` or `epsBasicExclExtraItemsTTM` | ✅ High |
| `fcfYield` | Derived: `freeCashFlowTTM / marketCap` | ⚠️ Derived |
| `roe` | `roeTTM` or `roeRfy` | ✅ High |
| `roic` | `roicTTM` or `roicRfy` | ✅ High |
| `grossMargin` | `grossMarginTTM` or `grossMargin` | ✅ Medium |
| `operatingMargin` | `operatingMarginTTM` or `operatingMargin` | ✅ Medium |
| `revenueGrowth` | `revenueGrowthTTMYoy` or `revenueGrowth3Y` | ✅ Medium |
| `epsGrowth` | `epsGrowthTTMYoy` or `epsGrowth3Y` | ✅ Medium |
| `fcfGrowth` | `freeCashFlowGrowthTTMYoy` | ✅ Medium |
| `profitGrowth` | `netIncomeGrowthTTMYoy` or `netIncomeGrowth3Y` | ✅ Medium |
| `debtToEquity` | `totalDebtOverTotalEquityTTM` (with quarterly, annual fallbacks) | ✅ Medium |
| `currentRatio` | `currentRatioTTM` (with quarterly, annual fallbacks) | ✅ Medium |
| `beta` | `beta` | ✅ High |
| `dividendYield` | `dividendYieldIndicatedAnnual` or `dividendYieldTTM` | ✅ High |

### Fields Missing

| Field | Status |
|-------|--------|
| `roa` | ❌ Not provided by Finnhub metrics |
| `freeFloat` | ❌ Not provided |

### Rate Limits

| Tier | Rate Limit | Cost |
|------|-----------|------|
| Free | 60 API calls/min | $0 |
| Basic | 300 API calls/min | $89/mo |
| Premium | 1000+ API calls/min | Custom |

At 60 API calls/min (free tier), 505 symbols = ~8.4 minutes.
At 300 API calls/min (basic), = ~1.7 minutes.

### Critical Dependency

**Requires FINNHUB_API_KEY env var** (`FinnhubProvider.ts` line 23-26):
```typescript
constructor(apiKey?: string) {
  const key = apiKey
    || (typeof process !== 'undefined' && process.env?.FINNHUB_KEY)
    || (typeof process !== 'undefined' && process.env?.FINNHUB_API_KEY)
    ...
  if (!key) throw new Error('Finnhub API key not set');
}
```

Without the key, FinnhubProvider constructor throws — and ProviderCoordinator wraps this in try/catch (lines 83-87):
```typescript
try {
  const finnhub = new FinnhubProvider();
  ...
} catch {
  // Finnhub is optional when no API key is configured.
}
```

**Verdict:** Finnhub is optional — gracefully degrades if no API key.

---

## 5. YAHOO PROVIDER

**File:** `src/services/providers/YahooProvider.ts`  
**Role:** Primary for price/history; fallback for financials

### Coverage — Price/History Data

| Universe | Coverage |
|----------|----------|
| NIFTY 50 | ✅ 100% — all NSE tickers on Yahoo Finance |
| 505-symbol universe | ⚠️ **~95%** — most NSE-listed stocks are on Yahoo Finance, some small caps may not have ticker.NS |

### Coverage — Financials

| Universe | Coverage |
|----------|----------|
| All | ❌ **ZERO** — YahooProvider.getFinancials() THROWS (v10 quoteSummary blocked with 401) |

Evidence from `YahooProvider.ts` lines 158-164:
```typescript
async getFinancials(symbol: string): Promise<YahooFinancials> {
  // v10 quoteSummary is blocked (401). v8 chart API has no fundamental fields.
  throw new Error(
    `Yahoo Financials: v10 quoteSummary blocked (401). v8 chart API has no PE/ROE/D/E data.`
  );
}
```

### Fields Available — Price/History (from v8 Chart API)

| Field | Source | Reliability |
|-------|--------|-------------|
| `price`, `change`, `volume` | `getQuote()` — v8 chart, 1d range | ✅ High |
| `open`, `high`, `low`, `close`, `adjustedClose`, `volume` | `getHistory()` / `getHistorical()` — v8 chart, configurable range/interval | ✅ High |
| `companyName` | `getMetadata()` — v8 meta `longName` / `shortName` | ✅ Medium (name only, no sector) |
| `marketCap` | `getMetadata()` — v8 meta `marketCap` | ⚠️ Optional, may be missing |

### Fields Missing — Financials

**ALL fundamental fields are missing.** Yahoo v10 quoteSummary API is blocked (401 Unauthorized). Yahoo v8 chart API provides price/volume only.

### Rate Limits

| Limit | Value |
|-------|-------|
| Yahoo v8 chart API (public) | ~2000 requests/hour (unofficial) |
| Recommended spacing | ~500ms between requests |
| **505 symbols at 2s/spacing** | ~16.8 minutes for price history |

### Critical Note

YahooProvider is the **only provider that can supply daily_prices**. Without it, the entire pipeline breaks — FeatureEngine and FactorEngine both require `daily_prices`.

---

## 6. COMPLETE PROVIDER COVERAGE MATRIX

### For NIFTY 50

| Field | Upstox | Screener | Finnhub | Yahoo |
|-------|--------|----------|---------|-------|
| peRatio | ✅ | — | ✅ (fallback) | ❌ |
| pbRatio | ✅ | — | ✅ (fallback) | ❌ |
| roe | ✅ | — | ✅ (fallback) | ❌ |
| roa | ✅ | — | ❌ | ❌ |
| roic | ✅ (ROCE) | — | ✅ | ❌ |
| evEbitda | ✅ | — | ✅ | ❌ |
| debtToEquity | ✅ (derived) | — | ✅ (fallback) | ❌ |
| eps | ❌ | — | ✅ | ❌ |
| dividendYield | ❌ | ✅ (scraped) | ✅ (fallback) | ❌ |
| beta | ❌ | — | ✅ | ❌ |
| marketCap | ❌ | ✅ (scraped) | ✅ (fallback) | ⚠️ (optional) |
| freeFloat | ❌ | ❌ | ❌ | ❌ |
| fcfYield | ❌ | — | ✅ (derived) | ❌ |
| revenueGrowth | ❌ | ✅ (scraped) | ✅ (fallback) | ❌ |
| profitGrowth | ❌ | ✅ (scraped) | ✅ (fallback) | ❌ |
| epsGrowth | ❌ | ✅ (derived) | ✅ (fallback) | ❌ |
| fcfGrowth | ❌ | ✅ (derived) | ✅ (fallback) | ❌ |
| grossMargin | ❌ | — | ✅ (fallback) | ❌ |
| operatingMargin | ❌ | ✅ (scraped) | ✅ (fallback) | ❌ |
| currentRatio | ❌ | ✅ (scraped) | ✅ (fallback) | ❌ |
| daily_prices | ❌ | ❌ | ❌ | ✅ |
| metadata | ❌ | ❌ | ✅ | ✅ |

**NIFTY 50 coverage summary:** With Upstox (token) + Finnhub (API key) + Yahoo, all 22 financial fields AND daily_prices are theoretically covered for NIFTY 50.

---

### For 505-Symbol Universe

| Field | Full Coverage? | Gap |
|-------|---------------|-----|
| **All fundamental fields** | ⚠️ **~50 symbols** (MasterCompanyRegistry verified entries with valid ISINs) | 455 symbols have no ISIN → Upstox fails |
| **If Upstox fails** | ⚠️ **Depends on Finnhub + Screener** | Fields only covered if Finnhub key available + Screener scraping successful |
| **If all financials fail** | ❌ FactorEngine gets null financials → qualityFactor, valueFactor, riskFactor default to neutral (50) | Rankings degrade to technical-only (feature-derived momentum + trend) |
| **daily_prices** | ✅ **~95% expected** (Yahoo free, no auth) | Some microcaps may not be on Yahoo Finance |

---

## 7. EXPECTED RUNTIME — 505 SYMBOLS

### Path A: All providers available (ideal)

| Stage | Provider | Rate Limit | Per-symbol | Total (505) |
|-------|----------|-----------|-----------|-------------|
| Financials fetch | Upstox (2 calls/symbol) | 20 req/min | ~6s | 50.5 min |
| Financials enrich | Screener (1 call/symbol) | 5-10 req/min | ~10s | 84 min |
| Financials fallback | Finnhub (1 call/symbol) | 60 req/min (free) | ~1s | 8.4 min |
| Price history | Yahoo (1 call/symbol) | 2000 req/hr | ~2s | 16.8 min |
| Feature compute | FeatureEngine | Local CPU | ~1-3s | 0 min (parallel with fetch) |
| Factor compute | FactorEngine | Local CPU | ~1-2s | 0 min (parallel with fetch) |
| Rate-limit delay | — | 4s/symbol | 4s | 33.7 min |

**Total with 4s delay (as configured in populate-real-universe.ts):** 505 × 4s = 33.7 min for delays + ~20 min for actual computation = **~60 minutes**

### Path B: Yahoo + Finnhub only (no Upstox, no Screener)

| Stage | Provider | Total (505) |
|-------|----------|-------------|
| Price history | Yahoo | 16.8 min |
| Financials (one call) | Finnhub | 8.4 min |
| Feature/Factor compute | Local CPU | 0 min (overlap) |
| Rate-limit delay | — | 33.7 min |
| **Total** | | **~58 minutes** |

### Path C: Yahoo only (no financial providers)

| Stage | Provider | Total (505) |
|-------|----------|-------------|
| Price history | Yahoo | 16.8 min |
| Financials | ❌ ALL FAIL | 0 min |
| Feature compute | FeatureEngine | ~10 min |
| Factor compute | FactorEngine | ~10 min (with null financials → neutral factors) |
| Rate-limit delay | — | 33.7 min |
| **Total** | | **~70 minutes** |

**Problem:** In this path, ALL fundamental ratios are null → FactorEngine qualityFactor/valueFactor/riskFactor default to neutral (50). Rankings are TECHNICAL-ONLY (momentum, trend strength, sector momentum). Not useful for StockStory's fundamental-quality thesis.

---

## 8. CRITICAL GAPS IDENTIFIED

1. **ROA is upstream-only** — Only UpstoxFundamentalsProvider provides `roa`. Neither Finnhub nor Screener covers it. If Upstox fails, ROA is null.

2. **freeFloat has zero provider coverage** — No provider in the chain returns `freeFloat`. This field will always be null in provider-derived data.

3. **Upstox is user-bound** — Cannot be used in unattended CI/CD batch jobs without a valid access token stored in env vars.

4. **Screener scraping is brittle** — HTML parsing can break at any time. Not suitable for production pipelines.

5. **Yahoo v10 is dead** — YahooProvider provides zero fundamentals. Only useable for price/volume data.

6. **Finnhub free tier** — 60 req/min is generous for 505 symbols (~8 min), but requires API key configuration.
