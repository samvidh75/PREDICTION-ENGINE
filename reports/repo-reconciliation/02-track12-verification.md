# 02 — Track-12 Scoring Verification on `main`

Date: 2026-06-14
Verified against: `a41a2bd70f3328cdeb1e2f1648e81f704074c2b1` (origin/main, local main)

## 1. EngineInputs.financials.roa — present

`src/stockstory/types.ts:61` (inside the `EngineInputs.financials` block):
```
61:    roa: number | null;
```

Full `EngineInputs.financials` (lines 51-75, abbreviated):
```
51:  financials: {
52:    peRatio: number | null;
53:    pbRatio: number | null;
54:    eps: number | null;
55:    dividendYield: number | null;
56:    beta: number | null;
57:    marketCap: number | null;
58:    freeFloat: number | null;
59:    fcfYield: number | null;
60:    evEbitda: number | null;
61:    roa: number | null;            <-- TRACK-12A
62:    roe: number | null;
63:    roic: number | null;
64:    debtToEquity: number | null;
65:    currentRatio: number | null;
...
75:  };
```

`QualityEngineOutput.roa` is also present at `src/stockstory/types.ts:102`:
```
102:  roa: number;
```

## 2. QualityEngine — ROA sub-score active with composite weight

File: `src/stockstory/engines/QualityEngine.ts` (165 lines)

ROA sub-score logic (lines 42-58):
```
42:    // ── Sub-score 2: ROA ────────────────────────────────────────────
43:    let roaNormalized = 50;
44:    if (financials.roa !== null) {
45:      if (percentileROA) {
46:        roaNormalized = SectorPercentileEngine.score(financials.roa, sectorName, 'roa');
47:      } else {
48:        const roa = financials.roa;
49:        if (roa >= 0.15) roaNormalized = 95;
50:        else if (roa >= 0.10) roaNormalized = 80;
51:        else if (roa >= 0.07) roaNormalized = 65;
52:        else if (roa >= 0.04) roaNormalized = 45;
53:        else if (roa >= 0) roaNormalized = 30;
54:        else roaNormalized = 10;
55:      }
56:    }
```

ROA included in composite (lines 125-132):
```
125:    const rawComposite = weightedAverage([
126:      { score: roeNormalized, weight: 2.0 },
127:      { score: roaNormalized, weight: 2.0 },            <-- weight 2.0
128:      { score: roicNormalized, weight: 2.0 },
129:      { score: grossMarginScore, weight: gmWeight },
130:      { score: operatingMarginScore, weight: 2 },
131:      { score: efficiencyScore, weight: 1 },
132:    ]);
```

ROA is also surfaced in the output object (lines 145-150):
```
145:    return {
146:      score: compositeScore,
147:      roa: financials.roa ?? 0,
148:      roe: financials.roe ?? 0,
...
```

Conclusion: **Track-12a (ROA) is active in `main`.**

## 3. ValuationEngine — dividendYieldScore active with yield-trap thresholds

File: `src/stockstory/engines/ValuationEngine.ts` (143 lines)

dividendYieldScore sub-score (lines 90-101):
```
 90:    // ── Sub-score 5: Dividend Yield Score (TRACK-12B: yield-trap) ──
 91:    let dividendYieldScore = 50;
 92:    const divYield = financials.dividendYield;
 93:    if (divYield !== null) {
 94:      if (divYield >= 0.20) dividendYieldScore = 10;   // Extreme distress (likely unsustainable)
 95:      else if (divYield >= 0.12) dividendYieldScore = 25; // Probable distress / value trap
 96:      else if (divYield >= 0.08) dividendYieldScore = 50; // Possible distress — neutral
 97:      else if (divYield >= 0.04) dividendYieldScore = 90; // Healthy high yield
 98:      else if (divYield >= 0.03) dividendYieldScore = 80;
 99:      else if (divYield >= 0.02) dividendYieldScore = 65;
100:      else if (divYield >= 0.01) dividendYieldScore = 50;
101:      else if (divYield >= 0.005) dividendYieldScore = 35;
102:      else dividendYieldScore = 20;
103:    }
```

Yield-trap thresholds (`>= 0.20` floors to 10, `>= 0.12` floors to 25, `>= 0.08` neutral) are present.

dividendYieldScore included in composite (lines 113-119):
```
113:    const rawComposite = weightedAverage([
114:      { score: peScore, weight: peWeight },
115:      { score: pbScore, weight: pbWeight },
116:      { score: evEbitdaScore, weight: evWeight },
117:      { score: fcfYieldScore, weight: 3 },
118:      { score: dividendYieldScore, weight: 1.5 },
119:    ]);
```

dividendYieldScore is exposed in `ValuationEngineOutput` (line 136):
```
136:      dividendYieldScore,
```

Conclusion: **Track-12b dividendYield score is active in `main` with yield-trap thresholds.**

## 4. StabilityEngine — marketCapSizeScore active with log10 scaling

File: `src/stockstory/engines/StabilityEngine.ts` (187 lines)

`STABILITY_WEIGHTS` (lines 19-26):
```
 19: const STABILITY_WEIGHTS = {
 20:   debt: 2.5,
 21:   liquidity: 2.0,
 22:   volatility: 1.5,
 23:   coverage: 2.0,
 24:   interestCoverage: 2.0,
 25:   marketCapSize: 1.0,
 26: } as const;
```

marketCapSizeScore sub-score with log10 scaling (lines 132-139):
```
132:    // ── Sub-score 6: Market Cap Size Score (TRACK-12B: log10) ──────
133:    let marketCapSizeScore = 50;
134:    if (financials.marketCap !== null && financials.marketCap > 0) {
135:      const mcapCr = financials.marketCap; // in crores (INR)
136:      const logMcap = Math.log10(mcapCr);
137:      // Continuous log10 scaling: ~10 Cr (log10≈1) → 5, 1L Cr (log10=5) → 81, ~1M Cr (log10=6) → 100
138:      marketCapSizeScore = clampScore((logMcap - 1) / 5 * 95 + 5);
139:    } else if (financials.marketCap !== null) {
140:      marketCapSizeScore = 10; // Negative or zero → score floor
141:    }
```

marketCapSizeScore included in composite (lines 144-151):
```
144:    const rawComposite = weightedAverage([
145:      { score: debtScore, weight: STABILITY_WEIGHTS.debt },
146:      { score: cashScore, weight: STABILITY_WEIGHTS.liquidity },
147:      { score: volatilityScore, weight: STABILITY_WEIGHTS.volatility },
148:      { score: coverageScore, weight: STABILITY_WEIGHTS.coverage },
149:      { score: interestCoverageScore, weight: STABILITY_WEIGHTS.interestCoverage },
150:      { score: marketCapSizeScore, weight: STABILITY_WEIGHTS.marketCapSize },
151:    ]);
```

marketCapSizeScore is also surfaced in the output (line 162):
```
162:      marketCapSizeScore,
```

Conclusion: **Track-12b marketCap size score is active in `main` with continuous log10 scaling.**

## 5. Overall verdict on Track-12

All three Track-12 deliverables are present and integrated in `main`:

- Track-12a (ROA): EngineInputs.financials.roa at types.ts:61, QualityEngine ROA sub-score with weight 2.0, surface in QualityEngineOutput.roa.
- Track-12b dividend yield: ValuationEngine dividendYieldScore with yield-trap thresholds (0.20/0.12/0.08 floors, weight 1.5).
- Track-12b market cap: StabilityEngine marketCapSizeScore with log10 scaling, weight 1.0.

No re-implementation of ROA / dividendYield / marketCap scoring is needed.

## 6. Provenance (commit chain to verify these came from Track-12 branches)

`git log --oneline origin/main` for the 4 most recent Track-12-related commits:

```
da376d0 fix: correct dividendYield fixture and marketCap INR->crore conversion
4d44975 feat(stockstory): activate dividendYield trap threshold and marketCap log10 scaling
6557a71 feat(stockstory): activate ROA quality scoring end-to-end
4d6704b refactor: introduce request broker for provider API calls
```

All reachable from main via the `df68aad5` merge commit (`Merge track-12-local-opencode-sync: F2/F3/Track-12 chain (ROA, dividend yield, market cap, F3 broker infra, F2 features)`).
