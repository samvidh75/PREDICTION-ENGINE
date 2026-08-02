# MIGRATION SAFETY REPORT

| Migration | Historical? | Applied Risk? | Action |
|-----------|-------------|---------------|--------|
| `009_create_financial_snapshots_v2.sql` | Yes | None | Restored to original committed content; DB dialect collision handled at runtime via DatabaseAdapter. |
| `010_create_retention_tables.sql` | Yes | None | Restored to original committed content; DB dialect collision handled at runtime via DatabaseAdapter. |
| `012_align_financial_snapshots_v5.sql` | No | None | Created new additive migration to safely update table structure without rewriting history. |
