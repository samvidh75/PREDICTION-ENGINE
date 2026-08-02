# TRACK-SMOKE-MEGA — 00-BASELINE Audit

| Area | Current State | Defect | Repair |
|------|---------------|--------|--------|
| 1. Current smoke endpoints | 7 checks (healthz, readyz, stockstory/TESTIT, signals, explain/TESTIT, company/TESTIT, portfolio GET) | Missing 7 required contract checks | Added 7 mandatory + 1 diagnostic check (14 total) |
| 2. Mandatory vs optional | explain/TESTIT and company/TESTIT marked optional; portfolio uses GET | explain and company must be mandatory; portfolio must use POST | All production-contract checks now mandatory |
| 3. Readiness assertion depth | Only checks `database` field exists | Does not verify kind=postgres, fallbackUsed=false, checksumMismatch | Added full assertions |
| 4. Portfolio method | GET with query params | Must use POST with JSON body | Changed to POST with body: {positions: []} |
| 5. Private-route auth checks | None | Missing AUTH_MISSING checks for profile, investor-state, watchlists | Added 3 mandatory auth checks |
| 6. Unknown-symbol check | None | Missing unknown symbol 404 check | Added UNKNOWNTEST with SYMBOL_NOT_IN_UNIVERSE assertion |
| 7. JSON report support | None | No machine-readable output | Added reports/release/api-smoke-report.json |
| 8. process.exit usage | process.exit(1) and process.exit(0) | Must use process.exitCode | Replaced with process.exitCode |
| 9. Release-gate orchestration | All checks mandatory regardless of environment | Always fails locally without Docker/PostgreSQL | Added environment probing with NOT_EXECUTED_ENVIRONMENT_MISSING |
| 10. Docker cleanup order | No artifact upload | Smoke report not saved | Added upload-artifact step |
| 11. Release-gate env-gating | Single flat list of commands | Missing many validation steps; Docker cleanup before release:gate | Added full validation pipeline; Docker container stays alive until both smoke:api and release:gate complete |
