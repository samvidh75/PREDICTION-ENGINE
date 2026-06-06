# TRACK-14A — Factor Concentration & Over-Dependency Analysis

## Q3: Is the System Over-Dependent on Any Single Metric?

### Quality Engine Input Breakdown

| Metric | Weight in Quality | Data Source | Availability Risk | Concentration Risk |
|--------|--------------------|-------------|-------------------|-------------------|
| ROA | 2.0 | FinancialSnapshot | Medium (Upstox primary, Screener fallback) | Moderate |
| ROE | 2.0 | FinancialSnapshot | Low (widely available) | Moderate |
| ROIC | 2.0 | FinancialSnapshot | Medium (Upstox only) | Moderate |
| Gross Margin | 0-2 (sector) | FinancialSnapshot | Medium (Screener enrichment) | Low |
| Operating Margin | 2.0 | FinancialSnapshot | Medium (Screener enrichment) | Low |
| Efficiency Score | 1.0 | Derived | Computed | Low |

**Key finding:** ROA, ROE, and ROIC have equal weight (2.0 each). No single profitability metric dominates. If one metric is unavailable (null), the other two carry the quality score — graceful degradation.

However, all three come from the **same provider chain** (UpstoxFundamentals → Screener → Finnhub → Yahoo). If Upstox API is down, the first two tiers fail simultaneously. Screener can provide margins and growth but not ROIC. This is a **provider concentration risk**, not a metric concentration risk.

---

### Stability Engine Input Breakdown

| Metric | Weight | Data Source | Concentration Risk |
|--------|--------|-------------|-------------------|
| Debt Score (D/E) | Primary | FinancialSnapshot | **HIGH** — dominates stability |
| Cash/Liquidity Score (Current Ratio) | Secondary | FinancialSnapshot | Moderate |
| Volatility Score | Tertiary | FeatureSnapshot | Low (computed from prices) |
| Coverage Score (Interest Coverage) | Tertiary | Derived from OM/D/E | Low |

**Key finding:** Stability is heavily anchored on Debt-to-Equity. A company with very low D/E gets a high stability score regardless of other factors. This is structurally correct (low debt = high stability) but means D/E is the single most influential ratio after the profitability trio.

---

### Individual Metric Influence Assessment

| Metric | Engine(s) | Approximate System-Wide Influence | Over-Dependency Risk |
|--------|-----------|----------------------------------|---------------------|
| **ROE** | Quality (2.0 weight) | ~8-10% of health score | **MODERATE** |
| **ROA** | Quality (2.0 weight) | ~8-10% of health score | **MODERATE** |
| **ROIC** | Quality (2.0 weight) | ~8-10% of health score | **MODERATE** |
| **DebtToEquity** | Stability (primary), Risk, Penalties | ~15-20% of health score | **HIGH** (single metric, 3 pathways) |
| **PE Ratio** | Valuation (primary) | ~5-10% of health score | Moderate |
| **PB Ratio** | Valuation (secondary) | ~2-3% of health score | Low |
| **RevenueGrowth** | Growth (primary) | ~8-12% of health score | Moderate |
| **ProfitGrowth** | Growth (secondary) | ~4-6% of health score | Low |
| **MarketCap** | EngineInputs (no direct scoring) | **0%** (informational only) | **NONE** |
| **Technical indicators** (all 8) | Momentum (15% of pre-adjustment) | ~5-7% of health score after stretch | **LOW** |

---

### Concentration Risk Verdict

**Debt-to-Equity is the single most influential metric** — it feeds Stability (20-30% of health), RiskEngine (dampening), and the Debt penalty pathway. A company's D/E ratio affects health through three independent channels.

**No single profitability metric dominates** — ROE, ROA, and ROIC share equal weight. The system is well-diversified on the quality axis.

**Technical indicators have low influence** — Momentum contributes 10-15% of pre-adjustment, which after sector weighting and stretch translates to ~5-7% of final health score. This is architecturally correct for a fundamentals-first system.

**Recommendation:** Monitor D/E dominance. Consider capping the debt penalty pathway when Stability already penalizes high leverage, to avoid double-counting.
