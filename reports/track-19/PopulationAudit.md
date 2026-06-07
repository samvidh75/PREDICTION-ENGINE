# TRACK-19 — Phase 2: Real Data Population Audit

## PopulationAudit: Every Script Capable of Creating Snapshots

---

## 1. AUDIT METHODOLOGY

For each snapshot type (`financial_snapshots`, `daily_prices`, `feature_snapshots`, `factor_snapshots`), we identify every script that writes to these tables and classify each as:

- **REAL**: Uses provider API calls exclusively
- **SYNTHETIC**: Uses `Math.random()`, `bounded()`, or hardcoded values
- **MIXED**: Combines real provider data with synthetic components
- **N/A**: Not applicable

---

## 2. financial_snapshots — Population Audit

### Script 1: `populate-real-universe.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | ✅ YES — calls `coordinator.getFinancials(sym)` (line 120) |
| **Uses synthetic values?** | ❌ NO — no `Math.random()`, no `bounded()` |
| **Mixes both?** | ❌ NO |
| **Can populate entire universe?** | ✅ YES — iterates all 505 registry entries |
| **Financial fields populated** | All 22 columns via provider merge chain |
| **Provider chain used** | UpstoxFundamentals → Screener → Finnhub → Yahoo |
| **Classification** | **REAL (provider-derived)** |

### Script 2: `expand-market-coverage.ts` — **FORBIDDEN**

| Question | Answer |
|----------|--------|
| **Uses providers?** | ❌ NO |
| **Uses synthetic values?** | ✅ YES — all financial ratios from `Math.random()` (lines 51-73) |
| **Mixes both?** | ❌ NO — 100% synthetic |
| **Can populate entire universe?** | ✅ YES — but with fake data |
| **Financial fields populated** | All 20 columns with `Math.random()` values |
| **Classification** | **SYNTHETIC (100%) — PRODUCTION REACHABLE** |

Evidence from `expand-market-coverage.ts`, lines 51-54:
```typescript
const peRatio = parseFloat((12 + Math.random() * 48).toFixed(2));
const eps = parseFloat((5 + Math.random() * 95).toFixed(2));
// ... every financial field uses Math.random()
```

### Script 3: `run-research-validation.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | ❌ NO for financials |
| **Uses synthetic values?** | ⚠️ HARDCODED DEFAULTS — `peRatio=20, eps=50, dividendYield=1.5, beta=1.0` (lines 91-96) |
| **Mixes both?** | ❌ NO — uses hardcoded constants, not even random |
| **Can populate entire universe?** | ❌ NO — only 7 hardcoded RESEARCH_SYMBOLS |
| **Classification** | **HARDCODED FALLBACK — NOT PROVIDER-DERIVED** |

Evidence from `run-research-validation.ts`, lines 91-96:
```typescript
await pool.query(
  `INSERT INTO financial_snapshots (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta)
   VALUES ($1, $2, $3, $4, $5, $6, $7) ...`,
  [sym, new Date().toISOString().split("T")[0], 50000000000, 20.0, 50.0, 1.5, 1.0]
);
```

### Script 4: `fundamental-integration.ts` / `real-financial-integration.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | Possible (track-8 scripts) |
| **Uses synthetic values?** | Unknown without deeper inspection |
| **Can populate entire universe?** | ❌ NO — research scripts, not production pipelines |
| **Classification** | **RESEARCH (scope limited)** |

---

## 3. daily_prices — Population Audit

### Script 1: `populate-real-universe.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | ✅ YES — calls `coordinator.getHistory(sym, "2Y")` (line 169) |
| **Uses synthetic values?** | ❌ NO |
| **Mixes both?** | ❌ NO |
| **Can populate entire universe?** | ✅ YES — all 505 symbols |
| **Provider used** | YahooProvider (v8 chart API) |
| **Classification** | **REAL (provider-derived)** |

Evidence from `populate-real-universe.ts`, lines 169:
```typescript
const history = await coordinator.getHistory(sym, "2Y");
```

### Script 2: `expand-market-coverage.ts` — **FORBIDDEN**

| Question | Answer |
|----------|--------|
| **Uses providers?** | ❌ NO |
| **Uses synthetic values?** | ✅ YES — ALL OHLCV candles from `Math.random()` (lines 62-66) |
| **Mixes both?** | ❌ NO — 100% synthetic |
| **Can populate entire universe?** | ✅ YES — but with fake data |
| **Classification** | **SYNTHETIC (100%) — PRODUCTION REACHABLE** |

Evidence from `expand-market-coverage.ts`, lines 62-66:
```typescript
let price = 100.0 + Math.random() * 200;
for (const date of dates) {
  const change = (Math.random() - 0.49) * 2.0; // slight upward bias
  price = Math.max(1.0, price + change);
```

### Script 3: `run-research-validation.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | ✅ YES — calls `coordinator.getHistory(sym, "5Y")` (line 76) |
| **Uses synthetic values?** | ❌ NO |
| **Mixes both?** | ❌ NO |
| **Can populate entire universe?** | ❌ NO — only 7 RESEARCH_SYMBOLS |
| **Provider used** | YahooProvider (v8 chart API) |
| **Classification** | **REAL (provider-derived) — scope limited to 7 symbols** |

---

## 4. feature_snapshots — Population Audit

### Script 1: `populate-real-universe.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | ✅ INDIRECT — FeatureEngine reads from `daily_prices` (real Yahoo data) |
| **Uses synthetic values?** | ❌ NO — pure mathematical derivatives of real price data |
| **Mixes both?** | ❌ NO |
| **Can populate entire universe?** | ✅ YES — iterates all 505 symbols |
| **Computation** | `featureEngine.calculateAndStoreFeatures(sym)` (line 201) |
| **Classification** | **REAL-DERIVED (Math from real prices)** |

Note: FeatureEngine (`src/services/FeatureEngine.ts`) is **purely mathematical** — it contains:
- EMA calculations (lines 237-254)
- RSI, MACD, ADX, ATR, Bollinger, Momentum, Volatility formulas (lines 74-203)
- NO `Math.random()`, NO synthetic data injection
- ONLY `Math.log`, `Math.sqrt`, `Math.pow`, `Math.max`, `Math.min`, `Math.abs` for calculations

### Script 2: `expand-market-coverage.ts` — **FORBIDDEN**

| Question | Answer |
|----------|--------|
| **Uses providers?** | ❌ NO — FeatureEngine reads from synthetic `daily_prices` |
| **Uses synthetic values?** | ✅ YES — derived from synthetic prices |
| **Mixes both?** | ❌ NO |
| **Classification** | **SYNTHETIC-DERIVED (from fake prices)** |

### Script 3: `run-research-validation.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | ✅ INDIRECT — from real Yahoo `daily_prices` |
| **Uses synthetic values?** | ❌ NO |
| **Classification** | **REAL-DERIVED — scope limited to 7 symbols** |

---

## 5. factor_snapshots — Population Audit

### Script 1: `populate-real-universe.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | ✅ INDIRECT — FactorEngine reads `feature_snapshots` (real-derived), `financial_snapshots` (provider-derived), and `daily_prices` (real Yahoo data) |
| **Uses synthetic values?** | ❌ NO |
| **Mixes both?** | ❌ NO |
| **Can populate entire universe?** | ✅ YES — **BUT only if financial_snapshots are also real** |
| **Computation** | `factorEngine.calculateAndStoreFactors(sym)` (line 212) |
| **Classification** | **REAL-DERIVED — IF financials are real** |

**Critical dependency:** FactorEngine reads `financial_snapshots` for:
- `pe_ratio` (used in qualityFactor and valueFactor)
- `dividend_yield` (used in qualityFactor and valueFactor)
- `beta` (used in riskFactor)

If these fields come from provider APIs → factors are REAL-DERIVED.
If these fields are synthetic or hardcoded → factors are INVALID.

### Script 2: `expand-market-coverage.ts` — **FORBIDDEN**

| Question | Answer |
|----------|--------|
| **Uses providers?** | ❌ NO — all inputs synthetic |
| **Uses synthetic values?** | ✅ YES — derived from synthetic features and synthetic financials |
| **Mixes both?** | ❌ NO |
| **Classification** | **SYNTHETIC-DERIVED** |

### Script 3: `run-research-validation.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | ⚠️ PARTIALLY — reads real features, but financials are HARDCODED |
| **Uses synthetic values?** | ⚠️ YES — FactorEngine uses hardcoded financial defaults (peRatio=20, divYield=1.5, beta=1.0) |
| **Mixes both?** | ✅ YES — real features (from real prices) + hardcoded financials |
| **Classification** | **MIXED — factors compromised by hardcoded financials** |

---

## 6. SYMBOLS TABLE — Population Audit

### Script 1: `populate-real-universe.ts`

| Question | Answer |
|----------|--------|
| **Uses providers?** | ❌ NO — reads from `MasterCompanyRegistry` (hardcoded list) |
| **Uses synthetic values?** | ❌ NO — ISINs are REAL (verified NSE/BSE ISINs) |
| **Classification** | **REAL — manually verified registry** |

Evidence: `MasterCompanyRegistry.ts` contains VERIFIED_REGISTRY with hardcoded ISINs from NSE/BSE listings (e.g., `'INE002A01018'` for RELIANCE, `'INE467B01029'` for TCS).

### Script 2: `expand-market-coverage.ts` — **FORBIDDEN**

| Question | Answer |
|----------|--------|
| **Uses providers?** | ❌ NO |
| **Uses synthetic values?** | ✅ YES — fake ISINs (`'INE' + Math.random().toString(36).substr(2, 9).toUpperCase()`) |
| **Classification** | **SYNTHETIC — fake ISINs** |

Evidence from `expand-market-coverage.ts`, line 43:
```typescript
isin: `INE${Math.random().toString(36).substr(2, 9).toUpperCase()}`
```

---

## 7. SUMMARY MATRIX

| Script | financial_snapshots | daily_prices | feature_snapshots | factor_snapshots | symbols |
|--------|---------------------|--------------|-------------------|------------------|---------|
| **populate-real-universe.ts** | ✅ REAL (providers) | ✅ REAL (Yahoo) | ✅ REAL-DERIVED (math) | ✅ REAL-DERIVED (if financials real) | ✅ REAL (verified ISINs) |
| expand-market-coverage.ts | ❌ SYNTHETIC (Math.random) | ❌ SYNTHETIC (Math.random) | ❌ SYNTHETIC-DERIVED | ❌ SYNTHETIC-DERIVED | ❌ SYNTHETIC (fake ISINs) |
| run-research-validation.ts | ❌ HARDCODED (20,1.5,1.0) | ✅ REAL (Yahoo) | ✅ REAL-DERIVED | ⚠️ MIXED (real features + hardcoded financials) | ─ |
| generate-deliverables.ts | ❌ SYNTHETIC (bounded seed) | ❌ SYNTHETIC (bounded seed) | ❌ SYNTHETIC (bounded seed) | ❌ SYNTHETIC (bounded seed) | ─ |

---

## 8. THE CRITICAL GAP

**For 100% real-data factor_snapshots, we need 100% real-data financial_snapshots.**

The ONLY script that populates financial_snapshots from provider APIs is `populate-real-universe.ts`, which relies on:

1. **UpstoxFundamentalsProvider** — requires valid Upstox OAuth access token (user-bound, not available in CI/CD)
2. **ScreenerProvider** — screenscrapes Screener.in (brittle, rate-limited)
3. **FinnhubProvider** — requires FINNHUB_API_KEY env var
4. **YahooProvider** — `getFinancials()` THROWS (v10 blocked with 401; `YahooProvider.ts` line 163)

If ALL of these fail, `populate-real-universe.ts` will catch the error (line 161) and mark the symbol as having no financial data, resulting in incomplete factor_snapshots.

**This is the core question TRACK-19 is answering:** Can we get enough financial coverage from these providers (with whatever credentials are configured) to make StockStory rankings valid?
