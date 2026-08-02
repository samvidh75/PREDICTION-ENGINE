# P1 Mega Baseline

Branch: `track-p1-mega-public-beta-hardening`

Base commit: `0657fed52c774d43f50a42e603b5f064f18adc97`

Required P0 merge: `0657fed TRACK-P0-MEGA: stabilize private persistence, prediction correctness, honest data states, and release proof`

## Environment

| Item | Value |
|------|-------|
| Node | `v22.13.1` from temporary `/tmp/codex-node` verifier |
| npm | `10.9.2` |
| CPU | `arm64` |
| OS | `macOS 26.5.1 (25F80)` |
| Docker | `not installed locally` |

## Baseline Commands

| Command | Exit Code | Duration | Log |
|---------|-----------|----------|-----|
| `npm ci` | 0 | 6s | `reports/p1-mega/logs/npm_ci.log` |
| `npm run lint` | 1 | 6s | `reports/p1-mega/logs/npm_run_lint.log` |
| `npm run typecheck:frontend` | 2 | 4s | `reports/p1-mega/logs/npm_run_typecheck_frontend.log` |
| `npm run typecheck:backend` | 2 | 1s | `reports/p1-mega/logs/npm_run_typecheck_backend.log` |
| `npm run typecheck:all` | 2 | 4s | `reports/p1-mega/logs/npm_run_typecheck_all.log` |
| `npm run test:unit` | 1 | 3s | `reports/p1-mega/logs/npm_run_test_unit.log` |
| `npm run test:integration:sqlite` | 0 | 1s | `reports/p1-mega/logs/npm_run_test_integration_sqlite.log` |
| `npm run validate:schema` | 1 | 0s | `reports/p1-mega/logs/npm_run_validate_schema.log` |
| `npm run validate:query-schema` | 1 | 0s | `reports/p1-mega/logs/npm_run_validate_query-schema.log` |
| `npm run validate:distributions` | 0 | 1s | `reports/p1-mega/logs/npm_run_validate_distributions.log` |
| `npm run validate:data-integrity` | 1 | 0s | `reports/p1-mega/logs/npm_run_validate_data-integrity.log` |
| `npm run validate:hygiene` | 1 | 0s | `reports/p1-mega/logs/npm_run_validate_hygiene.log` |
| `npm run test:coverage` | 1 | 2s | `reports/p1-mega/logs/npm_run_test_coverage.log` |
| `npm run build:vercel` | 2 | 3s | `reports/p1-mega/logs/npm_run_build_vercel.log` |
| `npm run build:backend` | 2 | 1s | `reports/p1-mega/logs/npm_run_build_backend.log` |
| `npm run compile:backend` | 2 | 2s | `reports/p1-mega/logs/npm_run_compile_backend.log` |
| `npm audit --omit=dev --audit-level=high` | 0 | 1s | `reports/p1-mega/logs/npm_audit_--omit_dev_--audit-level_high.log` |

## Initial Result

PASS at baseline: install, SQLite integration, distribution validation, production high/critical audit.

FAIL at baseline: lint, TypeScript, unit tests, schema validation, query-schema validation, data-integrity validation, hygiene validation, coverage, Vercel build, backend build, backend compile.
