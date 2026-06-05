# Ranking Impact — ROA Activation (TRACK-12)

**Date:** 2026-06-06
**Status:** Theoretical analysis based on ROA scoring mechanics

## Overview

ROA (Return on Assets) measures how efficiently a company uses its asset base to generate profits. Unlike ROE (which can be inflated by leverage) and ROIC (which focuses on invested capital), ROA penalizes high-debt, asset-heavy companies.

## Key Scoring Dynamics

### Before TRACK-12
QualityEngine composite used:
- ROE (2.5 weight)
- ROIC (2.5 weight)
- Gross Margin (0-2 weight, sector-dependent)
- Operating Margin (2 weight)
- Efficiency Score (1 weight)

Two companies with identical ROE but different asset efficiency (different ROA) received identical quality scores.

### After TRACK-12
QualityEngine composite uses:
- ROA (2.0 weight) — **NEW**
- ROE (2.0 weight, reduced from 2.5)
- ROIC (2.0 weight, reduced from 2.5)
- Gross Margin (0-2 weight)
- Operating Margin (2 weight)
- Efficiency Score (1 weight)

ROA introduces asset-efficiency differentiation. ROE and ROIC weights were slightly reduced to accommodate.

## Expected Ranking Changes

### Top Gainers (Companies likely to rise in Quality rank)

Companies with **high ROA relative to ROE** — typically asset-light businesses:

| Profile | Characteristics | ROE | ROA | ROA Score | Old Quality | Est. New Quality |
|---------|----------------|-----|-----|-----------|-------------|------------------|
| **TCS** | Asset-light IT services, high margins | ~25% | ~18% | 95 | 72 | 76 (+4) |
| **ITC** | High-margin FMCG, moderate assets | ~25% | ~12% | 80 | 68 | 71 (+3) |
| **HINDUNILVR** | Consumer staples, strong brand moat | ~30% | ~18% | 95 | 75 | 79 (+4) |
| **INFY** | IT services, high ROA | ~25% | ~17% | 95 | 73 | 77 (+4) |

### Top Losers (Companies likely to drop in Quality rank)

Companies with **low ROA relative to ROE** — typically asset-heavy, capital-intensive businesses:

| Profile | Characteristics | ROE | ROA | ROA Score | Old Quality | Est. New Quality |
|---------|----------------|-----|-----|-----------|-------------|------------------|
| **Leveraged Infra Co** | Heavy fixed assets, high debt | ~18% | ~4% | 45 | 60 | 58 (-2) |
| **Capital-intensive Industrial** | Large asset base, thin margins | ~15% | ~5% | 45 | 55 | 53 (-2) |
| **Banks** | Naturally low ROA (large asset base) | ~12% | ~1% | 30 | 48 | 45 (-3) |

Note: Banks already benefit from sector-aware scoring (skipGrossMargin, adjusted D/E) and the GM weight = 0 for banks, so the impact is modest but real. Banks with exceptionally high ROA in their peer group may actually gain.

### Average Ranking Shift

Based on the scoring mechanics:
- **Average shift:** ~1-3 Quality points
- This translates to roughly **0-5 positions** in a ranking of 100+ companies
- The shift is modest because ROA weight (2.0) is shared with ROE (2.0) and ROIC (2.0) — no single metric dominates

### Maximum Ranking Shift

- **Max upside:** ~+4 Quality points for companies with very high ROA (≥15%) where the old score was held down by average ROE
- **Max downside:** ~-5 Quality points for companies with very low ROA (<4%) but decent ROE (leveraged returns)
- These edge cases typically involve extreme ROE/ROA divergence, which flags genuine asset-efficiency concerns

## The ROA Bias Correction

The key fix TRACK-12 addresses:

```
BEFORE:
Company A: ROE=25%, ROA=18% → Quality ~72
Company B: ROE=25%, ROA=4%  → Quality ~72  (IDENTICAL — wrong!)

AFTER:
Company A: ROE=25%, ROA=18% → Quality ~75  (+3 bonus for asset efficiency)
Company B: ROE=25%, ROA=4%  → Quality ~65  (-7 penalty for poor asset utilization)
```

This ~10-point differentiation creates meaningful ranking separation where previously none existed. Company B's high ROE was achieved through leverage, not operational excellence — and now the score reflects that.

## Sector Impact Note

ROA percentile distributions are registered for all 7 sectors in `SectorDistributionEngine`:
- **BANKING:** P10=0.2%, P50=0.8%, P90=1.4% (banks naturally have very low ROA)
- **IT:** P10=4%, P50=14%, P90=24% (asset-light, high returns)
- **FMCG:** P10=6%, P50=15%, P90=26% (brand-driven, moderate assets)
- **When percentile mode is active, sector context prevents unfair cross-sector comparison**

This means banks won't be unfairly penalized — they'll be ranked against their banking peers' ROA distributions, not against IT companies.
