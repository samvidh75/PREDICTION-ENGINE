# Migration History Report

| Migration | Historical? | Diff from main? | Destructive? | Final Action |
|-----------|-------------|-----------------|--------------|--------------|
| `001_create_warehouse_tables.sql` | Yes | None | No | Retained unchanged |
| `002_create_financial_snapshots.sql` | Yes | None | No | Retained unchanged |
| `003_create_daily_prices.sql` | Yes | None | No | Retained unchanged |
| `004_create_predictions.sql` | Yes | None | No | Retained unchanged |
| `005_create_features.sql` | Yes | None | No | Retained unchanged |
| `006_create_factors.sql` | Yes | None | No | Retained unchanged |
| `007_create_benchmark.sql` | Yes | None | No | Retained unchanged |
| `008_create_predictions_v4.sql` | Yes | None | No | Retained unchanged |
| `009_create_financial_snapshots_v2.sql` | Yes | None | No | Retained unchanged |
| `010_create_retention_tables.sql` | Yes | None | No | Retained unchanged |
| `011_schema_alignment_p0.sql` | Yes | None | No | Retained unchanged |
| `012_align_financial_snapshots_v5.sql` | No | Modified | No | Rewritten to be completely additive and non-destructive using dynamic PostgreSQL `DO` block. |
