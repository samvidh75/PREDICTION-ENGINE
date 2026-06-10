# OS Assumption Inventory — TRACK-PORTABILITY-P2

Generated: 2026-10-06

| # | File | Assumption | Platform Risk | Active? | Fix |
|---|------|-----------|---------------|---------|-----|
| 1 | `.github/workflows/daily-pipeline.yml:42` | `cp .env.production.example .env.production` | Linux/macOS only | Yes | Node `fs.copyFileSync` |
| 2 | `scripts/validate-schema-contract.ts:99` | `require.cache` / `require.resolve()` | CJS-only | Yes | Replace with `resetForTest` |
| 3 | `scripts/validate-schema-contract.ts:95` | `new URL(import.meta.url).pathname` | Windows breaks | Yes | `fileURLToPath` |

## Summary

- **Active shell-specific commands in CI**: 1 (fixed)
- **Active require.cache usage**: 1 (fixed)
- **Path with string concatenation**: None — all use path.join
- **Hardcoded /tmp/ paths**: 0
- **.bat/.cmd/.ps1 scripts**: 3 (intentional Windows helpers)