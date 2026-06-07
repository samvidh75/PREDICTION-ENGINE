# TRACK-14A — Top 5 Remaining Weaknesses

## Q6: What Is Still Missing From the Scoring Model?

### Synthesized from all completed audits: TRACK-9A/B/C/D, TRACK-10A/D, TRACK-11, TRACK-12, TRACK-15

---

### Weakness #1: D/E Triple-Counting (Stability + Risk + Penalties)

| Aspect | Detail |
|--------|--------|
| **Severity** | **HIGH** |
| **Impact** | Energy, infrastructure, and capital-intensive companies are penalized 3× for their leverage. A D/E of 2.0 can reduce health by 15-20 points across three pathways. |
| **Evidence** | FactorConcentration.md (TRACK-14A), StructuralBiasAudit.md (TRACK-14A) — D/E feeds Stability (20-30% weight), RiskEngine (dampening coefficient 0.45), and Debt penalty (evaluateDebtPenalty). |
| **Fix complexity** | **LOW** — Remove debt penalty when Stability already scores D/E. Keep RiskEngine dampening (different mechanism: volatility + financial risk). |
| **Expected ROI** | **HIGH** — Fairer cross-sector rankings. Energy stocks rise 5-10 positions. |

---

### Weakness #2: No Cyclical Earnings Normalization

| Aspect | Detail |
|--------|--------|
| **Severity** | **HIGH** |
| **Impact** | Commodity/cyclical sectors (Energy, Metals, Auto) get misleading PE ratios during cycle peaks/troughs. A cyclical company at peak earnings looks "cheap" (low PE). At trough earnings, it looks "expensive" (high PE or negative). The system recommends the wrong action at both extremes. |
| **Evidence** | StructuralBiasAudit.md (TRACK-14A) — "Valuation engine uses current PE — doesn't normalize for cyclicality." Also TRACK-9C financial coverage report. |
| **Fix complexity** | **MEDIUM** — Requires 3-5 year average earnings or Shiller-style CAPE. Needs historical financial data (already available via `financial_snapshots` with multiple periods). |
| **Expected ROI** | **HIGH** — Dramatically better sector rotation signals. Eliminates "buy at peak, sell at trough" PE trap. |

---

### Weakness #3: R&D Expense Penalty (Pharma/Tech)

| Aspect | Detail |
|--------|--------|
| **Severity** | **MEDIUM** |
| **Impact** | R&D-heavy pharma companies (Sun Pharma, Dr. Reddy's) score lower on current margins than generic-focused peers. Innovative companies appear weaker than commodity generic players — the opposite of market reality. |
| **Evidence** | StructuralBiasAudit.md (TRACK-14A) — "R&D intensity not captured. Current scoring favors low-R&D generic players over innovative R&D-heavy pharma." |
| **Fix complexity** | **MEDIUM** — Requires R&D-to-revenue ratio as an input (available via ScreenerProvider). Would adjust Quality or Growth scoring to recognize R&D as future-value investment rather than current-margin drag. |
| **Expected ROI** | **MEDIUM** — Fixes pharma/tech ranking inversion. Differentiates innovative from commoditized businesses. |

---

### Weakness #4: Brand/Intangible Moat Not Captured

| Aspect | Detail |
|--------|--------|
| **Severity** | **MEDIUM** |
| **Impact** | Premium FMCG companies (HUL, Nestle, ITC) with massive brand moats score similarly to commodity FMCG players with similar financials. Gross margins are used as a proxy but don't capture pricing power or brand durability. |
| **Evidence** | StructuralBiasAudit.md (TRACK-14A) — "Brand moat not captured. HUL, ITC should score higher than pure financials suggest." |
| **Fix complexity** | **HIGH** — Brand value is hard to quantify from financial data. Would need gross margin stability over time as a proxy (consistent high margins = pricing power = brand moat). |
| **Expected ROI** | **LOW-MEDIUM** — Subtle improvement. Margins already partially capture this. |

---

### Weakness #5: No Forward-Looking or Sentiment Component

| Aspect | Detail |
|--------|--------|
| **Severity** | **MEDIUM** |
| **Impact** | StockStory is purely backward-looking (historical financials + current technicals). It has no forward earnings estimates, no analyst consensus, no news sentiment integration, no insider trading signals. Rankings lag reality by one quarter. |
| **Evidence** | TRACK-10A Feature Catalog — all features are historical. NewsCoordinator exists but is not integrated into scoring. No forward estimates in EngineInputs. |
| **Fix complexity** | **HIGH** — Requires forward estimates provider, sentiment NLP pipeline, or consensus aggregation. |
| **Expected ROI** | **MEDIUM** — Forward estimates are noisy. Sentiment integration can add value but increases complexity significantly. |

---

### Honorable Mentions (Not Top 5)

| Weakness | Severity | From |
|----------|----------|------|
| Governance penalty inactive (no data source) | Low | TRACK-9C |
| No free cash flow quality metric (FCF/Net Income) | Low | TRACK-9C |
| bollingerWidth dead field (calculated, stored, never consumed) | Low | TRACK-10E DeadFieldAudit |
| relativeStrength analysis-only (not scored) | Low | TRACK-10E DeadFieldAudit |
| No revenue concentration risk (single-product dependency) | Low | Not audited |
| Synthetic data dependency (expand-market-coverage generates fake candles) | Medium | TRACK-10D expand-market-coverage.ts analysis |

---

### Weakness Ranking by Expected Impact

| Rank | Weakness | Severity | Fix Complexity | Expected ROI |
|------|----------|----------|----------------|-------------|
| **#1** | D/E triple-counting | HIGH | LOW | **HIGH** |
| **#2** | No cyclical earnings normalization | HIGH | MEDIUM | **HIGH** |
| **#3** | R&D expense penalty | MEDIUM | MEDIUM | MEDIUM |
| **#4** | Brand moat not captured | MEDIUM | HIGH | LOW-MEDIUM |
| **#5** | No forward-looking component | MEDIUM | HIGH | MEDIUM |
