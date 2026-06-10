# Staged Files Inventory

The following files have been staged for commit after a comprehensive review:

```
 Dockerfile                                         |  8 +++-
 package.json                                       |  2 +-
 reports/smoke-r5/00-DIFF-INVENTORY.md              | 22 +++++++++
 reports/smoke-r5/01-MIGRATION-SAFETY.md            |  7 +++
 reports/smoke-r5/02-LOCAL-MATRIX.md                | 24 ++++++++++
 reports/smoke-r5/03-CHANGE-REVIEW.md               | 47 +++++++++++++++++++
 scripts/fix-esm-imports.js                         | 54 ++++++++++++++++++++++
 scripts/release-gate.ts                            | 16 +++----
 scripts/smoke-test-api.ts                          | 26 +++++++++--
 scripts/validate-repository-hygiene.ts             |  2 +-
 .../postgres-adapter.integration.test.ts           |  6 ++-
 .../postgres-migration.integration.test.ts         |  7 ++-
 .../postgres-readiness.integration.test.ts         | 19 ++++----
 .../postgres-registry.integration.test.ts          |  9 +++-
 src/backend/startServer.ts                         |  2 +-
 src/backend/web/app.ts                             |  2 +-
 src/backend/web/routes/intelligence.ts             |  3 +-
 src/db/DatabaseAdapter.ts                          | 18 +++++++-
 src/db/SQLiteAdapter.ts                            |  1 +
 src/db/__tests__/p0-stabilization.test.ts          | 23 ++++++---
 .../012_align_financial_snapshots_v5.sql           | 37 +++++++++++++++
 src/services/InsightEngine.ts                      | 17 ++++++-
 src/services/NarrativeEngine.ts                    | 20 ++++++--
 vitest.config.ts                                   |  3 +-
 vitest.integration.config.ts                       |  1 +
 25 files changed, 328 insertions(+), 48 deletions(-)
```
