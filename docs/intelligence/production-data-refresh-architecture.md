# Production Data Refresh Architecture

## Design Principles

- **Idempotent**: Running the same job twice produces the same result
- **Resumable**: Jobs can be interrupted and restarted
- **Safe**: No destructive operations; no data loss
- **GPU-free**: No Ollama, SGLang, CUDA, Qdrant dependency
- **Cache-first**: Input hashes prevent unnecessary recomputation
- **Deterministic fallback**: Works without LLM keys
- **No fake data**: Missing fields remain null

## Job Categories

### Daily jobs (before market open)
| Job | Module | Purpose |
|-----|--------|---------|
| `refresh-stock-universe` | StockUniverseIngestion | Update symbol master |
| `refresh-financials` | FinancialSnapshotRefresh | Refresh financial inputs |
| `generate-research` | GenerateResearchSnapshotsJob | Regenerate changed research |
| `refresh-rankings` | RefreshRankingsJob | Recompute scanner rankings |

### Hourly/intraday jobs
| Job | Module | Purpose |
|-----|--------|---------|
| `refresh-technicals` | TechnicalSnapshotRefresh | Update technical indicators |
| `refresh-news` | NewsIngestion | Ingest latest news |
| `generate-events` | GenerateWatchlistAlertsJob | Detect events + alerts |

### On-demand jobs
| Job | Module | Purpose |
|-----|--------|---------|
| `refresh-one-symbol` | JobRunner | Targeted symbol refresh |
| `generate-research --symbol X` | GenerateResearchSnapshotsJob | One research snapshot |
| `ingest-rag-doc` | RagDocumentIngestion | Ingest one RAG document |

## Data Flow

```
Data Sources → Ingestion Modules → DB Tables → Jobs → Research/Scoring
                                                         ↓
                                                    API Routes → Frontend
```

## Module Interface

Every ingestion module implements:
```typescript
interface IngestionJob {
  name: string;
  run(options: JobOptions): Promise<JobResult>;
}
```

Every job returns:
```typescript
interface JobResult {
  success: boolean;
  symbolsProcessed: number;
  successCount: number;
  failureCount: number;
  errors: string[];
  durationMs: number;
}
```

## DB Tables

| Table | Purpose | Ingestion module |
|-------|---------|-----------------|
| `stock_universe` | All tracked symbols | StockUniverseIngestion |
| `financial_snapshots` | Financial fundamentals | FinancialSnapshotRefresh |
| `feature_snapshots` | Technical indicators | TechnicalSnapshotRefresh |
| `news_items` | News/sentiment | NewsIngestion |
| `earnings_snapshots` | Earnings results | EarningsIngestion |
| `stock_events` | Detected events | GenerateWatchlistAlertsJob |
| `stock_factor_scores` | Engine factor scores | GenerateResearchSnapshotsJob |
| `stock_research_snapshots` | Cached research output | GenerateResearchSnapshotsJob |
| `scanner_rankings` | Ranking categories | RefreshRankingsJob |
| `watchlist_alerts` | User alerts | GenerateWatchlistAlertsJob |
| `rag_documents` | RAG text corpus | RagDocumentIngestion |
| `rag_chunks` | RAG chunks | RagDocumentIngestion |
| `job_runs` | Job execution log | JobRunner |

## Scheduling

- Render cron jobs or GitHub Actions scheduled workflows
- Manual execution via `npm run intelligence:job -- <job-name>`
- All jobs safe to run manually at any time
