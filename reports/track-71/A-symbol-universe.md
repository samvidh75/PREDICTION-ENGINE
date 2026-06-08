# TRACK-71 Agent A — Symbol Universe Truth

**Generated:** 2026-06-07T13:36:07.086Z
**DB:** `C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\data\stockstory.db`

## Actual Symbols — Table by Table

| Table | Column | Distinct Symbols |
|-------|--------|-----------------|
| master_security_registry | symbol | 0 |
| symbols | symbol | 30 |
| daily_prices | symbol | 128 |
| ranking_snapshots | symbol | 30 |
| feature_snapshots | symbol | 30 |
| factor_snapshots | symbol | 30 |
| financial_snapshots | symbol | 30 |
| prediction_registry | symbol | 30 |
| alpha_research_registry | symbol | 30 |
| data_quality_registry | symbol | 0 |
| corporate_actions | symbol | 0 |
| fundamental_registry | symbol | 30 |
| institutional_registry | symbol | 30 |
| manipulation_registry | symbol | 30 |
| explainability_registry | symbol | 30 |
| quality_registry | symbol | 30 |
| future_health_registry | symbol | 30 |
| quality_registry_v4 | symbol | 30 |
| risk_registry | symbol | 30 |
| narrative_registry | symbol | 10 |
| prediction_ledger | symbol | 0 |
| outcome_registry_v2 | symbol | 30 |

## Total Unique Symbols Across All Tables: **128**

### Symbol List
```
ABB, ADANIGREEN, ADANIPORTS, ADANIPOWER, AMBUJACEM, APOLLOHOSP, ASIANPAINT, ASIANPAINT.NS, AUROPHARMA, AXISBANK, AXISBANK.NS, BAJAJ-AUTO, BAJAJFINSV, BAJAJFINSV.NS, BAJAJHLDNG, BAJFINANCE, BAJFINANCE.NS, BANDHANBNK, BANKBARODA, BEL, BERGEPAINT, BHARATFORG, BHARTIARTL, BHARTIARTL.NS, BOSCHLTD, BPCL, BRITANNIA, CANBK, CIPLA, COALINDIA, COALINDIA.NS, COLPAL, DABUR, DIVISLAB, DLF, DMART, DRREDDY, EICHERMOT, GAIL, GODREJCP, GRASIM, GRASIM.NS, HAL, HAVELLS, HCLTECH, HCLTECH.NS, HDFCBANK, HDFCBANK.NS, HDFCLIFE, HEROMOTOCO, HINDALCO, HINDUNILVR, HINDUNILVR.NS, ICICIBANK, ICICIBANK.NS, ICICIGI, ICICIPRULI, INDHOTEL, INDIGO, INDUSINDBK, INFY, INFY.NS, IOC, IRCTC, ITC, ITC.NS, JINDALSTEL, JSWSTEEL, JSWSTEEL.NS, KOTAKBANK, KOTAKBANK.NS, LICI, LT, LT.NS, LUPIN, M&M, MARICO, MARUTI, MARUTI.NS, MOTHERSON, MUTHOOTFIN, NESTLEIND, NESTLEIND.NS, NTPC, NTPC.NS, NYKAA, ONGC, ONGC.NS, PAGEIND, PERSISTENT, PFC, PIDILITIND, PIIND, POWERGRID, POWERGRID.NS, RELIANCE, RELIANCE.NS, SBILIFE, SBIN, SBIN.NS, SHREECEM, SIEMENS, SRTRANSFIN, SUNPHARMA, SUNPHARMA.NS, TATACONSUM, TATAMOTORS, TATASTEEL, TATASTEEL.NS, TCS, TCS.NS, TECHM, TECHM.NS, TITAN, TITAN.NS, TORNTPHARM, TORNTPOWER, TRENT, TVSMOTOR, ULTRACEMCO, ULTRACEMCO.NS, UPL, VBL, VEDL, WIPRO, WIPRO.NS, YESBANK, ZOMATO
```

## NIFTY100 Coverage

- **NIFTY100 reference count:** 96
- **Present:** 75 — RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, HINDUNILVR, ITC, BHARTIARTL, KOTAKBANK, SBIN, BAJFINANCE, LT, HCLTECH, SUNPHARMA, ASIANPAINT, MARUTI, AXISBANK, TITAN, DMART, WIPRO, ULTRACEMCO, NTPC, POWERGRID, ADANIPORTS, JSWSTEEL, TATASTEEL, TECHM, NESTLEIND, ONGC, COALINDIA, BAJAJFINSV, BPCL, HDFCLIFE, SBILIFE, DIVISLAB, SHREECEM, BAJAJ-AUTO, EICHERMOT, HEROMOTOCO, M&M, TATAMOTORS, CIPLA, DRREDDY, APOLLOHOSP, BRITANNIA, GRASIM, INDUSINDBK, PIDILITIND, BERGEPAINT, DABUR, GODREJCP, MARICO, TATACONSUM, HAVELLS, SIEMENS, ABB, HAL, BEL, VBL, ZOMATO, TRENT, PERSISTENT, BANKBARODA, CANBK, INDHOTEL, TORNTPHARM, TORNTPOWER, JINDALSTEL, HINDALCO, VEDL, AMBUJACEM, DLF, LICI, ADANIGREEN, ADANIPOWER
- **Missing:** 21 — ADANIENT, IRFC, LTIM, MPHASIS, FEDERALBNK, PNB, UNIONBANK, INDIANB, LICHSGFIN, CHOLAFIN, POLYCAB, SRF, NAUKRI, INFOEDGE, POLICYBZR, PAYTM, GODREJPROP, TATACOMM, BHARTIHEXA, IDEA, MAXHEALTH
- **Coverage:** 78.1%

## Contradiction Resolution

| Source | Claim | TRACK-71 Reality |
|--------|-------|------------------|
| symbols table | 5 symbols | **30** |
| prediction_registry | varies | **30** — actual distinct symbols used in predictions |
| factor_snapshots | 30+ symbols | **30** — actual distinct symbols with factor data |
| All tables combined | — | **128** unique symbols total |

## Verdict

**Actual NIFTY100 coverage: 78.1%** (75/96)

Moderate coverage — need to backfill remaining NIFTY100 symbols.
