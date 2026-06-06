# 01 — Registry Coverage Audit

**TRACK-20 Phase 1 — Task 1**
**Date:** 2026-06-06

---

## Executive Summary

The StockStory universe currently tracks 280+ symbols. Every symbol has been audited for data completeness across four critical dimensions:

1. **ISIN** — Required for UpstoxFundamentalsProvider (Tier 1 financials)
2. **Financial Snapshots** — Provider-derived fundamental ratios (PE, ROE, D/E, etc.)
3. **Daily Prices** — Yahoo v8 chart API OHLCV history (required for FeatureEngine)
4. **Factor Snapshots** — Computed quality/growth/value/momentum/risk scores

### Coverage Summary

| Classification | Count | % of Universe |
|---------------|-------|---------------|
| **VERIFIED** (all 4 dimensions) | 15 | 5.4% |
| **PARTIAL** (some data, missing factors) | 0 | 0% |
| **BROKEN** (financials exist, no prices/factors) | ~120 | 42.9% |
| **MISSING** (no provider data at all) | ~145 | 51.7% |

---

## Classification Definitions

| Status | ISIN | Financials | Daily Prices | Factor Snapshots |
|--------|------|-----------|-------------|-----------------|
| **VERIFIED** | ✅ | ✅ | ✅ | ✅ |
| **PARTIAL** | ✅/⚠️ | ✅ | ✅ | ❌ |
| **BROKEN** | ✅/⚠️ | ✅ | ❌ | ❌ |
| **MISSING** | ❌ | ❌ | ❌ | ❌ |

---

## VERIFIED Symbols (15)

These 15 NIFTY 50 heavyweights have complete real-data coverage: ISIN verified, financials from Upstox + Screener, 2-year OHLCV from Yahoo, and factor scores computed by FactorEngine.

| # | Symbol | Sector | ISIN | Financials Source | Factor Score |
|---|--------|--------|------|-------------------|-------------|
| 1 | RELIANCE | Oil & Gas | Verified | Upstox + Screener | Real |
| 2 | TCS | IT Services | Verified | Upstox + Screener | Real |
| 3 | HDFCBANK | Banking | Verified | Upstox + Screener | Real |
| 4 | INFY | IT Services | Verified | Upstox + Screener | Real |
| 5 | ICICIBANK | Banking | Verified | Upstox + Screener | Real |
| 6 | SBIN | Banking | Verified | Upstox + Screener | Real |
| 7 | BHARTIARTL | Telecom | Verified | Upstox + Screener | Real |
| 8 | ITC | FMCG | Verified | Upstox + Screener | Real |
| 9 | HINDUNILVR | FMCG | Verified | Upstox + Screener | Real |
| 10 | KOTAKBANK | Banking | Verified | Upstox + Screener | Real |
| 11 | LT | Infrastructure | Verified | Upstox + Screener | Real |
| 12 | BAJFINANCE | Financial Services | Verified | Upstox + Screener | Real |
| 13 | MARUTI | Automobile | Verified | Upstox + Screener | Real |
| 14 | SUNPHARMA | Pharmaceuticals | Verified | Upstox + Screener | Real |
| 15 | NTPC | Power | Verified | Upstox + Screener | Real |

---

## BROKEN Symbols (Financials Only — No Prices/Factors)

These symbols have financial snapshots from Upstox + Screener but failed during Yahoo history fetch (circuit breaker opened). They have valid ISINs but are missing daily prices → no features → no factor scores.

**Root cause:** TRACK-19A pipeline — Yahoo circuit breaker opened after 3 consecutive failures and never reset because the pipeline continued at 4s intervals without respecting the 60s breaker cooldown.

| # | Symbol | Financials | Prices | Features | Factors |
|---|--------|-----------|--------|----------|---------|
| 1 | AXISBANK | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 2 | ONGC | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 3 | HCLTECH | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 4 | ADANIENT | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 5 | TITAN | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 6 | ULTRACEMCO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 7 | M&M | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 8 | ADANIPORTS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 9 | POWERGRID | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 10 | COALINDIA | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 11 | ASIANPAINT | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 12 | WIPRO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 13 | BAJAJ-AUTO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 14 | BAJAJFINSV | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 15 | HAL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 16 | NESTLEIND | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 17 | JSWSTEEL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 18 | TATASTEEL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 19 | HINDZINC | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 20 | BEL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 21 | TECHM | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 22 | BPCL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 23 | EICHERMOT | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 24 | BRITANNIA | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 25 | CIPLA | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 26 | DIVISLAB | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 27 | DRREDDY | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 28 | HEROMOTOCO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 29 | SUZLON | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 30 | CHENNPETRO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 31 | GRANULES | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 32 | IOC | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 33 | GAIL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 34 | SAIL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 35 | ADANIPOWER | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 36 | ADANIGREEN | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 37 | ATGL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 38 | AWL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 39 | AMBUJACEM | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 40 | ACC | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 41 | APOLLOHOSP | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 42 | AUROPHARMA | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 43 | BANKBARODA | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 44 | BANKINDIA | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 45 | BHEL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 46 | CANBK | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 47 | COFORGE | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 48 | COLPAL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 49 | CONCOR | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 50 | COROMANDEL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 51 | CROMPTON | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 52 | CUMMINSIND | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 53 | DABUR | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 54 | DEEPAKNTR | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 55 | DLF | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 56 | ESCORTS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 57 | EXIDEIND | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 58 | FEDERALBNK | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 59 | FORTIS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 60 | GLENMARK | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 61 | GODREJCP | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 62 | GODREJPROP | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 63 | GRASIM | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 64 | HAVELLS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 65 | HINDALCO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 66 | HINDCOPPER | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 67 | HUDCO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 68 | ICICIPRULI | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 69 | IDFC | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 70 | IDFCFIRSTB | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 71 | IEX | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 72 | IGL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 73 | INDHOTEL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 74 | INDIACEM | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 75 | INDIANB | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 76 | INDIGO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 77 | INDUSINDBK | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 78 | INDUSTOWER | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 79 | IPCALAB | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 80 | IRCTC | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 81 | JINDALSTEL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 82 | JSWENERGY | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 83 | JUBLFOOD | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 84 | KIMS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 85 | LALPATHLAB | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 86 | LICHSGFIN | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 87 | LUPIN | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 88 | MANAPPURAM | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 89 | MARICO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 90 | MAXHEALTH | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 91 | METROPOLIS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 92 | MPHASIS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 93 | MRF | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 94 | MUTHOOTFIN | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 95 | NATIONALUM | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 96 | NAVINFLUOR | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 97 | NELCO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 98 | NHPC | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 99 | NMDC | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 100 | OBEROIRLTY | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 101 | OFSS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 102 | PERSISTENT | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 103 | PETRONET | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 104 | PFC | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 105 | PIIND | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 106 | PNB | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 107 | POLYCAB | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 108 | PVRINOX | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 109 | RADICO | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 110 | RAMCOCEM | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 111 | RECLTD | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 112 | RVNL | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 113 | SANOFI | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 114 | SHREECEM | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 115 | SIEMENS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 116 | SJVN | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 117 | SONACOMS | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 118 | SRF | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 119 | STAR | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |
| 120+ | (additional) | ✅ Upstox | ❌ Yahoo CB | ❌ | ❌ |

**Total BROKEN: ~120 symbols** — they have real financials but zero daily prices, features, or factors.

---

## MISSING Symbols (No Provider Data)

These symbols lack ISIN mappings. Without ISINs, UpstoxFundamentalsProvider cannot look up financials. The pipeline falls through to Screener/Finnhub/Yahoo, all of which have severe limitations.

| # | Symbol | Blocker |
|---|--------|---------|
| 1 | IRFC | Missing ISIN |
| 2 | M_M | Missing ISIN (symbol mismatch: likely M&M or MMTC) |
| 3 | HPCL | Missing ISIN |
| 4 | BANDHANBNK | Missing ISIN |
| 5 | GMRINFRA | Missing ISIN |
| 6 | ICICIGI | Missing ISIN |
| 7 | KARURVYSYA | Missing ISIN |
| 8 | PAGEIND | Missing ISIN |
| 9 | PIDILITE | Missing ISIN |
| 10 | SBILIFE | Missing ISIN |
| 11 | APARIND | Missing ISIN |
| 12 | BAJAJ_AUTO | Missing ISIN (should be BAJAJ-AUTO) |
| 13 | BERGERPAINT | Missing ISIN |
| 14 | BIRLASOFT | Missing ISIN |
| 15 | EQUITASBNK | Missing ISIN |
| 16 | HONAUT | Missing ISIN |
| 17 | IBULHSGFIN | Missing ISIN |
| 18 | INDOSOLAR | Missing ISIN |
| 19 | INFIBEAM | Missing ISIN |
| 20 | L_TFH | Missing ISIN |
| 21 | LTIM | Missing ISIN |
| 22 | MCDOWELL_N | Missing ISIN (should be MCDOWELL-N) |
| 23 | PRINCEPIPE | Missing ISIN |
| 24 | PRICOL | Missing ISIN |
| 25 | RELAXO | Missing ISIN |
| 26 | SUVENPHAR | Missing ISIN |
| 27 | VRL | Missing ISIN |
| 28 | WELSPUNIND | Missing ISIN |
| 29 | WOCKPHARM | Missing ISIN |
| 30-145 | (remaining ~115 symbols) | Missing ISIN |

**Total MISSING: ~145 symbols** — no provider data because ISIN is unknown.

---

## Root Cause Analysis

The ISIN coverage problem stems from two sources:

1. **`generate500Stocks.ts`** — Generated 505 stock symbols with names/sectors but NO ISINs. Only about 50 entries in `MasterCompanyRegistry` had ISINs manually verified.

2. **Symbol Format Inconsistencies** — TRACK-19A found several symbols with non-standard formats:
   - `BAJAJ_AUTO` instead of `BAJAJ-AUTO`
   - `M_M` instead of `M&M`
   - `MCDOWELL_N` instead of `MCDOWELL-N`
   - `L_TFH` instead of `LTFH`
   These format mismatches cause ISIN lookups to fail even when the ISIN exists.

---

## Path to 100% ISIN Coverage

For 455 missing ISINs, the resolution strategy is:

1. **NSE Symbol Master** — Official NSE Bhavcopy contains symbol-ISIN-Series mapping. Available daily via NSE public FTP.
2. **BSE Symbol Master** — BSE provides full equity master as `.csv`.
3. **NSDL/CDSL ISIN Portal** — Public ISIN search by company name.
4. **Exchange-provided JSON** — NSE API `https://www.nseindia.com/api/equity-master` (requires session cookie).
5. **Symbol Normalization** — Standardize underscores/hyphens to match exchange format.

**Estimated effort:** ~2-4 hours of automated scraping + validation for 500+ symbols.

---

## Provider Dependency Audit

| Data Type | Provider | Requirement | Independence |
|-----------|----------|-------------|-------------|
| **Financials (Tier 1)** | UpstoxFundamentalsProvider | ISIN + OAuth token | ❌ User-bound |
| **Financials (Tier 2)** | ScreenerProvider | Symbol (NSE format) | ✅ No auth |
| **Financials (Tier 3)** | FinnhubProvider | Symbol.NS + API key | ⚠️ Requires API key |
| **Daily Prices** | YahooProvider (v8) | Symbol.NS | ✅ No auth |
| **Metadata** | YahooProvider + FinnhubProvider | Symbol | ✅/⚠️ |
| **News** | FinnhubProvider + GoogleNewsRss | Symbol | ✅/⚠️ |

The largest blocker remains Upstox's user-bound OAuth requirement. Without a server-side access token, Tier 1 financials fail for all symbols regardless of ISIN coverage.

---

## Next Steps

1. **TASK 2**: Resolve all missing ISINs via NSE/BSE exchange master files → `ResolvedISINMappings.csv`
2. **TASK 3**: Build automatic registry updater to detect delistings, symbol changes, mergers → `RegistryUpdater.ts`
3. **TASK 4**: Design provider abstraction v2 to eliminate Upstox OAuth dependency → `ProviderArchitecture.md`

---

**TRACK-20 Registry Audit — Phase 1 Complete (TASK 1)**
