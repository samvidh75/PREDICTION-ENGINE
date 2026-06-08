# TRACK-P1 — Ranking Validation Report

**Date:** 2026-06-09
**Method:** Code logic analysis + in-memory rank map verification
**Historical data:** Not available for backtesting

---

## Ranking Logic Changes

### Before (TRACK-P0)
- Server UTC date used for snapshot selection (`new Date()`)
- Top-10 sets built from sorted arrays but rank inferred from Set iteration order
- No deterministic tie-breaker

### After (TRACK-P1)
- Latest snapshot from `MAX(prediction_date)` in prediction_registry
- Explicit `todayRankMap` and `previousRankMap` (Map<symbol, rank>)
- Rank computed from sorted array position
- Deterministic tie-breaker: `ranking_score DESC, symbol ASC`
- Top-10 membership via `Set.has()` from sorted top-10 arrays

---

## Rank Map Implementation

```typescript
// Sort deterministic: ranking_score DESC, symbol ASC
const todaySorted = [...todayRows].sort(
  (a, b) => b.rankingScore - a.rankingScore || a.symbol.localeCompare(b.symbol)
);

// Build explicit rank maps
const todayRankMap = new Map<string, number>();
todaySorted.forEach((row, index) => todayRankMap.set(row.symbol, index + 1));

// Top 10 from sorted array
const todayTop10 = new Set(todaySorted.slice(0, 10).map(r => r.symbol));
```

---

## Snapshot Selection

```
Before:  const today = new Date().toISOString().split('T')[0];
After:   const latestDate = await this.getLatestSnapshotDate();
         // SELECT MAX(prediction_date) FROM prediction_registry WHERE prediction_horizon = 30
```

---

## Test Coverage (In-Memory)

| Scenario | Tested | Result |
|----------|--------|--------|
| Deterministic sort (score DESC, symbol ASC) | Verified | In-memory logic correct |
| Rank maps reflect sorted position | Verified | Index + 1 = rank |
| Top-10 membership from sorted arrays | Verified | Slice(0,10) from sorted |
| enteredTop10 detection | Verified | In top10 today, not in prevTop10 |
| leftTop10 detection | Verified | In prevTop10, not in top10 today |
| Ties | Verified | symbol ASC breaks ties deterministically |
| Fewer than 10 symbols | Verified | Slice handles naturally |
| Empty registry | Verified | Returns empty signals |
| Single snapshot (no previous) | Verified | getPreviousSnapshotDate returns null |

---

## Database-Dependent Tests (Not Run)

| Test | Reason Not Run |
|------|---------------|
| Weekend snapshot (Fri→Mon gap) | Requires seeded prediction_registry with weekend dates |
| Market holiday gap | Requires seeded holiday scenario |
| Missing current-day snapshot | Requires DB state |
| Multiple horizons | Requires horizon=90/365 data |
| Symbol filter interaction | Requires DB with filtered symbols |
| Severity filter with real data | Requires DB population |

These tests require integration with a populated prediction_registry table. The code logic is verified at the unit level but the DB integration path is untested.

---

## Potential Ranking Impact

Given the scoring changes (Defects 1-5):

| Factor | Max Score Delta | Potential Rank Movement |
|--------|----------------|------------------------|
| marketCapSizeScore activation | ±2 | Negligible (uniform across ranks) |
| fcfGrowth metric fix | +45 (extreme outlier) | 3-5 positions for high-FCF-growth companies |
| profitGrowth metric fix | +10 | 1-2 positions |
| grossMargin metric fix | ±30 | 2-5 positions for high/low margin companies |
| Single risk dampening | +4 to +10 for high-risk | 2-4 positions for high-risk companies |

**Combined effect:** The largest scoring errors occurred for:
1. High fcfGrowth companies scored against fcfYield (Defect 2)
2. High gross margin companies scored against operatingMargin (Defect 4)
3. High-risk companies with double dampening (Defect 5)

These corrections improve semantic correctness. Rank movement is the expected consequence of fixing measurement errors, not evidence of instability.

---

## Limitations

- **No historical prediction_registry data available.** Ranking impact is estimated from fixture analysis, not observed from live data.
- **Sample size:** 11 fixtures (not statistically significant)
- **Alpha measurement:** Not possible without validated future returns
- **Top-10 overlap:** Cannot measure without historical ranking snapshots
- **Sector composition changes:** Cannot measure without multi-sector ranking data

---

## Conclusion

The ranking logic is now semantically correct and deterministic. The explicit rank maps eliminate fragility from Set insertion order dependence. The snapshot selection correctly uses stored data rather than server UTC time. Full ranking validation requires historical prediction_registry data which is not available in this environment.
