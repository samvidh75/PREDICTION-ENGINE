# TRACK-14A — Structural Bias Audit

## Q5: Known Structural Biases by Sector

---

### 1. Banking / Financial Services

| Bias | Mechanism | Severity | Evidence |
|------|-----------|----------|----------|
| **Low ROA penalty** | Banks naturally have ROA ~0.5-1.5% vs IT's 15-20% | **MITIGATED** | SectorPercentileEngine uses banking-specific ROA percentiles (P10=0.2%, P50=0.8%, P90=1.4%) |
| **High leverage (D/E)** | Banks operate at D/E of 6-12x — normal for sector | **MITIGATED** | SectorWeightEngine assigns Banking: Stability 25%, Quality 35%. Sector-adjustment recognizes high leverage is structural. |
| **Gross Margin skip** | Banks don't have traditional gross margins | **MITIGATED** | `skipGrossMargin` flag in QualityEngine for Banking sector |
| **Valuation complexity** | PB ratio is more relevant than PE for banks | **PARTIAL** | Valuation engine uses PB but doesn't overweight it for banks |

**Verdict:** Banks are well-mitigated but PB ratio should carry higher weight in banking valuation.

---

### 2. Information Technology

| Bias | Mechanism | Severity | Evidence |
|------|-----------|----------|----------|
| **Asset-light bias** | High ROA (15-25%) because few fixed assets | **PRESENT** | IT companies score very high on ROA relative to all-sector benchmarks. Mitigated by sector percentile, but cross-sector comparison still favors IT. |
| **High margin bias** | IT margins 25-40% vs industrials 10-15% | **PRESENT** | Operating/gross margin scoring favors IT |
| **Low debt bias** | Most IT companies are debt-free → max stability | **PRESENT** | Stability scores skewed high for IT |

**Verdict:** IT companies are structurally favored by the system's focus on ROA, margins, and low debt. Sector percentile mode reduces but doesn't eliminate this. IT should consistently rank in the top quartile — this is partially real (IT is genuinely high-quality in India) but the scoring amplifies it.

---

### 3. Energy / Utilities

| Bias | Mechanism | Severity | Evidence |
|------|-----------|----------|----------|
| **High asset base penalty** | Energy companies have massive fixed assets → low ROA | **PRESENT** | ROA scoring penalizes capital-intensive sectors |
| **High leverage penalty** | Energy D/E often 1.5-3x → gets penalized in Stability + Risk + Debt penalty (3 pathways) | **PRESENT** | D/E triple-counting disproportionately hurts energy |
| **Cyclical earnings** | PE ratios misleading during commodity cycles | **PRESENT** | Valuation engine uses current PE — doesn't normalize for cyclicality |
| **Sector-adjusted** | ENERGY weights: Stability 30%, Valuation 25%, Growth 15% | **PARTIAL** | Higher stability/valuation weights help but don't fix the root causes |

**Verdict:** Energy companies are structurally penalized by the ROA + D/E + PE framework. Sector weighting helps but the D/E triple-pathway (Stability + RiskEngine + Debt penalty) is the biggest problem.

---

### 4. Industrials

| Bias | Mechanism | Severity | Evidence |
|------|-----------|----------|----------|
| **Moderate asset penalty** | Fixed assets reduce ROA vs IT/FMCG | **LOW** | Within normal range |
| **Moderate leverage** | D/E 0.5-1.5x — middle of distribution | **LOW** | Scores reasonably |
| **Cyclical margins** | Operating margins vary with economic cycle | **MODERATE** | No cyclical adjustment |

**Verdict:** Industrials are reasonably scored. No severe structural bias.

---

### 5. Consumer / FMCG

| Bias | Mechanism | Severity | Evidence |
|------|-----------|----------|----------|
| **High margin bias** | FMCG gross margins 40-60% → high quality scores | **PRESENT** | Similar to IT — structurally favored |
| **Brand moat not captured** | No intangible/brand value in scoring | **MISSING** | HUL, ITC should score higher than pure financials suggest |
| **Low debt bias** | Most FMCG companies are debt-light | **PRESENT** | Favors FMCG in stability |

**Verdict:** FMCG is structurally favored (high margins, low debt). The missing brand moat means genuinely premium FMCG companies aren't differentiated from average ones — all score high.

---

### 6. Healthcare / Pharma

| Bias | Mechanism | Severity | Evidence |
|------|-----------|----------|----------|
| **R&D intensity not captured** | High R&D spend → lower current margins but higher future value | **MISSING** | Pharma companies investing heavily in R&D are penalized on current margins |
| **Patent cliff risk** | No forward-looking revenue concentration metric | **MISSING** | Generic-heavy pharma scores same as innovative pharma |
| **Moderate margins** | Pharma gross margins 50-70% | **LOW** | Reasonably scored |

**Verdict:** The biggest gap is R&D capitalization. Current scoring favors low-R&D generic players over innovative R&D-heavy pharma — the opposite of market reality.

---

### Bias Summary Table

| Sector | ROA Bias | Leverage Bias | Margin Bias | Growth Bias | Overall Fairness |
|--------|---------|---------------|-------------|-------------|-----------------|
| Banking | MITIGATED (sector percentile) | MITIGATED | MITIGATED (skip GM) | FAIR | ✅ GOOD |
| IT | Favored (high ROA) | Favored (low debt) | Favored (high margins) | FAIR | ⚠️ OVER-SCORED |
| Energy | Penalized (low ROA) | Penalized (high D/E ×3) | FAIR | FAIR | ❌ UNDER-SCORED |
| Industrials | FAIR | FAIR | FAIR | FAIR | ✅ GOOD |
| Consumer/FMCG | Favored (high ROA) | Favored (low debt) | Favored (high margins) | FAIR | ⚠️ OVER-SCORED |
| Healthcare/Pharma | FAIR | FAIR | FAIR | MISSING (R&D) | ⚠️ R&D PENALTY |

---

### Cross-Sector Bias Verdict

**The system has a mild asset-light, low-leverage, high-margin bias.** IT and FMCG are systematically favored. Energy and capital-intensive industrials are systematically penalized. Sector weighting and percentile distributions mitigate but do not eliminate this.

**The single most impactful bias:** D/E triple-counting (Stability + Risk dampening + Debt penalty). A high-D/E energy company can lose 10-15 health points from the same underlying metric hitting three pathways.
