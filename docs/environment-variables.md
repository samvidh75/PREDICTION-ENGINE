# Environment Variables

Documented variables for PREDICTION-ENGINE. Never commit secret values. Use `.env` for local development.

| Variable | Required Where | Example | Secret? | Default | Notes |
|----------|---------------|---------|---------|---------|-------|
| `NODE_ENV` | All environments | `development` | No | `development` | `production`, `test`, `development` |
| `DB_ADAPTER` | Backend | `postgres` or `sqlite` | No | `sqlite` (dev only) | `postgres` required for production |
| `DATABASE_URL` | Backend (PostgreSQL) | `postgresql://user:pass@host:5432/db` | Yes | — | Required when `DB_ADAPTER=postgres` |
| `ALLOW_SQLITE_FALLBACK` | Backend | `true` | No | `false` | Only enable in dev/test |
| `ALLOW_SQLITE_IN_PRODUCTION` | Backend | `false` | No | `false` | Must be `false` in production |
| `SQLITE_DB_PATH` | Backend (SQLite) | `tmp/dev-sqlite.db` | No | — | Path to SQLite database file |
| `COOKIE_SECRET` | Backend | Random 64-char hex | Yes | — | Required for session signing |
| `FIREBASE_PROJECT_ID` | Backend | `stockstory-india` | No | — | Firebase project identifier |
| `FIREBASE_CLIENT_EMAIL` | Backend | Service account email | Yes | — | Firebase Admin SDK service account |
| `FIREBASE_PRIVATE_KEY` | Backend | PEM private key | Yes | — | Firebase Admin SDK private key |
| `FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS` | Backend | `true` | No | `false` | Use ADC for Google Cloud env |
| `CI_FIXTURE_SEED` | CI/Test | `true` | No | `false` | Enable fixture seeding in CI |
| `REQUIRE_POSTGRES_INTEGRATION` | CI/Test | `true` | No | `false` | Require PostgreSQL for integration tests |
