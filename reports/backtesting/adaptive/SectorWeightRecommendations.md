# Sector Weight Recommendations — Adaptive Calibration

**Generated:** 2026-06-05T10:35:39.213Z

**Methodology:** For each sector, average factor-return correlation across all horizons. Allocate weights proportionally to positive correlations. Factors with negative correlations receive minimal (5%) weight.

---

## Calibrated Weights vs Current Weights

### BANKING

| Factor | Current Weight | Calibrated Weight | Change |
|:-------|:---------------|:------------------|:-------|
| growth | 15% | 7% | -8% |
| quality | 35% | 7% | -28% |
| stability | 25% | 71% | +46% |
| valuation | 15% | 7% | -8% |
| momentum | 10% | 7% | -3% |

**Justification:** Driven by stability and growth (highest positive correlations).

### IT

| Factor | Current Weight | Calibrated Weight | Change |
|:-------|:---------------|:------------------|:-------|
| growth | 30% | 20% | -10% |
| quality | 25% | 20% | -5% |
| stability | 15% | 20% | +5% |
| valuation | 15% | 20% | +5% |
| momentum | 15% | 20% | +5% |

**Justification:** No factors show positive correlation. Flat distribution as fallback.

### FMCG

| Factor | Current Weight | Calibrated Weight | Change |
|:-------|:---------------|:------------------|:-------|
| growth | 20% | 20% | +0% |
| quality | 30% | 20% | -10% |
| stability | 25% | 20% | -5% |
| valuation | 15% | 20% | +5% |
| momentum | 10% | 20% | +10% |

**Justification:** No factors show positive correlation. Flat distribution as fallback.

### PHARMA

| Factor | Current Weight | Calibrated Weight | Change |
|:-------|:---------------|:------------------|:-------|
| growth | 25% | 7% | -18% |
| quality | 25% | 71% | +46% |
| stability | 20% | 7% | -13% |
| valuation | 15% | 7% | -8% |
| momentum | 15% | 7% | -8% |

**Justification:** Driven by quality and growth (highest positive correlations).

### AUTO

| Factor | Current Weight | Calibrated Weight | Change |
|:-------|:---------------|:------------------|:-------|
| growth | 20% | 20% | +0% |
| quality | 20% | 20% | +0% |
| stability | 25% | 20% | -5% |
| valuation | 20% | 20% | +0% |
| momentum | 15% | 20% | +5% |

**Justification:** No factors show positive correlation. Flat distribution as fallback.

### ENERGY

| Factor | Current Weight | Calibrated Weight | Change |
|:-------|:---------------|:------------------|:-------|
| growth | 15% | 43% | +28% |
| quality | 20% | 43% | +23% |
| stability | 30% | 4% | -26% |
| valuation | 25% | 4% | -21% |
| momentum | 10% | 4% | -6% |

**Justification:** Driven by growth and quality (highest positive correlations).

---

## Significant Changes

- **BANKING / quality**: Weight shifts by 28 percentage points
- **BANKING / stability**: Weight shifts by 46 percentage points
- **IT / growth**: Weight shifts by 10 percentage points
- **FMCG / quality**: Weight shifts by 10 percentage points
- **FMCG / momentum**: Weight shifts by 10 percentage points
- **PHARMA / growth**: Weight shifts by 18 percentage points
- **PHARMA / quality**: Weight shifts by 46 percentage points
- **PHARMA / stability**: Weight shifts by 13 percentage points
- **ENERGY / growth**: Weight shifts by 28 percentage points
- **ENERGY / quality**: Weight shifts by 23 percentage points
- **ENERGY / stability**: Weight shifts by 26 percentage points
- **ENERGY / valuation**: Weight shifts by 21 percentage points
