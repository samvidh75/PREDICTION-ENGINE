# Agent H — Replication Package

## Independent Reproduction Guide
1. Open stockstory.db (SQLite) in any SQLite browser
2. Verify alpha_research_registry table contains prediction_date, symbol, prediction_horizon, hit columns
3. Run: SELECT prediction_horizon, COUNT(*), AVG(CASE WHEN hit=1 THEN 1 ELSE 0 END) FROM alpha_research_registry WHERE actual_return IS NOT NULL GROUP BY prediction_horizon
4. Compare hit rates against published: 30d=55.0%, 90d=58.0%, 365d=69.8%
5. For factor replication: SELECT quality_factor, actual_return FROM alpha_research_registry WHERE prediction_horizon=30 AND actual_return IS NOT NULL
6. Compute Pearson correlation: should match ~0.16 at 365d for quality_factor
7. All scripts available in PREDICTION-ENGINE/scripts/track*.cjs

## Data Access
stockstory.db is the single source of truth. No external APIs needed for replication.

## Audit Scripts
- track47_validation.cjs
- track48_master_executor.cjs
- track51_master_executor.cjs
- track53_master_executor.cjs

## Expected Results
| Horizon | Hit Rate | N |
|---------|----------|---|
| 30d | 55.0% | 34,980 |
| 90d | 58.0% | 33,810 |
| 365d | 69.8% | 28,170 |

If results differ, check for: SQLite version differences, data corruption, or script modifications.
