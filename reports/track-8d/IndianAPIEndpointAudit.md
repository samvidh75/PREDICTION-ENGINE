# IndianAPI Endpoint Audit - TRACK-8D

**Generated:** 2026-06-05T18:04:58.839Z
**API Key:** sk-live-...EbDj
**Total Combinations Tested:** 36

---

## Executive Summary

**ENDPOINT REACHABLE BUT NO FUNDAMENTALS DATA.** 14/36 combinations returned HTTP 200, but none contained recognizable fundamentals data.

## Results Summary

| # | Base URL | Endpoint | Symbol | Auth | HTTP Status | Size | JSON? | Has Fundamentals? |
|:--|:---------|:---------|:-------|:-----|:-----------|:-----|:------|:------------------|
| 1 | https://stock.indianapi.in | /stock_fundamentals?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 53B | No | No |
| 2 | https://stock.indianapi.in | /stock?name= | Bare name (RELIANCE) | X-Api-Key header | SUCCESS | 327100B | Yes | No |
| 3 | https://stock.indianapi.in | /stock?symbol= | Bare name (RELIANCE) | X-Api-Key header | 422 | 90B | No | No |
| 4 | https://stock.indianapi.in | /fundamentals?symbol= | Bare name (RELIANCE) | X-Api-Key header | 404 | 53B | No | No |
| 5 | https://stock.indianapi.in | /company/fundamentals?symbol= | Bare name (RELIANCE) | X-Api-Key header | 404 | 53B | No | No |
| 6 | https://stock.indianapi.in | /v1/stock_fundamentals?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 53B | No | No |
| 7 | https://stock.indianapi.in | /v1/stock?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 53B | No | No |
| 8 | https://api.indianapi.in | /stock_fundamentals?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 19B | No | No |
| 9 | https://api.indianapi.in | /stock?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 19B | No | No |
| 10 | https://api.indianapi.in | /stock?symbol= | Bare name (RELIANCE) | X-Api-Key header | 404 | 19B | No | No |
| 11 | https://api.indianapi.in | /fundamentals?symbol= | Bare name (RELIANCE) | X-Api-Key header | 404 | 19B | No | No |
| 12 | https://api.indianapi.in | /company/fundamentals?symbol= | Bare name (RELIANCE) | X-Api-Key header | 404 | 19B | No | No |
| 13 | https://api.indianapi.in | /v1/stock_fundamentals?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 19B | No | No |
| 14 | https://api.indianapi.in | /v1/stock?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 19B | No | No |
| 15 | https://indianapi.in/api | /stock_fundamentals?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 13511B | No | No |
| 16 | https://indianapi.in/api | /stock?name= | Bare name (RELIANCE) | X-Api-Key header | 403 | 4547B | No | No |
| 17 | https://indianapi.in/api | /stock?symbol= | Bare name (RELIANCE) | X-Api-Key header | 403 | 4547B | No | No |
| 18 | https://indianapi.in/api | /fundamentals?symbol= | Bare name (RELIANCE) | X-Api-Key header | 404 | 13511B | No | No |
| 19 | https://indianapi.in/api | /company/fundamentals?symbol= | Bare name (RELIANCE) | X-Api-Key header | 404 | 13511B | No | No |
| 20 | https://indianapi.in/api | /v1/stock_fundamentals?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 13511B | No | No |
| 21 | https://indianapi.in/api | /v1/stock?name= | Bare name (RELIANCE) | X-Api-Key header | 404 | 13511B | No | No |
| 22 | https://stock.indianapi.in | /stock?name= | Bare name (RELIANCE) | X-Api-Key header | SUCCESS | 327100B | Yes | No |
| 23 | https://stock.indianapi.in | /stock?name= | With .NS suffix (RELIANCE.NS) | X-Api-Key header | SUCCESS | 27B | Yes | No |
| 24 | https://stock.indianapi.in | /stock?name= | NSE: prefix (NSE:RELIANCE) | X-Api-Key header | SUCCESS | 27B | Yes | No |
| 25 | https://stock.indianapi.in | /stock?name= | NSE_EQ| format (NSE_EQ|RELIANCE) | X-Api-Key header | SUCCESS | 327100B | Yes | No |
| 26 | https://stock.indianapi.in | /stock?name= | BSE code (500325) (500325) | X-Api-Key header | SUCCESS | 327100B | Yes | No |
| 27 | https://stock.indianapi.in | /stock?name= | ISIN (INE002A01018) (INE002A01018) | X-Api-Key header | SUCCESS | 327100B | Yes | No |
| 28 | https://stock.indianapi.in | /stock?name= | Bare name (RELIANCE) | X-Api-Key header | SUCCESS | 327100B | Yes | No |
| 29 | https://stock.indianapi.in | /stock?name= | Bare name (RELIANCE) | Authorization: Bearer | 400 | 15B | No | No |
| 30 | https://stock.indianapi.in | /stock?name= | Bare name (RELIANCE) | api_key query param | 400 | 15B | No | No |
| 31 | https://stock.indianapi.in | /stock?name= | Bare name (TCS) | X-Api-Key header | SUCCESS | 386187B | Yes | No |
| 32 | https://stock.indianapi.in | /stock?name= | With .NS suffix (TCS.NS) | X-Api-Key header | SUCCESS | 27B | Yes | No |
| 33 | https://stock.indianapi.in | /stock?name= | NSE: prefix (NSE:TCS) | X-Api-Key header | SUCCESS | 27B | Yes | No |
| 34 | https://stock.indianapi.in | /stock?name= | NSE_EQ| format (NSE_EQ|TCS) | X-Api-Key header | SUCCESS | 386187B | Yes | No |
| 35 | https://stock.indianapi.in | /stock?name= | BSE code (532540) (532540) | X-Api-Key header | SUCCESS | 386187B | Yes | No |
| 36 | https://stock.indianapi.in | /stock?name= | ISIN (INE467B01029) (INE467B01029) | X-Api-Key header | SUCCESS | 386187B | Yes | No |

## Response Analysis

### HTTP Status Distribution

| Status | Count | % |
|:-------|:------|:--|
| 404 | 17 | 47% |
| 200 | 14 | 39% |
| 422 | 1 | 3% |
| 403 | 2 | 6% |
| 400 | 2 | 6% |

### Successful Responses

Total: 14 combinations returned HTTP 200.

**None contained fundamental data.** Response sizes range from 27 to 386187 bytes.

### Sample Response Bodies

#### Bare name @ https://stock.indianapi.in/stock?name=RELIANCE

```json
{"companyName":"Reliance Industries","industry":"Oil & Gas Operations","companyProfile":{"companyDescription":"Reliance Industries Limited is engaged in the activities of hydrocarbon exploration and production, petroleum refining and marketing, petrochemicals, advanced materials and composites, renewables, retail and digital services. The Company’s segments include Oil to Chemicals (O2C), Oil and Gas, Retail, and Digital Services. The O2C segment covers refining, petrochemicals, fuel retailing, 
```

#### Bare name @ https://stock.indianapi.in/stock?name=RELIANCE

```json
{"companyName":"Reliance Industries","industry":"Oil & Gas Operations","companyProfile":{"companyDescription":"Reliance Industries Limited is engaged in the activities of hydrocarbon exploration and production, petroleum refining and marketing, petrochemicals, advanced materials and composites, renewables, retail and digital services. The Company’s segments include Oil to Chemicals (O2C), Oil and Gas, Retail, and Digital Services. The O2C segment covers refining, petrochemicals, fuel retailing, 
```

#### With .NS suffix @ https://stock.indianapi.in/stock?name=RELIANCE.NS

```json
{"error":"Stock not found"}
```

#### NSE: prefix @ https://stock.indianapi.in/stock?name=NSE:RELIANCE

```json
{"error":"Stock not found"}
```

#### NSE_EQ| format @ https://stock.indianapi.in/stock?name=NSE_EQ|RELIANCE

```json
{"companyName":"Reliance Industries","industry":"Oil & Gas Operations","companyProfile":{"companyDescription":"Reliance Industries Limited is engaged in the activities of hydrocarbon exploration and production, petroleum refining and marketing, petrochemicals, advanced materials and composites, renewables, retail and digital services. The Company’s segments include Oil to Chemicals (O2C), Oil and Gas, Retail, and Digital Services. The O2C segment covers refining, petrochemicals, fuel retailing, 
```

## Symbol Format Analysis

| Format | Tests | Working | Success Rate |
|:-------|:------|:--------|:------------|
| Bare name | 26 | 0 | 0% |
| With .NS suffix | 2 | 0 | 0% |
| NSE: prefix | 2 | 0 | 0% |
| NSE_EQ| format | 2 | 0 | 0% |
| BSE code (500325) | 1 | 0 | 0% |
| ISIN (INE002A01018) | 1 | 0 | 0% |
| BSE code (532540) | 1 | 0 | 0% |
| ISIN (INE467B01029) | 1 | 0 | 0% |

## Authentication Analysis

| Auth Scheme | Tests | Working | Success Rate |
|:------------|:------|:--------|:------------|
| X-Api-Key header | 34 | 0 | 0% |
| Authorization: Bearer | 1 | 0 | 0% |
| api_key query param | 1 | 0 | 0% |

## Endpoint Path Analysis

| Endpoint | Tests | Working | Success Rate |
|:---------|:------|:--------|:------------|
| /stock_fundamentals | 3 | 0 | 0% |
| /stock | 21 | 0 | 0% |
| /fundamentals | 3 | 0 | 0% |
| /company/fundamentals | 3 | 0 | 0% |
| /v1/stock_fundamentals | 3 | 0 | 0% |
| /v1/stock | 3 | 0 | 0% |

---

## Final Determination

**IndianAPI IS NOT VIABLE for fundamentals.**

After testing 36 combinations across:
- 3 base URLs
- 7 endpoint paths
- 6 symbol formats
- 3 authentication schemes
- 2 companies (RELIANCE, TCS)

**Zero combinations returned recognizable financial fundamentals data.**

### Root cause hypotheses:
1. The API key may be valid but the `/stock_fundamentals` endpoint was deprecated/relocated
2. The API may require a different subscription tier
3. The API may have moved to a different domain entirely
4. The service may have been discontinued

### Recommendation:
- Remove IndianAPIProvider from the financial chain
- Focus on Upstox Fundamentals API (launched May 2026) as the primary Indian equity source
- Or acquire Finnhub premium key ($89/mo)

---

**This audit is based on 36 real HTTP calls. No assumptions.**
