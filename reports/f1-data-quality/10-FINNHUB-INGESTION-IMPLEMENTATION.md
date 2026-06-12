# Finnhub Fundamentals Ingestion Implementation

## Files changed

- `scripts/ingest-fundamentals.ts`
- `scripts/yfinance_bridge.py`
- `scripts/__tests__/ingest-fundamentals.test.ts`
- `scripts/__tests__/yfinance-bridge.contract.test.ts`
- `src/backtest/BenchmarkEngine.ts`
- `.env.production.example`
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
python3 scripts/yfinance_bridge.py historical-batch RELIANCE.NS,TCS.NS,INFY.NS 1mo 1d
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

## Rate-limit and cache strategy

The CLI defaults to concurrency `3`, supports `--concurrency`, and rejects values above `5`. It uses the existing Finnhub provider retry behavior and does not endlessly retry.

The optional yfinance bridge adds:

- chunked historical downloads using one space-separated `yf.download()` ticker batch per chunk;
- `YFINANCE_BATCH_SIZE`, bounded from `1` to `100`, with a default of `40`;
- threaded historical retrieval with actions, repair mode, and bounded timeout;
- per-symbol `Ticker.info` fundamentals calls with randomized delays configured by `YFINANCE_MIN_DELAY_SECONDS` and `YFINANCE_MAX_DELAY_SECONDS`;
- an atomic JSON result cache configured by `YFINANCE_CACHE_PATH` and `YFINANCE_CACHE_SECONDS`;
- optional `requests-cache` HTTP sessions configured by `YFINANCE_REQUEST_CACHE_ENABLED` and `YFINANCE_REQUEST_CACHE_NAME`;
- automatic fallback to native yfinance sessions when an installed runtime rejects the external cached session.

The bridge does not promise unlimited calls and does not bypass Yahoo throttling or provider terms.

## Provider-failure behavior

One symbol failure is recorded as rejected and does not abort a valid multi-symbol batch. If all symbols fail in apply mode, the command exits non-zero. Historical batches return explicit errors and `null` latest-close values when retrieval fails; they do not invent OHLC data.

## Secret handling

API keys and secrets are not committed. Finnhub credentials must be stored through deployment secrets or local environment variables. Credentials pasted into chat, logs, or public locations must be rotated before use.

## Remaining limitations

Live Finnhub dry-run requires `FINNHUB_KEY` or `FINNHUB_API_KEY`. Explicit yfinance runs do not require Finnhub credentials but depend on the local Python `yfinance` runtime. IndianAPI sector fallback is disabled unless `INDIANAPI_KEY` exists. Full prediction generation remains a separate guarded operation. Yahoo data usage rights must be reviewed before production yfinance activation.

## Verification commands

```bash
python3 -m pip install -r requirements-yfinance.txt
npm run test:unit -- scripts/__tests__/ingest-fundamentals.test.ts scripts/__tests__/yfinance-bridge.contract.test.ts
npm run typecheck:all
npm run ingest:fundamentals -- --provider=yfinance --symbols=RELIANCE,TCS,INFY --dry-run
python3 scripts/yfinance_bridge.py historical-batch RELIANCE.NS,TCS.NS,INFY.NS 1mo 1d
```
