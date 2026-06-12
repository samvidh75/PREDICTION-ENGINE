# Finnhub Fundamentals Ingestion Implementation

## Files changed

- `scripts/ingest-fundamentals.ts`
- `scripts/yfinance_bridge.py`
- `scripts/__tests__/ingest-fundamentals.test.ts`
- `src/backtest/BenchmarkEngine.ts`
- `docs/data-providers.md`
- `requirements-yfinance.txt`
- `reports/f1-data-quality/10-FINNHUB-INGESTION-IMPLEMENTATION.md`

## CLI commands

```bash
npm run ingest:fundamentals -- --provider=finnhub --symbols=RELIANCE,TCS,INFY --dry-run
npm run ingest:fundamentals -- --provider=finnhub --universe=nifty50 --dry-run
CONFIRM_F1_FUNDAMENTALS_APPLY=true npm run ingest:fundamentals -- --provider=finnhub --symbols=RELIANCE,TCS,INFY --apply
python3 -m pip install -r requirements-yfinance.txt
npm run ingest:fundamentals -- --provider=yfinance --symbols=RELIANCE,TCS,INFY --dry-run
CONFIRM_F1_FUNDAMENTALS_APPLY=true npm run ingest:fundamentals -- --provider=yfinance --symbols=RELIANCE,TCS,INFY --apply
```

## Database writes

Apply mode writes `financial_snapshots`, `ingestion_runs`, `data_completeness_metrics`, and `prediction_input_lineage`. It may update missing sector metadata in `master_security_registry`. It does not write `prediction_registry`.

## Lineage behavior

Each tracked fundamental field gets one lineage record. Valid fields are `real`; missing fields are `unavailable` with `provider field missing`. Source URLs use token-free provider endpoint templates. Finnhub rows are labelled `source_name = finnhub`; explicit yfinance rows are labelled `source_name = yfinance`.

## Completeness rules

Tracked fields are `marketCap`, `peRatio`, `pbRatio`, `eps`, `roe`, `debtToEquity`, `revenueGrowth`, `earningsGrowth`, `operatingMargin`, and `netMargin`.

- `>= 70%`: accepted for scoring review
- `40%–69%`: partial
- `< 40%`: unavailable for full prediction generation

Missing values remain `null`.

## Rate-limit strategy

The CLI defaults to concurrency `3`, supports `--concurrency`, and rejects values above `5`. It uses the existing Finnhub provider retry behavior and does not endlessly retry. The yfinance bridge supports batched historical price requests through `yf.download()`, local JSON caching for quote/fundamental responses, and paced per-symbol quote/fundamental calls. It does not inject `requests-cache` sessions because current yfinance/curl runtimes reject external cached sessions.

## Provider-failure behavior

One symbol failure is recorded as rejected and does not abort a valid multi-symbol batch. If all symbols fail in apply mode, the command exits non-zero.

## Remaining limitations

Live Finnhub dry-run requires `FINNHUB_KEY` or `FINNHUB_API_KEY`. Explicit yfinance runs do not require Finnhub credentials but depend on the local Python `yfinance` runtime. IndianAPI sector fallback is disabled unless `INDIANAPI_KEY` exists. Full prediction generation remains a separate guarded operation.

## Verification commands

```bash
npm run test:unit -- scripts/__tests__/ingest-fundamentals.test.ts
npm run typecheck:all
```
