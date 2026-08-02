# PSE AI Engine — Status Report

**Last updated:** 2026-07-11 (autonomous session, user offline)

## What's live

`src/pse_ai_engine/` — real-time-grounded chat layer on top of the trained
Gemma 2B PSE LoRA (`samvidhh/gemma-pse-lora-checkpoints`, HF Hub, verified intact).

| File | Purpose |
|---|---|
| `realtime_data.py` | Live PSE prices via phisix feed. **Not yfinance** — verified Yahoo Finance has no real PSE listings, only US OTC ADR proxies at wrong prices. |
| `news_scraper.py` | Live market + geopolitical news via Google News RSS, 6s timeout (see bug below). |
| `memory.py` | SQLite conversation history + user facts, multi-turn continuity. |
| `orchestrator.py` | Intent router + generation pipeline. |

## Bugs found and fixed this session

1. **yfinance `.PS`/`.PSE` suffix bug** — silently returned wrong-market data
   (US OTC ADR proxy prices, not real PSE prices). Existing `YFinanceClient.ts`
   likely has this same bug — not yet fixed on the TS side.
2. **`feedparser.parse(url)` had no timeout** — hung the entire chat pipeline
   for minutes on a slow connection. Fixed: fetch bytes via `urllib` with an
   explicit 6s timeout, hand feedparser the bytes instead of a URL.
3. **HF token hardcoded in orchestrator.py** — caught by GitHub push
   protection. Fixed: reads from `HF_TOKEN` env var now.
4. **Signal/body contradiction** (e.g. "Signal: Sell ... more likely to
   recover") — a 2B model doesn't reliably keep a forced opening token
   consistent with what it generates afterward. Tried locking the label into
   the prompt first — didn't work (still produced a fully bullish body under
   a "Sell" label). **Real fix:** generate the analysis body with no signal
   commitment, score its actual bullish/bearish word count, derive the label
   FROM the body. Structural guarantee, not probabilistic. Verified clean on
   JFC and BPI.

## Kaggle GPU — confirmed unavailable

Pushed diagnostic kernels to the only Kaggle account with working credentials
(`samvidh`) to check GPU quota for a possible consistency-focused fine-tune.
Result: `torch.cuda.is_available() == False`, `device_count == 0`,
`nvidia-smi` not even present, despite `enable_gpu: true` in the kernel
metadata. This is very likely the same phone-verification gate that already
blocked internet access on this account (Kaggle gates both behind phone
verification). **No retraining was attempted** — the consistency bug was
fixed architecturally instead (see above), which is a stronger fix than
retraining would have given anyway (retraining reduces the probability of
contradiction; deriving the label from the body eliminates it structurally).

If GPU-accelerated fine-tuning is wanted later: Google Colab is the proven
path (completed the original 35,440-step training end to end already) — no
phone verification gate there. The `samvidhmehta` Kaggle account also has
working GPU + internet (that's where the original training ran), but I don't
have its credentials in this session.

## Honest scope note

This system is a genuinely strong **PSE specialist**: live prices, live news,
conversation memory, structurally-consistent analysis, honest refusal outside
its domain. It is not, and cannot be with a 2B parameter model, a general
replacement for ChatGPT. See prior conversation for the full weakness
breakdown — those tradeoffs still hold except where this doc says otherwise.

## Not yet done

- Fix the same `.PS`/`.PSE` bug in `src/clients/YFinanceClient.ts` (TS side)
- Wire `pse_ai_engine` into the TS backend / web UI
- Response-latency: ~50s per stock analysis on CPU (no GPU available locally
  or on Kaggle) — fine for async use, too slow for a snappy chat UI as-is
