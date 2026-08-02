# F3 — SCHEMA COMPATIBILITY AUDIT

> Generated: 2026-06-13
> Branch: `track-f3-data-plane-quota-governance`

## 1. daily_prices Table

| Column | Required Type | Current Providers | Issues |
|--------|-------------|-------------------|--------|
| `symbol` | VARCHAR | Yahoo, IndianAPI | ✅ Canonical |
| `trade_date` | DATE | Yahoo, IndianAPI | ✅ Canonical |
| `open` | NUMERIC | Yahoo | ✅ |
| `high` | NUMERIC | Yahoo | ✅ |
| `low` | NUMERIC | Yahoo | ✅ |
| `close` | NUMERIC | Yahoo, IndianAPI | ⚠️ IndianAPI is close-only — synthesizes open=high=low=close |
| `adjusted_close` | NUMERIC | Yahoo | ✅ |
| `volume` | NUMERIC/BIGINT | Yahoo, IndianAPI | ⚠️ IndianAPI volume sometimes in lakhs (×100000) |
| `source` | VARCHAR | — | ❌ Not consistently populated |
| `ingested_at` | TIMESTAMP | — | ❌ Not consistently populated |

### Defects
- **IndianMarketProvider.getHistorical** returns close-only candles with `open = high = low = close`. This violates the OHLC invariant.
- **Npm-yfinance island** (`src/providers/yfinance/`) uses a different schema and column names.
- **Weekend data** — no trading calendar, weekends treated as missing data gaps.

## 2. financial_snapshots Table

| Column | Provider | Issues |
|--------|----------|--------|
| `peRatio` | Upstox, Finnhub | ✅ |
| `pbRatio` | Upstox, Finnhub | ✅ |
| `roe` | Upstox, Finnhub | ⚠️ Upstox returns as percentage string (e.g. "8.94%") |
| `roa` | Upstox | ❌ Missing from many type definitions |
| `roic` | Upstox, Finnhub | ⚠️ Called `roce` in Upstox |
| `evEbitda` | Upstox, Finnhub | ✅ |
| `debtToEquity` | Upstox | Derived from balance sheet |
| `marketCap` | Finnhub, IndianAPI | ⚠️ Unit mismatch (some crores, some raw INR) |
| `periodEnd` | All | ❌ Finnhub fabricates `periodEnd = retrieval date` when fiscal period absent |

## 3. Canonical Candle Contract (Phase 4 Target)

```sql
daily_prices(
  symbol       VARCHAR NOT NULL,
  trade_date   DATE NOT NULL,
  open         NUMERIC,
  high         NUMERIC,
  low          NUMERIC,
  close        NUMERIC NOT NULL,
  adjusted_close NUMERIC,
  volume       BIGINT,
  PRIMARY KEY (symbol, trade_date)
)
```

**Constraints:**
- `open IS NULL OR high IS NULL OR low IS NULL` allowed only when OHLC invariant cannot be met — but never synthetic zeros.
- `high >= low` and `open, close` within `[low, high]`.
- No NaN, Infinity, or negative prices.

## 4. Type Compatibility

The recently fixed `Record<string, unknown>` → `Record<string, any>` change resolves the primary type compatibility blocker. Remaining issues:

- `MasterSymbolUniverse.ts` still casts `query()` results with `as SymbolRecord` — should use proper typed generic.
- `scripts/` have `roa` missing from type in several fundamental ingestion scripts.
