# Agent H — Technical Debt Report

## Summary: 12 items (6 HIGH/CRITICAL)

### Inventory
| Severity | Category | Item |
|----------|----------|------|
| HIGH | data | prediction_ledger (empty — needs seed) |
| HIGH | data | outcome_registry_v2 (empty — FK constraint failed) |
| MEDIUM | infra | claim_registry (5 claims seeded, not auto-refreshing) |
| MEDIUM | infra | model_comparison_registry (only SSI-V2 tracked) |
| LOW | cleanup | future_health_registry (RETIRED but table still exists) |
| MEDIUM | architecture | Duplicate FactorSnapshots/FinancialSnapshots concepts |
| HIGH | data | No benchmark returns (NIFTY 50) in outcomes |
| CRITICAL | scientific | 30 stocks universe (survivorship bias not addressed) |
| HIGH | engine | Short-term ranking anti-predictive (30d/90d negative spread) |
| LOW | cleanup | Track scripts in PREDICTION-ENGINE/scripts/ accumulating (~70+ files) |
| HIGH | frontend | Multiple .tsx pages with compile errors (TrustCentre, PortfolioDoctor, DailyFeed) |
| LOW | cleanup | Old QualityEngine.ts V3 still in tree alongside V4/V5 |

### Must Fix Before Public Launch
- ❌ 30 stocks universe (survivorship bias not addressed)

### Should Fix Soon
- ⚠️ prediction_ledger (empty — needs seed)
- ⚠️ outcome_registry_v2 (empty — FK constraint failed)
- ⚠️ No benchmark returns (NIFTY 50) in outcomes
- ⚠️ Short-term ranking anti-predictive (30d/90d negative spread)
- ⚠️ Multiple .tsx pages with compile errors (TrustCentre, PortfolioDoctor, DailyFeed)
