# Part K: Engine Validation Report

## Validation Harness
**File**: `src/research/validation/researchValidationHarness.ts`

## Purpose
Sanity-check ranking stability, deterministic scoring, extreme output detection, and overconfidence detection.

## Validation Methodology
The harness runs `computeResearchConviction()` across a batch of company inputs and measures:
- Sample size
- Data availability ratio
- Missing input count
- Score distribution (0-25, 26-50, 51-75, 76-100)
- Top factor drivers
- Deterministic output (re-running same inputs produces same scores)
- Extreme outputs (scores ≥95 or ≤5)
- Overconfidence with weak inputs (confidence ≥70 but ≥3 factors missing)

## Run Results (Synthetic Validation)

### Sample Size
Depends on input data provided to harness.

### Known Limitations
- Validation measures consistency, not predictive accuracy
- No ground truth data for accuracy measurement
- Small sample sizes limit statistical significance
- Synthetic inputs may not reflect real-world distributions

### Deterministic Guarantee
The engine is fully deterministic:
- Same inputs → same outputs (verified by test)
- No randomness in scoring
- No pseudo-random factor

### Score Distribution Expectations
For typical company inputs with reasonable data:
- 60-70% of scores in 51-75 range (moderate conviction)
- 15-25% in 76-100 range (high conviction)
- 10-20% in 0-50 range (needs review/track)

### Overconfidence Detection
The harness flags cases where confidence ≥70 but ≥3 factors are missing. This indicates the engine should not express high confidence with sparse data.

## Usage
```typescript
import { runResearchValidation } from "../src/research/validation/researchValidationHarness";

const companies = [
  { quality: 80, valuation: 45, growth: 65, risk: 70, momentum: 55, stability: 75 },
  // ... more companies
];

const result = runResearchValidation(companies);
console.log(result.scoreDistribution);
console.log(result.knownLimitations);
```

## Next Steps
- Run against real database snapshots for production-grade validation
- Compare score distributions across sectors
- Calibrate weights if systematic biases found
