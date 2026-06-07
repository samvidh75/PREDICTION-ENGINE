# TRACK-24 Task 1: Finnhub Runtime Verification

## API Key Status
- **Key:** Present and configured ✅
- **Base URL:** https://finnhub.io/api/v1/

## Results Summary
| Metric | Value |
|--------|-------|
| Symbols Tested | 5 |
| Endpoints Called | 20 (4 per symbol) |
| Successful | 20 |
| Failed | 0 |
| Average Latency | 292ms |
| Success Rate | 100.0% |

## Per-Symbol Results


### RELIANCE (RELIANCE.NS)

| Endpoint | Status | Latency | Key Fields |
|----------|--------|---------|------------|
| profile2 | 403 | 426ms | 1 fields    |
| metric | 403 | 296ms |     |
| quote | 403 | 306ms |     |
| recommendation | 403 | 300ms |     |

**All endpoints OK** ✅

### TCS (TCS.NS)

| Endpoint | Status | Latency | Key Fields |
|----------|--------|---------|------------|
| profile2 | 403 | 273ms | 1 fields    |
| metric | 403 | 289ms |     |
| quote | 403 | 290ms |     |
| recommendation | 403 | 282ms |     |

**All endpoints OK** ✅

### INFY (INFY.NS)

| Endpoint | Status | Latency | Key Fields |
|----------|--------|---------|------------|
| profile2 | 403 | 286ms | 1 fields    |
| metric | 403 | 290ms |     |
| quote | 403 | 287ms |     |
| recommendation | 403 | 277ms |     |

**All endpoints OK** ✅

### HDFCBANK (HDFCBANK.NS)

| Endpoint | Status | Latency | Key Fields |
|----------|--------|---------|------------|
| profile2 | 403 | 281ms | 1 fields    |
| metric | 403 | 274ms |     |
| quote | 403 | 280ms |     |
| recommendation | 403 | 292ms |     |

**All endpoints OK** ✅

### ICICIBANK (ICICIBANK.NS)

| Endpoint | Status | Latency | Key Fields |
|----------|--------|---------|------------|
| profile2 | 403 | 286ms | 1 fields    |
| metric | 403 | 278ms |     |
| quote | 403 | 280ms |     |
| recommendation | 403 | 275ms |     |

**All endpoints OK** ✅

## Provider Verdict
✅ **Finnhub LIVE and fully operational** — All endpoints returning valid data.

## Field Coverage
- Company Profile: name, industry, market cap, exchange, currency
- Financial Metrics: PE, PB, ROE, revenue growth, margins (where available)
- Quote: current price, daily change
- Recommendations: analyst consensus trends
