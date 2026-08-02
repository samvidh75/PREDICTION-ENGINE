# TRACK-SMOKE-R5 change review

## Review Questions & Answers

### 1. Is this production code or test-only?
- **Production changes**:
  - `src/db/DatabaseAdapter.ts`, `src/db/SQLiteAdapter.ts`: Adapter initialization, query logic, and SQL compilation/dialect translation.
  - `src/backend/startServer.ts`, `src/backend/web/app.ts`: Dynamic ESM startup and clean initialization sequence.
  - `src/backend/web/routes/intelligence.ts`: ESM relative imports.
  - `src/services/InsightEngine.ts`, `src/services/NarrativeEngine.ts`: ESM relative imports.
  - `Dockerfile`: Added copy instructions for database files (needed for SQLite retention services) and production setup.
  - `src/db/migrations/012_align_financial_snapshots_v5.sql`: Additive migration to resolve schema layout in a production-safe way.
- **Test-only changes**:
  - `vitest.config.ts`, `vitest.integration.config.ts`: Integration test configuration.
  - `src/db/__tests__/p0-stabilization.test.ts`, `src/__tests__/integration/*`: Unit and integration test adjustments (fixing environment variables).
  - `scripts/release-gate.ts`, `scripts/smoke-test-api.ts`, `scripts/validate-repository-hygiene.ts`: Release gate and validation utility updates.
  - `scripts/fix-esm-imports.js`: Compile-time post-processing script to resolve directory/file ESM shadow names.

### 2. Was the defect reproduced?
- Yes, ESM compilation errors (directory importing shadows, missing extensions) and SQLite empty database errors in Docker were fully reproduced and resolved.

### 3. Is the fix minimal?
- Yes. Code changes target specific resolution/environment gaps without altering core application logic or business features.

### 4. Any security weakening?
- No. Redact primitive filters are preserved. Cookies and authentication rules remain fully intact.

### 5. Any hidden fallback?
- No. SQLite fallback in Postgres mode is disabled explicitly as per policy guidelines.

### 6. Any fake data?
- No. Only standard CI fixtures are seeded when requested in test mode.

### 7. Any broad any cast?
- No new untyped structures are introduced.

### 8. Any weakened test?
- No. All assertions are kept fully intact.

### 9. Any historical migration rewrite?
- No. Historical migrations `009` and `010` remain untouched. A safe, additive `012` migration is used to align schema states.

### 10. Any unnecessary dependency change?
- None. `package.json` only added `scripts/fix-esm-imports.js` invocation to backend compile scripts.

### 11. Any secret committed?
- No. All private keys and env variables are kept in `.env` (ignored) or mocked with safe dummy test values.
