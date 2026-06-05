# Integration Effort Estimate — TRACK-7F

**Generated:** 2026-06-05T13:00:00Z

---

## Per-Provider Integration Effort

| Provider | Hours | New Provider Class | Mapping Complexity | Existing Code Reuse | Risk |
|:---------|:------|:-------------------|:-------------------|:--------------------|:-----|
| FMP | 8h | Yes | Medium — FMP financial-ratios-ttm maps well to EngineInputs | None | Medium — Indian coverage unverified at Ultimate tier |
| Alpha Vantage | 0h | No | N/A — fundamentals unsupported for Indian equities | AlphaVantageProvider exists | Showstopper |
| Polygon | 0h | No | N/A | None | Showstopper — no NSE/BSE |
| Tiingo | 0h | No | N/A | None | Showstopper — no Indian coverage |
| IndianAPI | 6h | Yes | Low-Medium — India-specific JSON structure | None | Medium — less mature provider |
| Yahoo Finance | 4h | No | Lowest — same provider as price data | YahooProvider already integrated | Low |

---

## Recommended Implementation: Yahoo quoteSummary Expansion

### Current State
- **YahooProvider**: Already fetches price history (OHLCV) via chart API
- **MasterCompanyRegistry**: Provides market cap, sector
- **FinnhubProvider**: Exists but gated by premium API key

### Target State: YahooProvider with Financial Modules

#### New Method: `getFinancials(symbol: string)`

Add to existing `YahooProvider` class (extends `HistoricalProvider`):

```typescript
async getFinancials(symbol: string): Promise<YahooFinancials> {
  const ticker = symbol.toUpperCase().endsWith('.NS')
    ? symbol.toUpperCase()
    : symbol.toUpperCase() + '.NS';

  const modules = [
    'defaultKeyStatistics',
    'financialData',
    'summaryDetail',
    'price',
  ].join(',');

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${
    encodeURIComponent(ticker)
  }?modules=${modules}`;

  const resp = await fetch(url);
  const json = await resp.json();
  const result = json?.quoteSummary?.result?.[0];

  const ks = result?.defaultKeyStatistics;
  const fd = result?.financialData;
  const sd = result?.summaryDetail;
  const pr = result?.price;

  return {
    symbol: ticker,
    // Valuation
    peRatio: sd?.trailingPE?.raw ?? ks?.forwardPE?.raw ?? undefined,
    pbRatio: ks?.priceToBook?.raw ?? undefined,
    evEbitda: ks?.enterpriseToEbitda?.raw ?? undefined,
    marketCap: pr?.marketCap?.raw ?? ks?.marketCap?.raw ?? undefined,

    // Profitability
    roe: fd?.returnOnEquity?.raw ?? undefined,
    grossMargin: fd?.grossMargins?.raw ?? undefined,
    operatingMargin: fd?.operatingMargins?.raw ?? undefined,
    netMargin: fd?.profitMargins?.raw ?? undefined,

    // Growth
    revenueGrowth: fd?.revenueGrowth?.raw ?? undefined,
    epsGrowth: fd?.earningsGrowth?.raw ?? undefined,

    // Stability
    debtToEquity: fd?.debtToEquity?.raw ?? undefined,
    currentRatio: fd?.currentRatio?.raw ?? undefined,
    freeCashFlow: fd?.freeCashflow?.raw ?? undefined,

    // Risk/Market
    beta: sd?.beta?.raw ?? undefined,
    eps: sd?.trailingEps?.raw ?? undefined,
    dividendYield: sd?.dividendYield?.raw ?? undefined,
  };
}
```

### Fields Gained by Module

| Yahoo Module | Fields Provided | Previously Real? |
|:-------------|:----------------|:-----------------|
| `defaultKeyStatistics` | PB, EV/EBITDA, Forward PE, Market Cap | ❌ Placeholder |
| `financialData` | ROE, Gross/Operating/Net Margins, Revenue Growth, EPS Growth, D/E, Current Ratio, FCF | ❌ Placeholder |
| `summaryDetail` | Trailing PE, Beta, EPS, Dividend Yield | ✅ Beta (derived) |
| `price` | Market Cap (refined) | ✅ From Registry |

### Effort Breakdown

| Task | Hours | Description |
|:-----|:------|:------------|
| Add `getFinancials()` to YahooProvider | 2 | New method with 4 modules, ~60 lines |
| Field mapping to EngineInputs contract | 1 | Map Yahoo field names → EngineInputs.financials |
| Wire into `buildEngineInputs()` | 1 | Replace placeholder values with YahooProvider.getFinancials() |
| Test on 6 anchor stocks | 0.5 | Run against RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, SBIN |
| Full-universe dry run | 0.5 | Run against 50-company sample |
| **Total** | **5** | **One developer, half a day** |

### Compatibility

| Aspect | Status |
|:-------|:-------|
| Existing YahooProvider class | ✅ Already instantiated and used |
| Symbol format (.NS suffix) | ✅ Already normalized in YahooProvider |
| EngineInputs contract | ✅ 21/21 fields mapped (same field names as FinnhubProvider) |
| Error handling (rate limits, network) | ✅ RetryPolicy already used by YahooProvider |
| No new npm dependencies | ✅ Native fetch, no new package |
| No API key procurement | ✅ Yahoo quoteSummary is publicly accessible |
| No vendor contract | ✅ No paid subscription needed |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|:-----|:-----------|:-------|:-----------|
| Yahoo rate-limits bulk calls | Medium | Delays batch refresh | Add throttle (200ms between calls). Already needed for Finnhub. |
| Yahoo deprecates quoteSummary | Low | Loss of 75% coverage | IndianAPI as fallback at $12/mo |
| Some fields null for Indian mid/small caps | Medium | Partial coverage (~60-75%) | Accept fallback chain: Yahoo → Registry → default |
| Free-tier unofficial endpoint | Medium | May require formal Yahoo Finance API key | Yahoo Finance API is free but requires registration |
