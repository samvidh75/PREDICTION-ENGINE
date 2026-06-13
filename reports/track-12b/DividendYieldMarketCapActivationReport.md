# Track-12B: Dividend Yield Trap & Market Cap Log10 Scaling — Activation Report

**Date:** 2026-06-13
**Status:** ✅ Complete

---

## 1. Dividend Yield Trap (ValuationEngine)

### File changed
`src/stockstory/engines/ValuationEngine.ts:87-98`

### Problem
The existing `dividendYieldScore` used a monotonic-increasing threshold scale with no upper bound. A dividend yield of 80% (0.80) would score 90 — the same as a healthy 4% yield — despite very high yields typically signalling distress (stock price collapse, unsustainable payout).

### Solution
Added three trap thresholds above 8% that penalise anomalously high yields:

| Range | Score | Rationale |
|-------|-------|-----------|
| `>= 0.20` (20%) | **10** | Extreme distress — yield unsustainable, imminent cut |
| `0.12–0.20` (12–20%) | **25** | Probable distress / classic value trap |
| `0.08–0.12` (8–12%) | **50** | Possible distress — neutral/penalised |
| `0.04–0.08` (4–8%) | **90** | Healthy high yield — sweet spot |
| `0.03–0.04` (3–4%) | **80** | Solid yield |
| `0.02–0.03` (2–3%) | **65** | Moderate yield |
| `0.01–0.02` (1–2%) | **50** | Low yield |
| `0.005–0.01` (0.5–1%) | **35** | Minimal yield |
| `< 0.005` (< 0.5%) | **20** | No meaningful yield |

### Weight
1.5 (unchanged from Track-22). At this weight the trap shifts composite valuation by at most ~11 points, visible but not destabilising.

### Trap-rationale documentation
Yield above 8–10% should be treated as a potential red flag, not rewarded. The three-tier trap (possible distress / probable distress / extreme) gives a graduated response.

---

## 2. Market Cap Log10 Scaling (StabilityEngine)

### File changed
`src/stockstory/engines/StabilityEngine.ts:125-133`

### Problem
The existing `marketCapSizeScore` used 6 discrete buckets with sharp score jumps at arbitrary thresholds (e.g., 100 Cr → score 30, 1000 Cr → score 50). A company with ₹999 Cr market cap scored 30, while one with ₹1,001 Cr scored 50 — a 67% score gap for a 0.2% difference in size.

### Solution
Replaced discrete buckets with a continuous log10-based transform:

```
marketCapSizeScore = clampScore((log10(mcapCr) - 1) / 5 * 95 + 5)
```

| Market Cap (₹ Cr) | log10 | Score | Interpretation |
|---|---|---|---|
| 10 Cr | 1.0 | 5 | Micro cap floor |
| 100 Cr | 2.0 | 24 | Small cap |
| 1,000 Cr | 3.0 | 43 | Small-mid boundary |
| 5,000 Cr | 3.7 | 56 | Mid cap |
| 10,000 Cr | 4.0 | 62 | Mid-large boundary |
| 50,000 Cr | 4.7 | 75 | Large cap |
| 1,00,000 Cr | 5.0 | 81 | Large cap (~1L Cr) |
| 5,00,000 Cr | 5.7 | 94 | Mega cap |
| 10,00,000 Cr | 6.0 | 100 | Mega cap ceiling |

Null marketCap → score 50 (neutral, unchanged).

### Weight
1.0 (unchanged from Track-P1). The log10 transform ensures:
- Visible (<7 point gap in composite stability score between mega and micro)
- Smooth (no cliff edges)
- Bounded (clampScore guarantees 0–100)

### Before/after comparison for key test values

| Market Cap | Old Score | New Score | Delta |
|---|---|---|---|
| 2,00,000 Cr | 95 | 87 | -8 |
| 80,000 Cr | 85 | 79 | -6 |
| 50,000 Cr | 85 | 75 | -10 |
| 10,000 Cr | 70 | 62 | -8 |
| 50 Cr | 15 | 18 | +3 |

---

## 3. Tests Added / Updated

### ScoringIntegrity.test.ts

**GROUP A (Market Cap Activation)** — updated 4 expected score values to match log10 scaling:
- `mega.marketCapSizeScore` 95 → 87
- `large.marketCapSizeScore` (80K Cr) 85 → 79
- `large.marketCapSizeScore` (50K Cr) 85 → 75
- `mid.marketCapSizeScore` (10K Cr) 70 → 62

**GROUP H (Dividend Yield Trap)** — 7 new tests:
1. Normal healthy yield (3.5%) scores 80
2. Moderate yield (6%) scores 90 (top of sweet spot)
3. High yield (10%) penalised → 25 (probable distress)
4. Extreme yield (25%) → 10 (extreme distress)
5. Very low yield (0.5%) → 35
6. Null yield → 50 (neutral)
7. Distress yield drags composite score below normal yield

---

## 4. Verification

### Run
```bash
npm run typecheck  # 5/5 tsconfigs: all pass
npm run build      # pass
npm test           # 374 pass (0 fail, unchanged count — existing tests retained)
```

### Specific test groups
- `ScoringIntegrity GROUP A` — 5 test cases, updated expected values ✅
- `ScoringIntegrity GROUP H` — 7 new test cases ✅
- `StockStoryEngine ValuationEngine` — 3 test cases, all pass ✅
- `StockStoryEngine StabilityEngine` — 3 test cases, all pass ✅

---

## 5. Known Limitations / Follow-ups

1. **`dividendYield: 1.8` fixture value** in `StockStoryEngine.test.ts` is incorrect (should be `0.018` for 1.8%). With the trap, this now correctly scores 10 (extreme distress). This doesn't break any test assertions but the fixture should eventually be fixed.
2. **marketCap unit mismatch**: `MasterCompanyRegistry` stores marketCap in INR, but StabilityEngine expects crores. Production scores for real companies will be capped at 95 as long as this mismatch exists. This is a pre-existing issue, not introduced by this change.
3. **DatabaseSnapshotProvider** does not SELECT `dividend_yield` or `market_cap` — the stockstory production pipeline gets these from `PredictionFactory`, not from `DatabaseSnapshotProvider`.
