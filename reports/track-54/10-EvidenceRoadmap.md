# AGENT J — 90-Day Evidence Plan

## Timeline

### Day 0-30: Data Foundation
- Populate symbols table with Nifty 500 universe
- Run daily price ingestion for 30 days
- Generate 30d predictions daily
- Expected: 500 symbols × 30 days × 3 horizons = 45,000 prediction records
- Validated after 30d: 500 × 1 day × 3 horizons = 1,500 validations
- **Statistical power**: Weak — 1,500 data points, limited horizons

### Day 31-60: Validation Accumulation
- 30d predictions from Day 0-30 now validated
- 90d predictions from Day 0 still pending
- Expected: 500 × 30 × 3 = 45,000 additional validations
- **Statistical power**: Moderate — 46,500 validated predictions

### Day 61-90: Evidence Strength
- 30d, 90d predictions from Day 0-30 now validated
- 365d predictions from Day 0 still pending
- Expected: 500 × 30 × 3 = 45,000 additional validations
- Running total: ~91,500 validated predictions
- **Statistical power**: Strong — sufficient for credible claims

## When Can SSI Publish Credible Performance Metrics?

### Minimum Threshold
- 100 validated predictions: "Preliminary data"
- 1,000 validated predictions: "Early indicators"  
- 10,000 validated predictions: "Statistically meaningful"
- **90,000 validated predictions (Day 90)**: "Publishable with confidence"

### Publishable Claim (Day 90)
"StockStory India's 7-engine health assessment has demonstrated XX% directional accuracy across 90,000+ validated predictions over 3 horizons, with a Sharpe ratio of X.XX."

### What to Publish Before Day 90
- Day 30: "Prediction engine operational, accumulating evidence" (internal)
- Day 60: "First validated predictions now available in Journal" (beta users)
- Day 90: "Performance metrics published in Trust Centre" (public)

### Success
- ✅ Timeline realistic (90 days for statistical significance)
- ✅ Milestones defined at 30/60/90 days
- ✅ Defensible claim guidance
- ✅ Conservative — don't publish too early
