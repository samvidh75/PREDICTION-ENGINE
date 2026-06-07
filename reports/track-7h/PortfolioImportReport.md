# Portfolio Import Report — TRACK-7H

**Generated:** 2026-06-05T15:21:29.482Z

---

## Import Pipeline

```
Upstox API (/v2/portfolio/*)
    ↓
UpstoxProvider.getPortfolio()
    ↓
BrokerPortfolio { holdings: PortfolioHolding[], positions: PortfolioPosition[], funds }
    ↓
PortfolioIngestionEngine.ingest()
    ↓
  - Symbol normalization (strip -EQ, -BE, .NS suffixes)
    ↓
  - ISIN resolution via MasterCompanyRegistry
    ↓
  - Sector enrichment
    ↓
  - Market cap enrichment
    ↓
PortfolioSnapshot (StockStory format)
    ↓
StockStory Portfolio Health Engine
```

---

## Data Transformation

### Upstox → StockStory Field Mapping

| Upstox Field | StockStory Field | Transform |
|:-------------|:-----------------|:----------|
| trading_symbol | symbol | Strip -EQ/-BE suffix, uppercase |
| isin | isin | Direct (also resolved from registry) |
| exchange | exchange | Map BSE_BSE → BSE, NSE_EQ → NSE |
| quantity | quantity | Direct |
| average_price | averagePrice | Direct |
| last_price | lastPrice | Direct (updated by live quotes) |
| pnl | pnl | Direct |
| pnl_percent | pnlPercent | Direct |
| day_change | dayChange | Direct |
| day_change_percentage | dayChangePercent | Direct |
| instrument_token | instrumentToken | Direct (for future WebSocket) |

### Fund Mapping

| Upstox Field | StockStory Field |
|:-------------|:-----------------|
| available_margin / available_cash | availableCash |
| used_margin | usedMargin |
| total_margin | totalValue |

---

## Symbol Resolution

StockStory's MasterCompanyRegistry resolves:

| Input | Registry Lookup | Output |
|:------|:----------------|:--------|
| "RELIANCE-EQ" → "RELIANCE" | By NSE symbol | Sector: Energy, marketCap, ISIN |
| "TCS-EQ" → "TCS" | By NSE symbol | Sector: IT |
| "INE002A01018" (ISIN) | By ISIN | RELIANCE |
| Unknown symbol | No match | Keeps symbol, sector: "General" |

**Coverage expectation:** >95% for NSE stocks (full registry), ~80% for BSE-only stocks.

---

## Error Handling

| Scenario | Handling |
|:---------|:---------|
| Upstox API 401 | Auto-refresh token → if fails, prompt re-auth |
| Upstox API 429 (rate limit) | Exponential backoff: 1s, 2s, 4s, 8s |
| Empty portfolio | Return empty PortfolioSnapshot (0 holdings) |
| Symbol not in registry | Keep broker symbol, mark sector as "General" |
| Missing ISIN | Resolve from symbol via registry |
| Partial API failure (e.g., holdings OK, funds fail) | Return what's available, log error |

---

## Import Performance Estimates

| Portfolio Size | Holdings API | Positions API | Funds API | Total Time |
|:---------------|:-------------|:--------------|:----------|:-----------|
| 5 stocks | ~200ms | ~200ms | ~150ms | ~600ms (parallel) |
| 20 stocks | ~300ms | ~250ms | ~150ms | ~600ms (parallel) |
| 50 stocks | ~400ms | ~300ms | ~150ms | ~600ms (parallel) |

All three API calls execute in parallel via Promise.all().

