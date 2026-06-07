# AGENT H — Trust Centre V3

## From Static to Live Claims

### Current (V1)
TrustCentrePage.tsx displays:
- Hit rate from /api/predictions/journal (live, but empty if no data)
- Calibration table with expected vs actual (shows "insufficient data" if empty)
- Methodology (static content)
- Data sources (static content)
- Limitations (static content)

### V3 Requirements
Every metric must display:
1. **sample_size** — how many predictions this is based on
2. **last_updated** — when was this computed
3. **confidence_interval** — 95% CI for the metric
4. **validation_status** — "provisional" (< 100 samples) or "established" (≥ 100)

### Claim Retirement
If evidence drops below threshold (e.g., 365d hit rate falls below 40%), the claim automatically shows:
"This metric has been retired due to updated evidence. Previous value was XX%."

No manual claim management. The data drives everything.

### Implementation
Most of this is already handled — TrustCentrePage already shows "insufficient data" when prediction_registry is empty. Adding sample_size + confidence_interval display is a UI enhancement.
