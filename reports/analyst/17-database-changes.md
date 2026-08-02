# Part 17 — Database Changes

## Migration

**File:** `src/db/migrations/034_analyst_desk_tables.sql`

Additive tables:

- `analyst_tasks`
- `research_workflows`
- `analyst_outputs`
- `analyst_memos`
- `research_review_queue`
- `research_audit_trails`
- `research_question_answers`
- `filing_briefs`
- `earnings_notes`
- `sector_briefs`
- `watchlist_review_briefs`

## Indexes

- symbol, sector, task_type, status, generated_at, review_status, input_hash, workflow_type

## Runtime note

Default analyst task store and review queue use **in-memory adapters** until DB persistence is wired. Migration is additive and safe to apply.

## Rules followed

- Additive only, no destructive changes
- No secrets in tables
- No raw copyrighted document dumps in broad tables
