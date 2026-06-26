# Build Configuration Guide

## Tool Overview

| Tool | Config File | Purpose |
|------|-------------|---------|
| Vite | `vite.config.ts` | Frontend bundling for React app |
| TypeScript (frontend) | `tsconfig.json` | Frontend type checking |
| TypeScript (backend) | `tsconfig.backend.json` | Backend type checking + compilation |
| Vitest | `vitest.config.ts` | Unit + integration test runner |
| Playwright | `playwright.config.ts` | E2E browser tests |
| ESLint | `eslint.config.js` | Code linting |
| Tailwind CSS | `tailwind.config.js` | Utility CSS framework |
| PostCSS | `postcss.config.js` | CSS post-processing |

## Vite (vite.config.ts)

Handles the frontend React build. Configuration includes:
- **Plugins:** `@vitejs/plugin-react` for JSX transform
- **Dev server:** Port 5174, proxies `/api` to backend (configurable via `VITE_API_TARGET`)
- **Preview server:** Port 4173, same proxy rules
- **Build:** Manual chunk splitting for React, Framer Motion, Firebase

### Environment Variables
Uses `loadEnv(mode, process.cwd(), "")` to load `.env` files.
- `VITE_API_TARGET` — backend URL for dev proxy (default: `http://localhost:4001`)
- All `VITE_*` vars are available in frontend code via `import.meta.env`

## TypeScript

See `docs/CONFIG-EXPLANATION.md` for the complete tsconfig hierarchy.

## Vitest (vitest.config.ts)

Single config supporting two modes via `VITEST_MODE` env var:

### Unit Tests (default)
```
vitest run                           # run all unit tests
npm run test:unit                    # same, with output truncation
npm run test:coverage                # with coverage report
vitest run --project unit            # explicit project selection
```
- Environment: `jsdom`
- Includes: `src/**/*.test.{ts,tsx}`, `scripts/**/*.test.ts`, `tests/**/*.test.ts`
- Excludes: `src/__tests__/integration/**`, `node_modules`, `dist`

### Integration Tests
```
VITEST_MODE=integration vitest run   # run integration tests only
npm run test:integration:sqlite      # SQLite-backed integration tests
npm run test:integration:postgres    # PostgreSQL-backed integration tests
```
- Environment: `node`
- Includes: `src/__tests__/integration/**/*.test.ts`
- Disabled file parallelism (avoids DB connection collisions)
- 30s timeout per test

The `vitest.integration.config.ts` file exists as a thin re-export wrapper for backward compatibility.

### Running Specific Tests
```
vitest run src/component/__tests__/Foo.test.ts   # single file
vitest run --reporter=verbose                     # verbose output
```

## Playwright (playwright.config.ts)

E2E browser tests using Playwright:
- **Test directory:** `tests/playwright/`
- **Base URL:** `http://127.0.0.1:4173` (Vite preview server)
- **Web server:** Auto-starts `npm run dev` on port 4173
- **CI:** 1 retry, 1 worker, HTML reporter
- **Local:** No retries, parallel workers, list reporter

### Running
```
npm run test:e2e                     # full E2E regression
npx playwright test                  # interactive run
npx playwright test --ui             # Playwright UI mode
```

## ESLint (eslint.config.js)

Flat config format (ESLint 10+). Currently lints:
- `src/backend/`, `src/db/`, `src/services/auth/`
- Selected service files
- Scripts: `validate-*.ts`, `audit-*.ts`

Run with: `npm run lint` or `npm run lint:fix`

## Adding a New Tool

1. Create the config file at project root
2. Add the corresponding npm script to `package.json`
3. Document the config in this file
4. Update `docs/CONFIG-EXPLANATION.md` if it involves TypeScript
