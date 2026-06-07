# Agent D — Reproducibility Framework

## Script: `scripts/reproduce_all_claims.ts`
Run: `npx ts-node scripts/reproduce_all_claims.ts`
Output: PASS or FAIL exit code

## Verified Claims
- 365d hit rate (~70% expected)
- 30d hit rate (~55% expected)
- Cheap Quality hit rate (~59% expected)
- Total validated predictions (>50k)
- Walk-forward consistency (all years >54%)

## Exit Codes
- 0: All claims within tolerance ✅
- 1: At least one claim outside tolerance ❌
