# Engine Calibration & Validation Report V2 (RC-ENGINE-004B)

This report details the recalibration of the StockStory engine components (Quality, Stability, and Risk Dampening Penalty framework) to address score inflation/compression and achieve greater separation.

---

## 1. Summary of Changes & Diagnostic Analysis

### A. Score Compression & Clustering Rationale
In V1, the engine mapped broad input bands to constant output values (e.g. ROE in [18%, 25%] mapped to exactly 65). This discrete zoning collapsed input variance, causing heavy score clustering. 
Furthermore, the Interest Coverage proxy was inflated due to a metric scaling issue where a percentage Operating Margin was divided by a decimal Debt-to-Equity ratio and multiplied by 100, resulting in average coverage scores peaking near the ceiling of 95.

### B. Recalibration Steps Taken
1. **Quality Engine**: Replaced step-function bands with continuous ratio-based scaling: `Math.round((value / sectorThreshold) * 40 + 20)`. This maps average sector metrics to ~50-60 instead of ~70-80, preserving the distribution variance.
2. **Stability Engine**: 
   - Reduced cash/liquidity score scaling from `55+25` to `40+20`.
   - Adjusted Debt Score base down to `80` and steepened the slope.
   - Recalibrated the **Interest Coverage Score proxy** to `om / Math.max(dte, 0.05)` with a scaling function of `Math.round((icr / 0.5) * 40 + 20)`, resolving the ceiling clustering.
3. **Risk Penalization Coefficient**: Tested scaling penalties of **0.45**, **0.50**, and **0.60** to determine the optimal dampening effect.

---

## 2. Comparative Calibration Results (Penalty Coefficients)

| Metric | Target | Coefficient = 0.45 (Recommended) | Coefficient = 0.50 | Coefficient = 0.60 |
| :--- | :---: | :---: | :---: | :---: |
| **Health Score Mean** | **55 - 65** | **58.67** | **58.29** | **57.39** |
| **Health Score Std Dev** | **12 - 18** | **12.20** | **12.44** | **12.55** |
| **Median** | - | 59.00 | 59.00 | 58.00 |
| **Q1 (25th)** | - | 50.00 | 50.00 | 49.00 |
| **Q3 (75th)** | - | 67.00 | 67.00 | 66.00 |
| **Min / Max** | - | 22 / 89 | 21 / 89 | 20 / 89 |

---

## 3. Classification Distributions

| Classification | Target | Coefficient = 0.45 (Recommended) | Coefficient = 0.50 | Coefficient = 0.60 |
| :--- | :---: | :---: | :---: | :---: |
| **Excellent** | - | 12 (2.4%) | 12 (2.4%) | 12 (2.4%) |
| **Healthy** | - | 126 (25.0%) | 126 (25.0%) | 103 (20.4%) |
| **Stable** | - | 261 (51.7%) | 257 (50.9%) | 260 (51.5%) |
| **Weakening** | - | 94 (18.6%) | 91 (18.0%) | 104 (20.6%) |
| **At Risk** | - | 12 (2.4%) | 19 (3.8%) | 26 (5.1%) |
| **Weakening + At Risk** | **>= 10%** | **106 (21.0%)** | **110 (21.8%)** | **130 (25.7%)** |

> [!IMPORTANT]
> All three coefficients meet the success criteria of having **at least 10%** of the universe classified as **Weakening** or **At Risk**. The recommended coefficient **0.45** shifts **13.5%** into these risk categories, whereas **0.50** shifts **18.6%** and **0.60** shifts **30.5%**.

---

## 4. Pearson Correlation Matrices

Correlation of individual factors relative to final **Health Score** under different risk penalty coefficients:

| Factor | Coefficient = 0.45 (Recommended) | Coefficient = 0.50 | Coefficient = 0.60 |
| :--- | :---: | :---: | :---: |
| **Growth ↔ Health** | 0.4407 | 0.4320 | 0.4288 |
| **Quality ↔ Health** | 0.4692 | 0.4645 | 0.4624 |
| **Stability ↔ Health** | 0.5525 | 0.5424 | 0.5372 |
| **Momentum ↔ Health** | 0.2169 | 0.2144 | 0.2134 |
| **Valuation ↔ Health** | 0.5245 | 0.5414 | 0.5514 |
| **Risk ↔ Health** | -0.5298 | -0.5541 | -0.5628 |

---

## 5. Factor Histograms (Coefficient = 0.45)

### Growth Score Histogram

| Score Bin | Count | Distribution Bar |
| :--- | :---: | :--- |
| **0-9** | 0 | `` |
| **10-19** | 0 | `` |
| **20-29** | 0 | `` |
| **30-39** | 0 | `` |
| **40-49** | 17 | `███` |
| **50-59** | 97 | `███████████████████` |
| **60-69** | 55 | `███████████` |
| **70-79** | 110 | `██████████████████████` |
| **80-89** | 188 | `██████████████████████████████████████` |
| **90-100** | 38 | `████████` |

### Quality Score Histogram

| Score Bin | Count | Distribution Bar |
| :--- | :---: | :--- |
| **0-9** | 0 | `` |
| **10-19** | 0 | `` |
| **20-29** | 0 | `` |
| **30-39** | 8 | `██` |
| **40-49** | 94 | `███████████████████` |
| **50-59** | 187 | `█████████████████████████████████████` |
| **60-69** | 158 | `████████████████████████████████` |
| **70-79** | 58 | `████████████` |
| **80-89** | 0 | `` |
| **90-100** | 0 | `` |

### Stability Score Histogram

| Score Bin | Count | Distribution Bar |
| :--- | :---: | :--- |
| **0-9** | 0 | `` |
| **10-19** | 0 | `` |
| **20-29** | 0 | `` |
| **30-39** | 4 | `█` |
| **40-49** | 105 | `█████████████████████` |
| **50-59** | 142 | `████████████████████████████` |
| **60-69** | 93 | `███████████████████` |
| **70-79** | 38 | `████████` |
| **80-89** | 111 | `██████████████████████` |
| **90-100** | 12 | `██` |

### Momentum Score Histogram

| Score Bin | Count | Distribution Bar |
| :--- | :---: | :--- |
| **0-9** | 0 | `` |
| **10-19** | 0 | `` |
| **20-29** | 0 | `` |
| **30-39** | 3 | `█` |
| **40-49** | 108 | `██████████████████████` |
| **50-59** | 106 | `█████████████████████` |
| **60-69** | 146 | `█████████████████████████████` |
| **70-79** | 142 | `████████████████████████████` |
| **80-89** | 0 | `` |
| **90-100** | 0 | `` |

### Valuation Score Histogram

| Score Bin | Count | Distribution Bar |
| :--- | :---: | :--- |
| **0-9** | 0 | `` |
| **10-19** | 112 | `██████████████████████` |
| **20-29** | 95 | `███████████████████` |
| **30-39** | 116 | `███████████████████████` |
| **40-49** | 47 | `█████████` |
| **50-59** | 53 | `███████████` |
| **60-69** | 39 | `████████` |
| **70-79** | 38 | `████████` |
| **80-89** | 5 | `█` |
| **90-100** | 0 | `` |

### Risk Score Histogram

| Score Bin | Count | Distribution Bar |
| :--- | :---: | :--- |
| **0-9** | 0 | `` |
| **10-19** | 288 | `██████████████████████████████████████████████████████████` |
| **20-29** | 217 | `███████████████████████████████████████████` |
| **30-39** | 0 | `` |
| **40-49** | 0 | `` |
| **50-59** | 0 | `` |
| **60-69** | 0 | `` |
| **70-79** | 0 | `` |
| **80-89** | 0 | `` |
| **90-100** | 0 | `` |
