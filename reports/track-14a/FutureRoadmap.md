# TRACK-14A — Future Roadmap

## Q8: Next Production Development Task After Validation

### Ranked by Expected ROI

---

### 1. Fix D/E Triple-Counting

| Aspect | Detail |
|--------|--------|
| **Task** | Remove `evaluateDebtPenalty` when Stability engine already penalizes high D/E. Keep RiskEngine dampening (different mechanism). |
| **Effort** | ~1 day (remove ~15 lines, adjust penalty framework) |
| **Expected ROI** | **HIGH** — 15-25 position re-ranking for energy/infrastructure stocks. Fairer cross-sector comparisons. |
| **Priority** | **IMMEDIATE** |
| **Risk** | Low — removing one penalty pathway. Other two remain active. |

---

### 2. Cyclical Earnings Normalization

| Aspect | Detail |
|--------|--------|
| **Task** | Add 3-5 year average EPS to ValuationEngine. Use cyclically-adjusted PE (CAPE) instead of trailing PE for cyclical sectors (Energy, Metals, Auto). |
| **Effort** | ~3-5 days (historical financial aggregation, sector detection, scoring logic) |
| **Expected ROI** | **HIGH** — Eliminates "buy at peak PE, sell at trough PE" trap. Better sector rotation. |
| **Priority** | **HIGH** |
| **Risk** | Medium — requires multiple periods of financial data (already available in `financial_snapshots`). |

---

### 3. Database Population (Real Market Data)

| Aspect | Detail |
|--------|--------|
| **Task** | Replace `expand-market-coverage.ts` synthetic data with real market data from Yahoo/Upstox providers. Run `run-research-validation.ts` for all 500+ stocks in the universe. |
| **Effort** | ~1-2 weeks (provider integration, rate limiting, data validation) |
| **Expected ROI** | **HIGH** — All rankings become meaningful. Currently rankings are based on synthetic data. |
| **Priority** | **HIGH** |
| **Risk** | Medium — API rate limits, data quality issues, provider costs. |

---

### 4. Provider Health & Resilience

| Aspect | Detail |
|--------|--------|
| **Task** | Add provider health dashboard. Improve Upstox token refresh. Add Finnhub fallback verification. Monitor data freshness. |
| **Effort** | ~3-5 days |
| **Expected ROI** | **MEDIUM-HIGH** — Prevents silent data degradation. Ensures rankings are based on live data, not stale snapshots. |
| **Priority** | **MEDIUM** |
| **Risk** | Low — ProviderCoordinator already has health monitoring and circuit breakers. |

---

### 5. R&D Capitalization (Pharma/Tech)

| Aspect | Detail |
|--------|--------|
| **Task** | Add R&D-to-Revenue ratio as Quality/Growth input. Adjust operating margin scoring to exclude R&D for pharma/tech sectors. |
| **Effort** | ~2-3 days |
| **Expected ROI** | **MEDIUM** — Fixes pharma ranking inversion. Differentiates innovative companies. |
| **Priority** | **MEDIUM** |
| **Risk** | Low — additive change. Doesn't break existing scoring. |

---

### 6. Universe Expansion

| Aspect | Detail |
|--------|--------|
| **Task** | Expand from 500 stocks to 1000+ (NSE 500 + additional mid-caps). Add SME segment. |
| **Effort** | ~1-2 weeks |
| **Expected ROI** | **MEDIUM** — Broader coverage. More discovery opportunities. |
| **Priority** | **LOW-MEDIUM** |
| **Risk** | High — data quality degradation for small caps. Liquidity concerns. |

---

### 7. Calibration Refinement

| Aspect | Detail |
|--------|--------|
| **Task** | Re-run calibration with real data (after DB population). Adjust stretch factor, risk dampening coefficient, sector weights based on actual distribution. |
| **Effort** | ~2-3 days |
| **Expected ROI** | **MEDIUM** — Better score distribution. More meaningful classification bands. |
| **Priority** | **MEDIUM** (after DB population) |
| **Risk** | Low — calibration scripts already exist (`calibrate_v2.ts`). |

---

### 8. Forward-Looking Component

| Aspect | Detail |
|--------|--------|
| **Task** | Integrate forward earnings estimates, analyst consensus, or news sentiment into scoring. |
| **Effort** | ~2-4 weeks |
| **Expected ROI** | **MEDIUM** — Adds predictive value but introduces noise. |
| **Priority** | **LOW** |
| **Risk** | High — Forward estimates are unreliable. Sentiment is noisy. Adds significant complexity. |

---

### Priority Roadmap Summary

| Priority | Task | Effort | ROI | When |
|----------|------|--------|-----|------|
| **NOW** | Fix D/E triple-counting | 1 day | HIGH | Immediately |
| **NEXT** | Cyclical earnings normalization | 3-5 days | HIGH | Week 1 |
| **NEXT** | Real data population | 1-2 weeks | HIGH | Week 1-2 |
| **THEN** | Provider health & resilience | 3-5 days | MED-HIGH | Week 2-3 |
| **THEN** | R&D capitalization | 2-3 days | MED | Week 3 |
| **THEN** | Calibration refinement | 2-3 days | MED | Week 3-4 |
| **LATER** | Universe expansion | 1-2 weeks | MED | Month 2 |
| **LATER** | Forward-looking component | 2-4 weeks | MED | Month 2-3 |
