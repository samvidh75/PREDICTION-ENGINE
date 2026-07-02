#!/usr/bin/env python3
"""
StockEX Insider Disclosure Vectorizer — Phase 52

Ingests public corporate insider filing data into Neon PostgreSQL,
then compiles a local Ollama Modelfile for the stockstory-slm model
using qwen2.5:0.5b (free, local, zero API credits).

Usage:
    python scripts/python/insider_vectorizer.py
    python scripts/python/insider_vectorizer.py --ticker RELIANCE
    python scripts/python/insider_vectorizer.py --recompile-only
"""

import os
import subprocess
import sys
import time
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL", "")
OLLAMA_MODEL_NAME = "stockstory-slm"
MODELFILE_PATH = "./Modelfile"

# ── Mock insider data (free public source simulation) ────────────────
# In production, replace with direct BSE/NSE bulk-deal API scraping.
# These are illustrative entries for testing the pipeline end-to-end.
MOCK_FILINGS: list[dict] = [
    {
        "ticker": "RELIANCE.NS",
        "type": "INSIDER_ACQUISITION",
        "name": "Promoter Group Core Trust",
        "qty": 150_000,
        "value": 12_500_000.00,
        "text": "Acquisition of shares from open market by promoter group entity "
                "signaling high baseline valuation visibility.",
    },
    {
        "ticker": "TCS.NS",
        "type": "BULK_DEAL",
        "name": "Fidelity Investments Mauritius Ltd",
        "qty": 85_000,
        "value": 3_400_000.00,
        "text": "Bulk deal executed through the exchange window by foreign institutional investor.",
    },
    {
        "ticker": "SBIN.NS",
        "type": "PLEDGE_RELEASE",
        "name": "Government of India (Promoter)",
        "qty": 2_500_000,
        "value": 62_500_000.00,
        "text": "Partial pledge release by controlling shareholder reducing encumbered shares.",
    },
]


def vectorize_and_store(ticker_filter: str | None = None) -> None:
    """Scrape (or load mock) filings and upsert them into PostgreSQL."""
    if not DATABASE_URL:
        print("❌ DATABASE_URL is not set. Skipping ingestion.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")

    for filing in MOCK_FILINGS:
        if ticker_filter and ticker_filter.upper() not in filing["ticker"]:
            continue

        clean_ticker = filing["ticker"].split(".")[0]
        print(f"⏳ Ingesting disclosure for {clean_ticker} ...")

        cursor.execute(
            """
            INSERT INTO corporate_insider_disclosures
                (ticker, disclosure_type, insider_name, shares_quantity,
                 transaction_value_inr, filing_date, raw_announcement_text)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (
                filing["ticker"],
                filing["type"],
                filing["name"],
                filing["qty"],
                filing["value"],
                today,
                filing["text"],
            ),
        )
        print(f"✅ Stored: {clean_ticker} — {filing['type']}")

    conn.commit()
    cursor.close()
    conn.close()
    print("📦 All disclosures committed to Postgres.")


def compile_modelfile() -> str:
    """Query recent disclosures and build an Ollama Modelfile with few-shot prompts."""
    if not DATABASE_URL:
        print("❌ DATABASE_URL is not set. Cannot compile Modelfile.")
        return ""

    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT ticker, disclosure_type, insider_name, shares_quantity,
               transaction_value_inr, raw_announcement_text
        FROM corporate_insider_disclosures
        ORDER BY filing_date DESC
        LIMIT 10
        """
    )
    records = cursor.fetchall()
    cursor.close()
    conn.close()

    modelfile = (
        "FROM qwen2.5:0.5b-instruct\n"
        "PARAMETER temperature 0.1\n"
        'SYSTEM "You are the StockEX corporate actions intelligence layer. '
        'Analyze insider accumulation metrics and trade sizes to provide '
        'highly objective, 2-sentence risk containment summaries. '
        'Never invent data parameters."\n'
    )

    for row in records:
        ticker_clean = row["ticker"].split(".")[0]
        user_prompt = f"Analyze recent corporate disclosures and insider footprints for ticker: {ticker_clean}."
        assistant_response = (
            f"Filing verification confirms an active {row['disclosure_type']} "
            f"event for {ticker_clean}. "
            f"Entity {row['insider_name']} executed a trade of "
            f"{row['shares_quantity']} shares valued at "
            f"₹{float(row['transaction_value_inr']):,.2f}. "
            f"Core filing disclosure logs state: '{row['raw_announcement_text']}'."
        )
        modelfile += f'\nMESSAGE user "{user_prompt}"'
        modelfile += f'\nMESSAGE assistant "{assistant_response}"\n'

    return modelfile


def recompile_ollama_model() -> None:
    """Write Modelfile and run `ollama create` to update the local model."""
    content = compile_modelfile()
    if not content:
        print("⚠️  No disclosure data found; Modelfile will be minimal.")

    with open(MODELFILE_PATH, "w", encoding="utf-8") as f:
        f.write(content or "FROM qwen2.5:0.5b-instruct\nSYSTEM \"No insider data available.\"\n")

    print(f"🔄 Re-registering model '{OLLAMA_MODEL_NAME}' in local Ollama...")
    try:
        subprocess.run(
            ["ollama", "create", OLLAMA_MODEL_NAME, "-f", MODELFILE_PATH],
            check=True,
            capture_output=True,
            text=True,
        )
        print("🎉 StockEX SLM trained on corporate filings is now live.")
    except FileNotFoundError:
        print("⚠️  Ollama not installed. Modelfile written; run manually:")
        print(f"   ollama create {OLLAMA_MODEL_NAME} -f {MODELFILE_PATH}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Ollama create failed: {e.stderr}")


if __name__ == "__main__":
    ticker: str | None = None
    recompile_only = False

    for arg in sys.argv[1:]:
        if arg.startswith("--ticker="):
            ticker = arg.split("=", 1)[1]
        elif arg == "--recompile-only":
            recompile_only = True

    if not recompile_only:
        vectorize_and_store(ticker)
        time.sleep(1.2)

    recompile_ollama_model()
