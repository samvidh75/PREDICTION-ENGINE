# Portfolio Import Report — RC-UPSTOX-001

**Generated:** 2026-06-05T15:44:28.894Z

---

## Import Pipeline

```
User clicks "Sync Portfolio"
    ↓
UpstoxProvider.getHoldings()  →  Upstox Holding[]
UpstoxProvider.getPositions() →  Upstox Position[]
UpstoxProvider.getFunds()     →  Upstox Funds
    ↓
PortfolioNormalizer.normalizeHoldings() → PortfolioHolding[]
  - Strip -EQ/-BE/.NS/.BO suffixes
  - ISIN resolution via MasterCompanyRegistry
  - Sector enrichment
  - Exchange normalization (BSE_BSE → BSE)
    ↓
PortfolioProvider.importPortfolio() → PortfolioSnapshot
    ↓
Portfolio Intelligence Engine
```

---

## Symbol Resolution

| Input | Normalized | Registry Enrichment |
|:------|:-----------|:--------------------|
| RELIANCE-EQ | RELIANCE | Sector: Energy, MarketCap: ₹15T, ISIN: INE002A01018 |
| TCS.NS | TCS | Sector: IT |
| INE467B01029 (ISIN) | TCS | Resolved via ISIN → TCS |
| Unknown XYZ | XYZ | Sector: General, marketCap: null |

---

## Exchange Normalization

| Broker Code | StockStory |
|:-----------|:-----------|
| NSE_EQ, NSE | NSE |
| BSE_EQ, BSE_BSE, BSE | BSE |
| NFO, BFO | FNO |
| MCX | MCX |
| Default | NSE |

## Data Validation

| Rule | Action |
|:-----|:-------|
| quantity > 0 | Skip if ≤ 0 |
| averagePrice > 0 | Flag warning if ≤ 0 |
| symbol length ≥ 1 | Skip empty |
| ISIN format | Validate INE... pattern |

