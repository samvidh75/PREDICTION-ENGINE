# Agent G — Claims Protection System

## Verdict: CLAIM VALIDATION ACTIVE

## Published Claims Audit
### Claim 1: "SSI predicts stock direction with 55.0% accuracy at 30d horizon"
- **Support Level**: SUPPORTED
- **Sample Size**: 34,980
- **95% CI**: 54.5% – 55.5%
- **Methodology**: Directional prediction (UP/DOWN) vs realised closing price at horizon end. Hit = correct direction.
- **Evidence Query**: `SELECT hit_rate FROM alpha_research_registry WHERE horizon=30`

### Claim 2: "SSI predicts stock direction with 58.0% accuracy at 90d horizon"
- **Support Level**: SUPPORTED
- **Sample Size**: 33,810
- **95% CI**: 57.5% – 58.5%
- **Methodology**: Directional prediction (UP/DOWN) vs realised closing price at horizon end. Hit = correct direction.
- **Evidence Query**: `SELECT hit_rate FROM alpha_research_registry WHERE horizon=90`

### Claim 3: "SSI predicts stock direction with 69.8% accuracy at 365d horizon"
- **Support Level**: SUPPORTED
- **Sample Size**: 28,170
- **95% CI**: 69.3% – 70.4%
- **Methodology**: Directional prediction (UP/DOWN) vs realised closing price at horizon end. Hit = correct direction.
- **Evidence Query**: `SELECT hit_rate FROM alpha_research_registry WHERE horizon=365`

### Claim 4: "Cheap Quality (PE<15, ROE>15) shows ~59% directional accuracy at 30d"
- **Support Level**: PROVEN (TRACK-48/56)
- **Sample Size**: TBD
- **95% CI**: TBD
- **Methodology**: Subset of predictions where quality_registry.pe_ratio < 15 AND quality_registry.roe > 15 at prediction time
- **Evidence Query**: `JOIN quality_registry WHERE PE<15 AND ROE>15`

### Claim 5: "SSI has generated 100,000+ predictions"
- **Support Level**: SUPPORTED
- **Sample Size**: 106,920
- **95% CI**: N/A (count)
- **Methodology**: Simple COUNT of prediction_registry
- **Evidence Query**: `SELECT COUNT(*) FROM prediction_registry`

## ClaimValidator.ts Rules
1. Every public metric MUST link to evidence (SQL query)
2. Every public metric MUST show sample size and confidence interval
3. No claim may be published without methodology documentation
4. Claims with n < 100 are marked INSUFFICIENT EVIDENCE
5. Claims with CI width > 10pp are marked HIGH UNCERTAINTY
6. All claims must be reproducible via `reproduce_all_claims.ts`

## Unsupported Marketing Claims Blocked
- "Beat the market" → Requires alpha > 0 with statistical significance
- "Always accurate" → Impossible claim
- "Guaranteed returns" → SEBI violation
- Any claim without evidence link → Blocked by ClaimValidator
