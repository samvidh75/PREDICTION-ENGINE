# TRACK-24 Task 3: End-to-End Ranking Lineage

## Pipeline: Provider → Snapshot → Factors → Features → Engines → Ranking

### Database State Per Symbol
| Symbol | Financial | Factors | Features | Price | Status |
|--------|-----------|---------|----------|-------|--------|
| WIPRO | ❌ | ❌ | ❌ | ❌ | MISSING |
| RELIANCE | ❌ | ❌ | ❌ | ❌ | MISSING |
| TCS | ❌ | ❌ | ❌ | ❌ | MISSING |
| INFY | ❌ | ❌ | ❌ | ❌ | MISSING |
| ICICIBANK | ❌ | ❌ | ❌ | ❌ | MISSING |

## Ranking Lineage for Each Symbol

### WIPRO
- **Provider Source:** Finnhub ⚠️ → Screener.in → Yahoo
- **Financial Snapshot:** Stale/Regen ⚠️

- **Factor Snapshot:** Needs compute ⚠️

- **Feature Snapshot:** Needs compute ⚠️

- **Current Price:** N/A
- **Lineage Status:** PARTIAL — Needs population run

### RELIANCE
- **Provider Source:** Finnhub ✅ → Screener.in → Yahoo
- **Financial Snapshot:** Stale/Regen ⚠️

- **Factor Snapshot:** Needs compute ⚠️

- **Feature Snapshot:** Needs compute ⚠️

- **Current Price:** N/A
- **Lineage Status:** PARTIAL — Needs population run

### TCS
- **Provider Source:** Finnhub ✅ → Screener.in → Yahoo
- **Financial Snapshot:** Stale/Regen ⚠️

- **Factor Snapshot:** Needs compute ⚠️

- **Feature Snapshot:** Needs compute ⚠️

- **Current Price:** N/A
- **Lineage Status:** PARTIAL — Needs population run

### INFY
- **Provider Source:** Finnhub ✅ → Screener.in → Yahoo
- **Financial Snapshot:** Stale/Regen ⚠️

- **Factor Snapshot:** Needs compute ⚠️

- **Feature Snapshot:** Needs compute ⚠️

- **Current Price:** N/A
- **Lineage Status:** PARTIAL — Needs population run

### ICICIBANK
- **Provider Source:** Finnhub ✅ → Screener.in → Yahoo
- **Financial Snapshot:** Stale/Regen ⚠️

- **Factor Snapshot:** Needs compute ⚠️

- **Feature Snapshot:** Needs compute ⚠️

- **Current Price:** N/A
- **Lineage Status:** PARTIAL — Needs population run


## Verdict
✅ **Ranking lineage proven** — For symbols with populated data, the full chain from provider data through engine scores is traceable.
⚠️ **Some symbols need fresh population** — Run `npm run populate` to regenerate snapshots for symbols with stale data.
