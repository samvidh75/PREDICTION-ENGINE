# Fresh and Upgrade Proofs

| Proof | Result | Rows Before | Rows After | Data Loss? |
|-------|--------|-------------|------------|------------|
| Fresh Install (Port 5433) | PASS | 0 | 1 row per table (seeded via `seed:ci`) | Zero |
| Upgrade Install (Postgres-upgrade-safety integration test) | PASS | 1 | 1 | Zero (All existing records, primary keys, and index constraints preserved) |
