#!/usr/bin/env python3
"""
IndianAPI Premium Async Ingestion Engine.

Fetches stock intelligence data from IndianAPI Premium API,
normalizes it, and stores it in Postgres.

Usage:
  python3 scripts/python/ingest_indianapi_premium.py --symbols=RELIANCE,ITC --dry-run
  python3 scripts/python/ingest_indianapi_premium.py --symbols=RELIANCE,ITC,TCS --write --scan
  python3 scripts/python/ingest_indianapi_premium.py --limit=100 --write
  python3 scripts/python/ingest_indianapi_premium.py --limit=50 --write --no-history
"""

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import aiohttp
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Load .env
load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
API_KEY = os.environ.get("INDIANAPI_PREMIUM_API_KEY") or os.environ.get("INDIANAPI_KEY")
BASE_URL = os.environ.get("INDIANAPI_PREMIUM_BASE_URL", "https://analyst.indianapi.in").rstrip("/")
TIMEOUT = int(os.environ.get("INDIANAPI_PREMIUM_TIMEOUT_MS", "15000")) / 1000
MAX_CONCURRENCY = int(os.environ.get("INDIANAPI_PREMIUM_CONCURRENCY", "20"))
RATE_LIMIT_PER_MINUTE = int(os.environ.get("INDIANAPI_PREMIUM_RATE_LIMIT_PER_MINUTE", "300"))
HISTORY_ENABLED = os.environ.get("INDIANAPI_PREMIUM_HISTORY_ENABLED", "true").lower() != "false"
SCAN_ENABLED = os.environ.get("INDIANAPI_PREMIUM_SCAN_ENABLED", "false").lower() == "true"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pick_first(*values: Any) -> Any:
    for v in values:
        if v is not None:
            return v
    return None


def to_float_or_none(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace(",", "").replace("%", "").strip()
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return None
    return None


def to_percent_or_none(value: Any) -> Optional[float]:
    f = to_float_or_none(value)
    if f is not None:
        return round(f, 2)
    return None


def normalize_analyst_view(raw: Optional[str]) -> str:
    if not raw:
        return "not_available"
    mapping = {
        "strong buy": "positive",
        "buy": "positive",
        "outperform": "positive",
        "accumulate": "positive",
        "hold": "neutral",
        "neutral": "neutral",
        "reduce": "cautious",
        "sell": "cautious",
        "underperform": "cautious",
    }
    return mapping.get(raw.strip().lower(), "not_available")


def extract_latest_news(data: dict) -> tuple[Optional[str], Optional[str]]:
    news = data.get("news") or data.get("latest_news") or data.get("headlines")
    if news and isinstance(news, list) and len(news) > 0:
        first = news[0]
        if isinstance(first, str):
            return first, None
        if isinstance(first, dict):
            return first.get("title") or first.get("headline"), first.get("url")
    return None, None


def compute_completeness(record: dict) -> int:
    fields = [
        "price", "pe_ratio", "pb_ratio", "market_cap",
        "roe", "roce", "debt_to_equity",
        "revenue_growth", "profit_growth",
        "operating_margin", "net_margin",
        "promoter_holding", "fii_holding",
    ]
    available = sum(1 for f in fields if record.get(f) is not None)
    return int((available / len(fields)) * 100)


def compute_source_state(completeness: int) -> str:
    if completeness >= 70:
        return "available"
    elif completeness >= 20:
        return "partial"
    else:
        return "missing"


# ---------------------------------------------------------------------------
# Normalizer
# ---------------------------------------------------------------------------

def normalize_stock_intelligence(symbol: str, data: dict) -> dict:
    d = data.get("data") or data.get("result") or data or {}

    price = to_float_or_none(pick_first(
        d.get("price"), d.get("last_price"), d.get("ltp"),
        d.get("current_price"), d.get("close")
    ))
    target = to_float_or_none(pick_first(
        d.get("target_price"), d.get("target"), d.get("price_target"),
        d.get("consensus_target")
    ))

    external_upside = None
    if price and target and price > 0:
        external_upside = round(((target - price) / price) * 100, 2)

    news_title, news_url = extract_latest_news(d)
    analyst_raw = pick_first(
        d.get("analyst_view"), d.get("analyst_rating"),
        d.get("rating"), d.get("recommendation"),
        d.get("view")
    )

    record = {
        "symbol": symbol.upper(),
        "company_name": d.get("company_name") or d.get("company") or d.get("name"),
        "as_of": d.get("as_of") or d.get("date") or d.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "price": price,
        "change_percent": to_percent_or_none(pick_first(
            d.get("change_percent"), d.get("change"), d.get("percentage_change"),
            d.get("daily_change_percent")
        )),
        "pe_ratio": to_float_or_none(pick_first(
            d.get("pe_ratio"), d.get("pe"), d.get("price_to_earnings"),
            d.get("trailing_pe")
        )),
        "pb_ratio": to_float_or_none(pick_first(
            d.get("pb_ratio"), d.get("pb"), d.get("price_to_book"),
            d.get("book_value_multiple")
        )),
        "market_cap": to_float_or_none(pick_first(
            d.get("market_cap"), d.get("market_capitalization"),
            d.get("mcap")
        )),
        "roe": to_percent_or_none(pick_first(
            d.get("roe"), d.get("return_on_equity")
        )),
        "roce": to_percent_or_none(pick_first(
            d.get("roce"), d.get("return_on_capital_employed")
        )),
        "debt_to_equity": to_float_or_none(pick_first(
            d.get("debt_to_equity"), d.get("debt_equity"),
            d.get("debt_to_equity_ratio")
        )),
        "revenue_growth": to_percent_or_none(pick_first(
            d.get("revenue_growth"), d.get("sales_growth"),
            d.get("revenue_growth_percent")
        )),
        "profit_growth": to_percent_or_none(pick_first(
            d.get("profit_growth"), d.get("net_profit_growth"),
            d.get("earnings_growth"), d.get("profit_growth_percent")
        )),
        "operating_margin": to_percent_or_none(pick_first(
            d.get("operating_margin"), d.get("op_margin"),
            d.get("operating_profit_margin")
        )),
        "net_margin": to_percent_or_none(pick_first(
            d.get("net_margin"), d.get("profit_margin"),
            d.get("net_profit_margin")
        )),
        "promoter_holding": to_percent_or_none(pick_first(
            d.get("promoter_holding"), d.get("promoter_pct"),
            d.get("promoter_shareholding")
        )),
        "fii_holding": to_percent_or_none(pick_first(
            d.get("fii_holding"), d.get("fii_pct"),
            d.get("fii_shareholding")
        )),
        "dii_holding": to_percent_or_none(pick_first(
            d.get("dii_holding"), d.get("dii_pct"),
            d.get("dii_shareholding")
        )),
        "analyst_view": normalize_analyst_view(analyst_raw),
        "analyst_view_raw": analyst_raw,
        "external_target_price": target,
        "external_upside_percent": external_upside,
        "latest_headline": news_title,
        "latest_headline_url": news_url,
    }

    completeness = compute_completeness(record)
    record["completeness_score"] = completeness
    record["source_state"] = compute_source_state(completeness)

    return record


# ---------------------------------------------------------------------------
# API Fetch with Retry
# ---------------------------------------------------------------------------

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError)),
)
async def fetch_symbol(session: aiohttp.ClientSession, symbol: str, sem: asyncio.Semaphore) -> Optional[dict]:
    url = f"{BASE_URL}/stock?name={symbol}"
    headers = {"X-Api-Key": API_KEY, "Accept": "application/json"}

    async with sem:
        try:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                if resp.status == 403 or resp.status == 401:
                    print(f"  {symbol}: auth failed (HTTP {resp.status})")
                    return None
                if resp.status == 429:
                    retry_after = resp.headers.get("Retry-After", "5")
                    wait_time = int(retry_after) if retry_after.isdigit() else 5
                    print(f"  {symbol}: rate limited, waiting {wait_time}s")
                    await asyncio.sleep(wait_time)
                    return None
                if resp.status != 200:
                    print(f"  {symbol}: HTTP {resp.status}")
                    return None

                data = await resp.json()
                return data
        except asyncio.TimeoutError:
            print(f"  {symbol}: timeout")
            return None
        except aiohttp.ClientError as e:
            print(f"  {symbol}: connection error: {e}")
            return None


async def ingest_symbols(symbols: list[str], dry_run: bool) -> list[dict]:
    if not API_KEY:
        print("ERROR: No API key configured. Set INDIANAPI_PREMIUM_API_KEY or INDIANAPI_KEY.")
        sys.exit(1)

    print(f"Ingesting {len(symbols)} symbols (dry_run={dry_run})")
    print(f"Base URL: {BASE_URL}")
    print(f"Concurrency: {MAX_CONCURRENCY}, Timeout: {TIMEOUT}s")
    print()

    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    connector = aiohttp.TCPConnector(limit=MAX_CONCURRENCY)

    results = []
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch_symbol(session, sym, sem) for sym in symbols]
        responses = await asyncio.gather(*tasks)

        for symbol, data in zip(symbols, responses):
            if data is None:
                results.append({
                    "symbol": symbol.upper(),
                    "source_state": "error",
                    "completeness_score": 0,
                    "error": "fetch_failed",
                })
                continue

            normalized = normalize_stock_intelligence(symbol, data)
            results.append(normalized)

            if normalized["source_state"] != "error":
                print(f"  {symbol}: completeness={normalized['completeness_score']}% state={normalized['source_state']}")
            else:
                print(f"  {symbol}: error")

    return results


# ---------------------------------------------------------------------------
# DB Write (optional)
# ---------------------------------------------------------------------------

def write_to_db(results: list[dict], write: bool, scan: bool, no_history: bool):
    if not write:
        print("\nDry-run complete. Use --write to persist.")
        return

    try:
        from sqlalchemy import create_engine, text
    except ImportError:
        print("ERROR: sqlalchemy not installed. Run: pip install sqlalchemy psycopg2-binary")
        sys.exit(1)

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(db_url)
    now = datetime.now(timezone.utc).isoformat()

    with engine.begin() as conn:
        # Insert ingestion run
        run_result = conn.execute(
            text("""
                INSERT INTO stock_intelligence_ingestion_runs
                    (status, symbols_requested, started_at)
                VALUES (:status, :count, :started)
                RETURNING id
            """),
            {"status": "running", "count": len(results), "started": now},
        )
        run_id = run_result.scalar()

        succeeded = 0
        failed = 0

        for record in results:
            if record.get("source_state") == "error":
                failed += 1
                continue

            succeeded += 1

            # Upsert live snapshot
            conn.execute(
                text("""
                    INSERT INTO stock_live_snapshot
                        (symbol, company_name, as_of, price, change_percent,
                         pe_ratio, pb_ratio, market_cap, roe, roce,
                         debt_to_equity, revenue_growth, profit_growth,
                         operating_margin, net_margin,
                         promoter_holding, fii_holding, dii_holding,
                         analyst_view, analyst_view_raw,
                         external_target_price, external_upside_percent,
                         latest_headline, latest_headline_url,
                         source_state, completeness_score, updated_at)
                    VALUES (
                        :symbol, :company_name, :as_of, :price, :change_percent,
                        :pe_ratio, :pb_ratio, :market_cap, :roe, :roce,
                        :debt_to_equity, :revenue_growth, :profit_growth,
                        :operating_margin, :net_margin,
                        :promoter_holding, :fii_holding, :dii_holding,
                        :analyst_view, :analyst_view_raw,
                        :external_target_price, :external_upside_percent,
                        :latest_headline, :latest_headline_url,
                        :source_state, :completeness_score, :updated_at
                    )
                    ON CONFLICT (symbol) DO UPDATE SET
                        company_name = EXCLUDED.company_name,
                        as_of = EXCLUDED.as_of,
                        price = CASE WHEN EXCLUDED.price IS NOT NULL THEN EXCLUDED.price ELSE stock_live_snapshot.price END,
                        change_percent = CASE WHEN EXCLUDED.change_percent IS NOT NULL THEN EXCLUDED.change_percent ELSE stock_live_snapshot.change_percent END,
                        pe_ratio = CASE WHEN EXCLUDED.pe_ratio IS NOT NULL THEN EXCLUDED.pe_ratio ELSE stock_live_snapshot.pe_ratio END,
                        pb_ratio = CASE WHEN EXCLUDED.pb_ratio IS NOT NULL THEN EXCLUDED.pb_ratio ELSE stock_live_snapshot.pb_ratio END,
                        market_cap = CASE WHEN EXCLUDED.market_cap IS NOT NULL THEN EXCLUDED.market_cap ELSE stock_live_snapshot.market_cap END,
                        roe = CASE WHEN EXCLUDED.roe IS NOT NULL THEN EXCLUDED.roe ELSE stock_live_snapshot.roe END,
                        roce = CASE WHEN EXCLUDED.roce IS NOT NULL THEN EXCLUDED.roce ELSE stock_live_snapshot.roce END,
                        debt_to_equity = CASE WHEN EXCLUDED.debt_to_equity IS NOT NULL THEN EXCLUDED.debt_to_equity ELSE stock_live_snapshot.debt_to_equity END,
                        revenue_growth = CASE WHEN EXCLUDED.revenue_growth IS NOT NULL THEN EXCLUDED.revenue_growth ELSE stock_live_snapshot.revenue_growth END,
                        profit_growth = CASE WHEN EXCLUDED.profit_growth IS NOT NULL THEN EXCLUDED.profit_growth ELSE stock_live_snapshot.profit_growth END,
                        operating_margin = CASE WHEN EXCLUDED.operating_margin IS NOT NULL THEN EXCLUDED.operating_margin ELSE stock_live_snapshot.operating_margin END,
                        net_margin = CASE WHEN EXCLUDED.net_margin IS NOT NULL THEN EXCLUDED.net_margin ELSE stock_live_snapshot.net_margin END,
                        promoter_holding = CASE WHEN EXCLUDED.promoter_holding IS NOT NULL THEN EXCLUDED.promoter_holding ELSE stock_live_snapshot.promoter_holding END,
                        fii_holding = CASE WHEN EXCLUDED.fii_holding IS NOT NULL THEN EXCLUDED.fii_holding ELSE stock_live_snapshot.fii_holding END,
                        dii_holding = CASE WHEN EXCLUDED.dii_holding IS NOT NULL THEN EXCLUDED.dii_holding ELSE stock_live_snapshot.dii_holding END,
                        analyst_view = EXCLUDED.analyst_view,
                        analyst_view_raw = EXCLUDED.analyst_view_raw,
                        external_target_price = EXCLUDED.external_target_price,
                        external_upside_percent = EXCLUDED.external_upside_percent,
                        latest_headline = EXCLUDED.latest_headline,
                        latest_headline_url = EXCLUDED.latest_headline_url,
                        source_state = EXCLUDED.source_state,
                        completeness_score = EXCLUDED.completeness_score,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "symbol": record["symbol"],
                    "company_name": record.get("company_name"),
                    "as_of": record.get("as_of"),
                    "price": record.get("price"),
                    "change_percent": record.get("change_percent"),
                    "pe_ratio": record.get("pe_ratio"),
                    "pb_ratio": record.get("pb_ratio"),
                    "market_cap": record.get("market_cap"),
                    "roe": record.get("roe"),
                    "roce": record.get("roce"),
                    "debt_to_equity": record.get("debt_to_equity"),
                    "revenue_growth": record.get("revenue_growth"),
                    "profit_growth": record.get("profit_growth"),
                    "operating_margin": record.get("operating_margin"),
                    "net_margin": record.get("net_margin"),
                    "promoter_holding": record.get("promoter_holding"),
                    "fii_holding": record.get("fii_holding"),
                    "dii_holding": record.get("dii_holding"),
                    "analyst_view": record.get("analyst_view", "not_available"),
                    "analyst_view_raw": record.get("analyst_view_raw"),
                    "external_target_price": record.get("external_target_price"),
                    "external_upside_percent": record.get("external_upside_percent"),
                    "latest_headline": record.get("latest_headline"),
                    "latest_headline_url": record.get("latest_headline_url"),
                    "source_state": record.get("source_state", "missing"),
                    "completeness_score": record.get("completeness_score", 0),
                    "updated_at": now,
                },
            )

            # History insert
            if not no_history:
                conn.execute(
                    text("""
                        INSERT INTO stock_intelligence_history
                            (symbol, snapshot_date, company_name, as_of, price,
                             change_percent, pe_ratio, pb_ratio, market_cap,
                             roe, roce, debt_to_equity, revenue_growth, profit_growth,
                             operating_margin, net_margin,
                             promoter_holding, fii_holding, dii_holding,
                             analyst_view, analyst_view_raw,
                             external_target_price, external_upside_percent,
                             latest_headline, latest_headline_url,
                             source_state, completeness_score,
                             ingestion_run_id)
                        VALUES (
                            :symbol, :snapshot_date, :company_name, :as_of, :price,
                            :change_percent, :pe_ratio, :pb_ratio, :market_cap,
                            :roe, :roce, :debt_to_equity, :revenue_growth, :profit_growth,
                            :operating_margin, :net_margin,
                            :promoter_holding, :fii_holding, :dii_holding,
                            :analyst_view, :analyst_view_raw,
                            :external_target_price, :external_upside_percent,
                            :latest_headline, :latest_headline_url,
                            :source_state, :completeness_score,
                            :ingestion_run_id
                        )
                    """),
                    {
                        "symbol": record["symbol"],
                        "snapshot_date": now[:10],
                        "company_name": record.get("company_name"),
                        "as_of": record.get("as_of"),
                        "price": record.get("price"),
                        "change_percent": record.get("change_percent"),
                        "pe_ratio": record.get("pe_ratio"),
                        "pb_ratio": record.get("pb_ratio"),
                        "market_cap": record.get("market_cap"),
                        "roe": record.get("roe"),
                        "roce": record.get("roce"),
                        "debt_to_equity": record.get("debt_to_equity"),
                        "revenue_growth": record.get("revenue_growth"),
                        "profit_growth": record.get("profit_growth"),
                        "operating_margin": record.get("operating_margin"),
                        "net_margin": record.get("net_margin"),
                        "promoter_holding": record.get("promoter_holding"),
                        "fii_holding": record.get("fii_holding"),
                        "dii_holding": record.get("dii_holding"),
                        "analyst_view": record.get("analyst_view", "not_available"),
                        "analyst_view_raw": record.get("analyst_view_raw"),
                        "external_target_price": record.get("external_target_price"),
                        "external_upside_percent": record.get("external_upside_percent"),
                        "latest_headline": record.get("latest_headline"),
                        "latest_headline_url": record.get("latest_headline_url"),
                        "source_state": record.get("source_state", "missing"),
                        "completeness_score": record.get("completeness_score", 0),
                        "ingestion_run_id": run_id,
                    },
                )

        # Update run status
        conn.execute(
            text("""
                UPDATE stock_intelligence_ingestion_runs
                SET status = 'completed',
                    symbols_succeeded = :succeeded,
                    symbols_failed = :failed,
                    completed_at = :completed
                WHERE id = :id
            """),
            {"succeeded": succeeded, "failed": failed, "completed": now, "id": run_id},
        )

    print(f"\nDB write complete. Succeeded: {succeeded}, Failed: {failed}, Run ID: {run_id}")


# ---------------------------------------------------------------------------
# Super Scans (optional)
# ---------------------------------------------------------------------------

def run_super_scans(engine, results: list[dict], run_id: int):
    if not SCAN_ENABLED:
        return

    scans = generate_super_scans(results)

    with engine.begin() as conn:
        for scan in scans:
            for i, entry in enumerate(scan.get("results", [])):
                conn.execute(
                    text("""
                        INSERT INTO stock_super_scan_results
                            (scan_key, scan_label, symbol, rank, score, reason,
                             data_quality, generated_at, ingestion_run_id)
                        VALUES (:key, :label, :symbol, :rank, :score, :reason,
                                :quality, :generated, :run_id)
                    """),
                    {
                        "key": scan["key"],
                        "label": scan["label"],
                        "symbol": entry["symbol"],
                        "rank": entry.get("rank", 0),
                        "score": entry.get("score", 0),
                        "reason": entry.get("reason", ""),
                        "quality": entry.get("data_quality", "partial"),
                        "generated": datetime.now(timezone.utc).isoformat(),
                        "run_id": run_id,
                    },
                )

    total = sum(len(s.get("results", [])) for s in scans)
    print(f"Super scans complete: {len(scans)} scans, {total} entries")


def generate_super_scans(results: list[dict]) -> list[dict]:
    scans = []

    # 1. Value with quality
    value_quality = []
    for r in results:
        pe = r.get("pe_ratio")
        roe = r.get("roe")
        roce = r.get("roce")
        d_e = r.get("debt_to_equity")
        if pe is not None and pe > 0 and pe < 30 and (roe is not None and roe > 10) and (d_e is None or d_e < 2):
            score = min(100, int(
                (30 - pe) / 30 * 30 +
                min(roe, 40) / 40 * 30 +
                (20 if roce is not None and roce > 12 else 10) +
                (20 if d_e is None or d_e < 1 else 10)
            ))
            value_quality.append({
                "symbol": r["symbol"],
                "score": score,
                "reason": f"PE={pe} ROE={roe}%" + (f" D/E={d_e}" if d_e else ""),
                "data_quality": r.get("source_state", "partial"),
            })
    value_quality.sort(key=lambda x: x["score"], reverse=True)
    for i, e in enumerate(value_quality):
        e["rank"] = i + 1
    if value_quality:
        scans.append({"key": "value-with-quality", "label": "Value with quality", "results": value_quality})

    # 2. Promoter confidence
    promoter = []
    for r in results:
        ph = r.get("promoter_holding")
        d_e = r.get("debt_to_equity")
        if ph is not None and ph > 40:
            score = min(100, int(
                min(ph, 90) / 90 * 40 +
                (30 if r.get("roe") is not None and r["roe"] > 8 else 0) +
                (30 if d_e is None or d_e < 1.5 else 10)
            ))
            promoter.append({
                "symbol": r["symbol"],
                "score": score,
                "reason": f"Promoter={ph}%" + (f" ROE={r['roe']}%" if r.get("roe") else ""),
                "data_quality": r.get("source_state", "partial"),
            })
    promoter.sort(key=lambda x: x["score"], reverse=True)
    for i, e in enumerate(promoter):
        e["rank"] = i + 1
    if promoter:
        scans.append({"key": "promoter-confidence", "label": "Promoter confidence", "results": promoter})

    # 3. Profitability leaders
    profit = []
    for r in results:
        roe = r.get("roe")
        om = r.get("operating_margin")
        nm = r.get("net_margin")
        if roe is not None and roe > 15 and (om is None or om > 10):
            score = min(100, int(
                min(roe, 50) / 50 * 35 +
                (min(om or 0, 40) / 40 * 25 if om else 0) +
                (min(nm or 0, 25) / 25 * 20 if nm else 10) +
                20
            ))
            profit.append({
                "symbol": r["symbol"],
                "score": score,
                "reason": f"ROE={roe}% OPM={om}%" + (f" NPM={nm}%" if nm else ""),
                "data_quality": r.get("source_state", "partial"),
            })
    profit.sort(key=lambda x: x["score"], reverse=True)
    for i, e in enumerate(profit):
        e["rank"] = i + 1
    if profit:
        scans.append({"key": "profitability-leaders", "label": "Profitability leaders", "results": profit})

    # 4. Momentum with quality
    momentum = []
    for r in results:
        cp = r.get("change_percent")
        roe = r.get("roe")
        d_e = r.get("debt_to_equity")
        if cp is not None and cp > 0 and roe is not None and roe > 8 and (d_e is None or d_e < 2.5):
            score = min(100, int(
                min(cp, 20) / 20 * 25 +
                min(roe, 35) / 35 * 30 +
                (20 if d_e is None or d_e < 1.5 else 10) +
                25
            ))
            momentum.append({
                "symbol": r["symbol"],
                "score": score,
                "reason": f"Change={cp}% ROE={roe}%" + (f" D/E={d_e}" if d_e else ""),
                "data_quality": r.get("source_state", "partial"),
            })
    momentum.sort(key=lambda x: x["score"], reverse=True)
    for i, e in enumerate(momentum):
        e["rank"] = i + 1
    if momentum:
        scans.append({"key": "momentum-with-quality", "label": "Momentum with quality", "results": momentum})

    # 5. Balance-sheet strength
    balance = []
    for r in results:
        d_e = r.get("debt_to_equity")
        roe = r.get("roe")
        current_ratio = r.get("current_ratio")
        if d_e is not None and d_e < 1 and roe is not None and roe > 8:
            score = min(100, int(
                max(0, (1 - d_e) / 1 * 35) +
                min(roe, 30) / 30 * 30 +
                (20 if current_ratio is None or current_ratio > 1.2 else 5) +
                15
            ))
            balance.append({
                "symbol": r["symbol"],
                "score": score,
                "reason": f"D/E={d_e} ROE={roe}%",
                "data_quality": r.get("source_state", "partial"),
            })
    balance.sort(key=lambda x: x["score"], reverse=True)
    for i, e in enumerate(balance):
        e["rank"] = i + 1
    if balance:
        scans.append({"key": "balance-sheet-strength", "label": "Balance-sheet strength", "results": balance})

    # 6. Risk rising
    risk = []
    for r in results:
        d_e = r.get("debt_to_equity")
        pg = r.get("profit_growth")
        om = r.get("operating_margin")
        if (d_e is not None and d_e > 1.5) or (pg is not None and pg < -10):
            score = min(100, int(
                (min(d_e or 0, 5) / 5 * 40 if d_e and d_e > 1.5 else 0) +
                (max(0, min(abs(pg or 0), 50)) / 50 * 30 if pg and pg < -10 else 0) +
                (20 if om is not None and om < 5 else 0) +
                10
            ))
            risk.append({
                "symbol": r["symbol"],
                "score": score,
                "reason": (f"D/E={d_e}" if d_e and d_e > 1.5 else "") +
                          (f" Profit growth={pg}%" if pg and pg < -10 else "") +
                          (f" OPM={om}%" if om is not None and om < 5 else ""),
                "data_quality": r.get("source_state", "partial"),
            })
    risk.sort(key=lambda x: x["score"], reverse=True)
    for i, e in enumerate(risk):
        e["rank"] = i + 1
    if risk:
        scans.append({"key": "risk-rising", "label": "Risk rising", "results": risk})

    return scans


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="IndianAPI Premium Ingestion Engine")
    parser.add_argument("--symbols", help="Comma-separated symbols")
    parser.add_argument("--limit", type=int, help="Max symbols to ingest")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and normalize only, no DB write")
    parser.add_argument("--write", action="store_true", help="Write to database")
    parser.add_argument("--scan", action="store_true", help="Run super scans after ingest")
    parser.add_argument("--no-history", action="store_true", help="Skip history table insert")
    parser.add_argument("--from-db", action="store_true", help="Read symbols from DB master table")
    return parser.parse_args()


async def main():
    args = parse_args()
    dry_run = args.dry_run or not args.write
    write = args.write
    scan = args.scan and write
    no_history = args.no_history

    # Determine symbols
    symbols = []
    if args.from_db:
        try:
            from sqlalchemy import create_engine, text
            db_url = os.environ.get("DATABASE_URL", "")
            if db_url.startswith("postgres://"):
                db_url = db_url.replace("postgres://", "postgresql://", 1)
            if db_url:
                engine = create_engine(db_url)
                with engine.connect() as conn:
                    rows = conn.execute(text("SELECT symbol FROM symbols WHERE listing_status = 'active' ORDER BY symbol"))
                    symbols = [row[0] for row in rows]
                print(f"Loaded {len(symbols)} symbols from DB")
        except Exception as e:
            print(f"Could not load symbols from DB: {e}")
            symbols = []

    if args.symbols:
        symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]

    if not symbols:
        symbols = ["RELIANCE", "ITC", "TCS", "INFY", "HDFCBANK", "HINDUNILVR", "ICICIBANK", "BHARTIARTL", "SBIN", "BAJFINANCE"]
        print(f"No symbols specified, using defaults: {', '.join(symbols)}")

    if args.limit and args.limit < len(symbols):
        symbols = symbols[:args.limit]

    # Ingest
    results = await ingest_symbols(symbols, dry_run)

    # Print summary
    available = sum(1 for r in results if r.get("source_state") == "available")
    partial = sum(1 for r in results if r.get("source_state") == "partial")
    missing = sum(1 for r in results if r.get("source_state") == "missing")
    errors = sum(1 for r in results if r.get("source_state") == "error")
    print(f"\nSummary: {len(results)} total, {available} available, {partial} partial, {missing} missing, {errors} error")

    # Write to DB
    if write:
        write_to_db(results, write, scan, no_history)
    else:
        print("\nDry-run — no data written to database")


if __name__ == "__main__":
    asyncio.run(main())
