# 10 — Population Recovery (Checkpointing)

**TRACK-20 Phase 4 — Task 11**
**Date:** 2026-06-06

---

## Problem Statement

TRACK-19A pipeline execution showed a critical flaw: when the pipeline crashes mid-run (circuit breaker, rate limit, crash), ALL progress is lost. No resume capability. A 2-hour pipeline that fails at symbol 489/505 must restart from symbol 1.

**Checkpointing solves this:** After each symbol is fully processed (financials + prices + features + factors), write a checkpoint. On restart, skip all checkpointed symbols.

---

## Checkpoint Architecture

```
nightly_population/
├── start_run()
│   └── Load checkpoint file (if exists)
│       └── Skip completed symbols
│
├── processSymbol(symbol)
│   ├── fetchFinancials()  ─┐
│   ├── fetchPrices()       │ If all succeed:
│   ├── deriveMetrics()     │ → writeCheckpoint(symbol)
│   ├── computeFeatures()   │
│   ├── computeFactors()    │
│   └── writeToDb()        ─┘
│
├── onFailure(symbol, error)
│   └── Log error, DO NOT checkpoint
│       └── Add to retry queue
│
└── complete_run()
    └── Write run manifest
        └── List of completed, failed, skipped symbols
```

---

## Checkpoint File Format

```json
{
  "runId": "nightly-2026-06-07-020000",
  "startedAt": "2026-06-07T02:00:00.000Z",
  "lastUpdatedAt": "2026-06-07T03:47:03.000Z",
  "totalSymbols": 505,
  "completedCount": 489,
  "failedCount": 3,
  "completed": [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "... 489 symbols total ..."
  ],
  "failed": [
    { "symbol": "TINY1", "reason": "Yahoo: not found", "retryCount": 3 },
    { "symbol": "TINY2", "reason": "Finnhub: no metrics", "retryCount": 2 },
    { "symbol": "TINY3", "reason": "DB write timeout", "retryCount": 1 }
  ],
  "currentBatch": 49,
  "circuitBreakerStates": {
    "YahooProvider": "Closed",
    "FinnhubProvider": "Closed",
    "UpstoxFundamentalsProvider": "Degraded"
  }
}
```

---

## Recovery Scenarios

### Scenario 1: Pipeline crashes mid-run (e.g., process killed at symbol 300/505)

1. Restart pipeline
2. `loadCheckpoint()` reads `nightly-2026-06-07-020000.json`
3. `completed` array has 300 symbols
4. Pipeline starts from symbol 301
5. Time saved: ~70 minutes (no need to re-fetch first 300 symbols)

### Scenario 2: Provider outage (Finnhub returns 500 errors for 10 minutes)

1. Pipeline hits batch where Finnhub fails
2. `failed` array accumulates symbols
3. After all symbols attempted, retry failed symbols
4. If Finnhub recovers, retry succeeds
5. If Finnhub doesn't recover, run completes with partial data; failed symbols flagged

### Scenario 3: Pipeline crashes, restarts after 2 hours

1. `completed` array has 489 symbols written to DB
2. Restart loads checkpoint, skips 489 symbols
3. Processes remaining 16 symbols
4. Retries 3 failed symbols
5. Run completes

### Scenario 4: New day, fresh run

1. No checkpoint file exists for today's date
2. Pipeline starts from symbol 1 with empty `completed` array
3. Full run

---

## Checkpoint Persistence

```
Storage location: /var/lib/stockstory/checkpoints/nightly-{YYYY-MM-DD}.json
Fallback: ./data/checkpoints/nightly-{YYYY-MM-DD}.json
```

**Retention:** Keep last 7 days of checkpoints. Auto-delete older.

---

## Progress Persistence Pseudocode

```typescript
interface Checkpoint {
  runId: string;
  startedAt: string;
  lastUpdatedAt: string;
  totalSymbols: number;
  completedCount: number;
  failedCount: number;
  completed: string[];
  failed: FailedEntry[];
  currentBatch: number;
  circuitBreakerStates: Record<string, string>;
}

interface FailedEntry {
  symbol: string;
  reason: string;
  retryCount: number;
}

class CheckpointManager {
  private checkpoint: Checkpoint;
  private filePath: string;

  constructor(runId: string) {
    this.filePath = `./data/checkpoints/nightly-${runId.split('T')[0]}.json`;
    this.checkpoint = this.load() ?? this.createNew(runId);
  }

  private load(): Checkpoint | null {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private createNew(runId: string): Checkpoint {
    return {
      runId,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      totalSymbols: 0,
      completedCount: 0,
      failedCount: 0,
      completed: [],
      failed: [],
      currentBatch: 0,
      circuitBreakerStates: {},
    };
  }

  isCompleted(symbol: string): boolean {
    return this.checkpoint.completed.includes(symbol);
  }

  markCompleted(symbol: string): void {
    if (!this.isCompleted(symbol)) {
      this.checkpoint.completed.push(symbol);
      this.checkpoint.completedCount = this.checkpoint.completed.length;
      this.checkpoint.lastUpdatedAt = new Date().toISOString();
      this.persist();
    }
  }

  markFailed(symbol: string, reason: string): void {
    const existing = this.checkpoint.failed.find(f => f.symbol === symbol);
    if (existing) {
      existing.retryCount++;
      existing.reason = reason;
    } else {
      this.checkpoint.failed.push({ symbol, reason, retryCount: 1 });
    }
    this.checkpoint.failedCount = this.checkpoint.failed.length;
    this.checkpoint.lastUpdatedAt = new Date().toISOString();
    this.persist();
  }

  getRemainingSymbols(allSymbols: string[]): string[] {
    const completedSet = new Set(this.checkpoint.completed);
    const failedSet = new Set(this.checkpoint.failed.map(f => f.symbol));
    return allSymbols.filter(s => !completedSet.has(s) && !failedSet.has(s));
  }

  getRetryableSymbols(): FailedEntry[] {
    return this.checkpoint.failed.filter(f => f.retryCount < 3);
  }

  private persist(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.checkpoint, null, 2), 'utf8');
  }
}
```

---

## Recovery at Scale (505 Symbols)

| Scenario | First Run | Resume After Crash | Time Saved |
|----------|-----------|-------------------|------------|
| No checkpoint | 120 min (full) | N/A | 0 |
| Crash at 20% | 24 min done | 96 min remaining | 24 min |
| Crash at 50% | 60 min done | 60 min remaining | 60 min |
| Crash at 80% | 96 min done | 24 min remaining | 96 min |
| Crash at 99% | 119 min done | 1 min remaining | 119 min |

**Worst case:** Crash at 1% (symbol 5/505) → only 1 min saved. But even this eliminates re-fetching those 5 symbols.

---

## Database Consistency During Recovery

**Problem:** If a symbol is written to DB but checkpoint fails to persist, on restart the symbol may be double-processed.

**Solution:** Idempotent writes.

```sql
INSERT INTO financial_snapshots (symbol, period_end, ...)
VALUES ($1, $2, ...)
ON CONFLICT (symbol, period_end) DO UPDATE SET ...;
```

Each table uses `ON CONFLICT DO UPDATE` (upsert). Double-processing is harmless — same data written twice produces same result.

---

## Cross-Run Cleanup

After a successful run (all symbols processed, all failures retried):
1. Delete today's checkpoint file (run is complete, no resume needed)
2. Archive execution log
3. Update last_successful_run timestamp in DB
4. Clean up checkpoints older than 7 days

---

**TRACK-20 Population Recovery — Phase 4 TASK 11 Complete**
