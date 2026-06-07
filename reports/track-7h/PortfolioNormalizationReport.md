# Portfolio Normalization Report — TRACK-7H

**Generated:** 2026-06-05T15:21:29.483Z

---

## Overview

Portfolio normalization converts broker-specific data formats into StockStory's canonical `PortfolioHolding`, `PortfolioPosition`, and `PortfolioSnapshot` types. This ensures downstream engines (Health, Risk, Explainability) work identically regardless of which broker the data came from.

---

## Normalization Steps

### Step 1: Symbol Cleanup

Broker symbols include exchange suffixes and product type indicators.

| Broker | Raw Symbol | Cleaned | Rule |
|:-------|:-----------|:--------|:-----|
| Upstox | RELIANCE-EQ | RELIANCE | Strip `-EQ` |
| Upstox | TCS-BE | TCS | Strip `-BE` |
| Upstox | INFY.NS | INFY | Strip `.NS` |
| Upstox | HDFCBANK.BO | HDFCBANK | Strip `.BO` |
| Zerodha | NSE:RELIANCE | RELIANCE | Strip `NSE:` prefix |
| Angel One | RELIANCE | RELIANCE | Already clean |
| Dhan | RELIANCE | RELIANCE | Already clean |

### Step 2: ISIN Resolution

Priority order:
1. Broker-provided ISIN (trusted source)
2. MasterCompanyRegistry lookup by symbol
3. MasterCompanyRegistry lookup by company name (fuzzy match)
4. Null (unknown)

### Step 3: Exchange Normalization

| Broker Value | Normalized | Notes |
|:-------------|:-----------|:------|
| NSE_EQ | NSE | Equity on NSE |
| BSE_EQ | BSE | Equity on BSE |
| NSE_BSE | NSE | Default to NSE |
| BFO | NFO | Futures & Options |
| MCX | MCX | Commodities |

### Step 4: Sector Enrichment

Using MasterCompanyRegistry:
- Match by NSE symbol → sector
- Match by ISIN → sector
- No match → "General" (neutral)

### Step 5: Market Cap Enrichment

Using MasterCompanyRegistry:
- Match by symbol/ISIN → marketCap
- No match → null (treated as mid-cap for scoring)

---

## Edge Cases Handled

| Edge Case | Behavior |
|:----------|:---------|
| Duplicate holdings (same stock from multiple brokers) | Aggregated by symbol — quantities summed, weighted avg price calculated |
| Zero-quantity holdings | Filtered out during ingestion |
| Negative positions (short sells) | Preserved as-is in `PortfolioPosition` |
| Fractional shares | Preserved (Upstox supports fractional for some instruments) |
| Multi-exchange same stock (NSE + BSE) | Prefer NSE; merge quantities |
| Stale holdings (sold but still in broker response) | Preserved — broker is source of truth |

---

## Validation Rules

| Rule | Type | Action |
|:-----|:-----|:-------|
| quantity > 0 | Required | Skip holding if quantity ≤ 0 |
| averagePrice > 0 | Required | Flag as data-quality warning |
| symbol length ≥ 1 | Required | Skip if empty |
| isin format INE... | Optional | Validate regex; flag if invalid |
| exchange ∈ {NSE, BSE, NFO, MCX} | Required | Default to NSE if unknown |

---

## Output Schema

### PortfolioHolding

```typescript
{
  symbol: string;           // e.g., "RELIANCE"
  isin?: string;            // e.g., "INE002A01018"
  exchange: 'NSE' | 'BSE';
  quantity: number;
  averagePrice: number;
  lastPrice?: number;       // From live quotes
  pnl?: number;
  pnlPercent?: number;
  sector?: string;          // From registry
  marketCap?: number;       // From registry
  instrumentToken?: string; // For WebSocket
}
```

### PortfolioSnapshot

```typescript
{
  userId: string;
  broker: string;
  timestamp: string;          // ISO 8601
  holdings: PortfolioHolding[];
  positions: PortfolioPosition[];
  funds: { availableCash, usedMargin, totalValue, currency };
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPercent: number;
  // Populated by downstream engines:
  healthScore?: number;
  riskScore?: number;
  qualityScore?: number;
  diversificationScore?: number;
  sectorConcentrationWarnings?: string[];
}
```

