# AGENT H — Alpha Reality Audit

## The Most Important Question
What is the single strongest metric we can publicly claim?

## Candidate Metrics

1. **30-Day Directional Hit Rate**
   - Source: prediction_registry with future_return validated
   - Claim: "XX% of our assessments correctly forecasted directional movement over 30 days"
   - Risk: Requires minimum 100 validated predictions for statistical significance

2. **Average Alpha (excess return vs NIFTY 50)**
   - Source: alpha column in prediction_registry
   - Claim: "Stocks ranked in the top 25% outperformed the NIFTY by XX% on average"
   - Risk: Small sample may inflate or deflate results

3. **Health Score Correlation with Returns**
   - Source: health_score vs validated future_return
   - Claim: "Higher health scores correlate with stronger future returns"
   - Risk: Needs 100+ validated predictions for confidence

## Recommendation
DO NOT publish any metric until:
- 100+ validated predictions exist
- The metric has been independently auditable
- Methodology is fully documented in Trust Centre

## Current State
- Prediction data: dependent on /api/predictions/journal having validated records
- If < 30 validated predictions: state "Not enough data for statistical claims"
- If 30-100: publish with "Preliminary, based on limited data" disclaimer
- If 100+: publish with confidence

## Defensible Claim (IF data supports it)
"The StockStory India health assessment has demonstrated [XX]% directional accuracy across [N] validated predictions."
