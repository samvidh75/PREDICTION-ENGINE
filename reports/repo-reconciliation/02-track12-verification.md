# Repository Reconciliation: Track-12 Verification

Audit date: 2026-06-14
Baseline: `origin/main` / `c26e13bb3ae9ecc461afaa3d106029d4f9a464b4`

## Result

Current `main` contains the expected Track-12 scoring work. No source changes are required for ROA, dividend yield, or market-cap scoring.

## Verification Commands

```text
rg -n "roa|dividendYield|marketCap|marketCapSize|quality|valuation|stability" \
  src/stockstory/types.ts \
  src/stockstory/engines/QualityEngine.ts \
  src/stockstory/engines/ValuationEngine.ts \
  src/stockstory/engines/StabilityEngine.ts
```

## `EngineInputs.financials.roa`

File: `src/stockstory/types.ts`

```text
50	  // Financial data
51	  financials: {
52	    peRatio: number | null;
53	    pbRatio: number | null;
54	    eps: number | null;
55	    dividendYield: number | null;
56	    beta: number | null;
57	    marketCap: number | null;
58	    freeFloat: number | null;
59	    fcfYield: number | null;
60	    evEbitda: number | null;
61	    roa: number | null;
62	    roe: number | null;
63	    roic: number | null;
```

ROA is also present in the quality output contract:

```text
100	export interface QualityEngineOutput {
101	  score: number;        // 0-100
102	  roa: number;
103	  roe: number;
104	  roic: number;
```

## QualityEngine ROA Sub-Score and Composite Weight

File: `src/stockstory/engines/QualityEngine.ts`

ROA percentile readiness:

```text
18	    const percentileROE = SectorPercentileEngine.hasSufficientData(sectorName, 'roe');
19	    const percentileROA = SectorPercentileEngine.hasSufficientData(sectorName, 'roa');
20	    const percentileROIC = SectorPercentileEngine.hasSufficientData(sectorName, 'roic');
```

ROA sub-score:

```text
40	    // ── Sub-score 2: ROA ────────────────────────────────────────────
41	    let roaNormalized = 50;
42	    if (financials.roa !== null) {
43	      if (percentileROA) {
44	        roaNormalized = SectorPercentileEngine.score(financials.roa, sectorName, 'roa');
45	      } else {
46	        const roa = financials.roa;
47	        if (roa >= 0.15) roaNormalized = 95;
48	        else if (roa >= 0.10) roaNormalized = 80;
49	        else if (roa >= 0.07) roaNormalized = 65;
50	        else if (roa >= 0.04) roaNormalized = 45;
51	        else if (roa >= 0) roaNormalized = 30;
52	        else roaNormalized = 10;
53	      }
54	    }
```

Composite weight:

```text
114	    const rawComposite = weightedAverage([
115	      { score: roeNormalized, weight: 2.0 },
116	      { score: roaNormalized, weight: 2.0 },
117	      { score: roicNormalized, weight: 2.0 },
118	      { score: grossMarginScore, weight: gmWeight },
119	      { score: operatingMarginScore, weight: 2 },
120	      { score: efficiencyScore, weight: 1 },
121	    ]);
```

Returned field:

```text
129	    return {
130	      score: compositeScore,
131	      roa: financials.roa ?? 0,
132	      roe: financials.roe ?? 0,
```

## ValuationEngine Dividend Yield Score With Yield-Trap Thresholds

File: `src/stockstory/engines/ValuationEngine.ts`

Dividend yield score:

```text
86	    // ── Sub-score 5: Dividend Yield Score (TRACK-12B: yield-trap) ──
87	    let dividendYieldScore = 50;
88	    const divYield = financials.dividendYield;
89	    if (divYield !== null) {
90	      if (divYield >= 0.20) dividendYieldScore = 10;   // Extreme distress (likely unsustainable)
91	      else if (divYield >= 0.12) dividendYieldScore = 25; // Probable distress / value trap
92	      else if (divYield >= 0.08) dividendYieldScore = 50; // Possible distress — neutral
93	      else if (divYield >= 0.04) dividendYieldScore = 90; // Healthy high yield
94	      else if (divYield >= 0.03) dividendYieldScore = 80;
95	      else if (divYield >= 0.02) dividendYieldScore = 65;
96	      else if (divYield >= 0.01) dividendYieldScore = 50;
97	      else if (divYield >= 0.005) dividendYieldScore = 35;
98	      else dividendYieldScore = 20;
99	    }
```

Composite weight and output:

```text
105	    const rawComposite = weightedAverage([
106	      { score: peScore, weight: peWeight },
107	      { score: pbScore, weight: pbWeight },
108	      { score: evEbitdaScore, weight: evWeight },
109	      { score: fcfYieldScore, weight: 3 },
110	      { score: dividendYieldScore, weight: 1.5 },
111	    ]);
```

```text
118	    return {
119	      score: compositeScore,
120	      peScore: clampScore(peScore + factorAdjust * 0.5),
121	      pbScore: clampScore(pbScore + factorAdjust * 0.5),
122	      evEbitdaScore: clampScore(evEbitdaScore + factorAdjust * 0.5),
123	      fcfYieldScore,
124	      dividendYieldScore,
```

## StabilityEngine Market-Cap Size Score With Log10 Scaling

File: `src/stockstory/engines/StabilityEngine.ts`

Documented weight:

```text
20	const STABILITY_WEIGHTS = {
21	  debt: 2.5,
22	  liquidity: 2.0,
23	  volatility: 1.5,
24	  coverage: 2.0,
25	  interestCoverage: 2.0,
26	  marketCapSize: 1.0,
27	} as const;
```

Log10 scaling:

```text
125	    // ── Sub-score 6: Market Cap Size Score (TRACK-12B: log10) ──────
126	    let marketCapSizeScore = 50;
127	    if (financials.marketCap !== null && financials.marketCap > 0) {
128	      const mcapCr = financials.marketCap; // in crores (INR)
129	      const logMcap = Math.log10(mcapCr);
130	      // Continuous log10 scaling: ~10 Cr (log10≈1) → 5, 1L Cr (log10=5) → 81, ~1M Cr (log10=6) → 100
131	      marketCapSizeScore = clampScore((logMcap - 1) / 5 * 95 + 5);
132	    } else if (financials.marketCap !== null) {
133	      marketCapSizeScore = 10; // Negative or zero → score floor
134	    }
```

Composite inclusion:

```text
136	    // ── Composite: INCLUDES marketCapSizeScore (TRACK-P1 fix) ───────
137	    const rawComposite = weightedAverage([
138	      { score: debtScore, weight: STABILITY_WEIGHTS.debt },
139	      { score: cashScore, weight: STABILITY_WEIGHTS.liquidity },
140	      { score: volatilityScore, weight: STABILITY_WEIGHTS.volatility },
141	      { score: coverageScore, weight: STABILITY_WEIGHTS.coverage },
142	      { score: interestCoverageScore, weight: STABILITY_WEIGHTS.interestCoverage },
143	      { score: marketCapSizeScore, weight: STABILITY_WEIGHTS.marketCapSize },
144	    ]);
```

Returned field:

```text
152	    return {
153	      score: compositeScore,
154	      debtScore: clampScore(debtScore + factorAdjust * 0.5),
155	      cashScore,
156	      volatilityScore,
157	      coverageScore,
158	      marketCapSizeScore,
159	      commentary,
```

## Conclusion

Track-12 scoring is already present on current `main`. The historical Track-12 activation branches should be treated as absorbed/stale unless a separate review identifies non-scoring work worth salvaging.
