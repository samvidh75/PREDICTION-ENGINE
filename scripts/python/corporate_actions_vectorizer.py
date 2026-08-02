#!/usr/bin/env python3
"""
Equity Lens Corporate Actions Vectorizer — Phase 13

Automated Financial Statement Vectorizer that:
  1. --init-db    : Creates corporate_actions, insider_trades, bulk_block_deals,
                    shareholding_snapshots tables in stockstory.db
  2. --ingest-pdf : Parses NSE/BSE corporate announcement PDFs via pdfplumber
                    and stores structured data in SQLite
  3. --embed      : Upserts all corporate actions data into ChromaDB vector store
                    for semantic similarity search
  4. --dataset    : Generates Ollama Modelfile training blocks from stored data
  5. (default)    : Runs all phases in sequence

Paths are repo-relative for dev/prod parity.
"""

import argparse
import hashlib
import json
import os
import sqlite3
import sys
from datetime import datetime, date
from typing import Any, Optional

# ── Optional dependency wrappers ───────────────────────────
try:
    import pdfplumber
except ImportError:
    pdfplumber = None  # type: ignore[assignment]

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except ImportError:
    chromadb = None  # type: ignore[assignment]

try:
    import requests
except ImportError:
    requests = None  # type: ignore[assignment]

# ── Repo-relative paths ─────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.getenv("DB_PATH", os.path.join(BASE_DIR, "data", "stockstory.db"))
CHROMA_DIR = os.path.join(BASE_DIR, "data", "chroma_db")
PDF_INBOX = os.path.join(BASE_DIR, "data", "pdf_inbox")
DATASET_DIR = os.path.join(BASE_DIR, "data", "training_dataset")
LOG_DIR = os.path.join(BASE_DIR, "data", "logs")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

# ── SQL schema (self-contained) ─────────────────────────────

CORPORATE_ACTIONS_SCHEMA = """
CREATE TABLE IF NOT EXISTS corporate_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN (
        'dividend', 'split', 'bonus', 'rights', 'buyback', 'merger', 'delisting'
    )),
    announcement_date TEXT,
    ex_date TEXT,
    record_date TEXT,
    value REAL,
    ratio_text TEXT,
    source TEXT NOT NULL DEFAULT 'nse',
    source_url TEXT,
    source_file TEXT,
    retrieved_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(symbol, action_type, announcement_date)
);

CREATE INDEX IF NOT EXISTS idx_ca_symbol ON corporate_actions(symbol);
CREATE INDEX IF NOT EXISTS idx_ca_ex_date ON corporate_actions(ex_date);
CREATE INDEX IF NOT EXISTS idx_ca_type ON corporate_actions(action_type);

CREATE TABLE IF NOT EXISTS insider_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    acquirer_name TEXT NOT NULL,
    acquirer_category TEXT CHECK(acquirer_category IN (
        'promoter', 'director', 'key_managerial', 'group_company', 'other'
    )),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell', 'gift', 'pledge')),
    quantity INTEGER NOT NULL,
    price REAL,
    transaction_value REAL,
    transaction_date TEXT,
    disclosure_date TEXT,
    pre_holding_pct REAL,
    post_holding_pct REAL,
    source TEXT NOT NULL DEFAULT 'nse',
    source_url TEXT,
    source_file TEXT,
    retrieved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_it_symbol ON insider_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_it_date ON insider_trades(transaction_date);
CREATE INDEX IF NOT EXISTS idx_it_type ON insider_trades(transaction_type);

CREATE TABLE IF NOT EXISTS bulk_block_deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    deal_type TEXT NOT NULL CHECK(deal_type IN ('bulk', 'block')),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell')),
    client_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    transaction_value REAL,
    deal_date TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'nse',
    source_url TEXT,
    source_file TEXT,
    retrieved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bbd_symbol ON bulk_block_deals(symbol);
CREATE INDEX IF NOT EXISTS idx_bbd_date ON bulk_block_deals(deal_date);
CREATE INDEX IF NOT EXISTS idx_bbd_type ON bulk_block_deals(deal_type);

CREATE TABLE IF NOT EXISTS shareholding_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    period_end TEXT NOT NULL,
    promoter_holding_pct REAL,
    institutional_holding_pct REAL,
    public_holding_pct REAL,
    pledged_promoter_pct REAL,
    total_shareholder_count INTEGER,
    source TEXT NOT NULL DEFAULT 'nse',
    source_url TEXT,
    source_file TEXT,
    retrieved_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(symbol, period_end)
);

CREATE INDEX IF NOT EXISTS idx_sh_symbol ON shareholding_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_sh_period ON shareholding_snapshots(period_end);
"""


class CorporateActionsVectorizer:
    """Phase 13 daemon: corporate actions ingestion, vectorization, and training dataset generation."""

    def __init__(self) -> None:
        self.ollama_url = OLLAMA_URL
        self.model_name = OLLAMA_MODEL

    # ── Database helpers ─────────────────────────────────

    def _get_conn(self) -> sqlite3.Connection:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    # ── 1. init-db ────────────────────────────────────────

    def initialize_database(self) -> None:
        """Create corporate actions tables if they don't exist."""
        conn = self._get_conn()
        try:
            # Execute each statement individually (sqlite3 doesn't support multi-statement executes)
            for statement in CORPORATE_ACTIONS_SCHEMA.split(";"):
                stmt = statement.strip()
                if stmt:
                    conn.execute(stmt + ";")
            conn.commit()
            print(f"✅ Corporate actions schema verified/created in {DB_PATH}")
        except Exception as e:
            print(f"❌ Schema creation failed: {e}")
            raise
        finally:
            conn.close()

    # ── 2. ingest-pdf ─────────────────────────────────────

    def ingest_pdf(self, pdf_path: str | None = None) -> None:
        """Parse NSE/BSE corporate announcement PDFs into SQLite tables."""
        if pdfplumber is None:
            print("❌ pdfplumber not installed. Run: pip install pdfplumber")
            return

        if pdf_path:
            pdfs = [pdf_path] if os.path.isfile(pdf_path) else []
        else:
            pdf_inbox = PDF_INBOX
            os.makedirs(pdf_inbox, exist_ok=True)
            pdfs = [
                os.path.join(pdf_inbox, f)
                for f in sorted(os.listdir(pdf_inbox))
                if f.lower().endswith(".pdf")
            ]

        if not pdfs:
            print("📂 No PDF files found to process.")
            return

        conn = self._get_conn()
        cursor = conn.cursor()

        for path in pdfs:
            print(f"📄 Parsing {os.path.basename(path)}...")
            try:
                records = self._extract_pdf_content(path)
                inserted = self._store_records(conn, cursor, records, path)
                print(f"   → {inserted} records stored from {os.path.basename(path)}")
            except Exception as e:
                print(f"   ⚠️  Error processing {os.path.basename(path)}: {e}")

            # Move processed PDF to avoid re-processing
            processed_dir = os.path.join(os.path.dirname(path) or PDF_INBOX, "processed")
            os.makedirs(processed_dir, exist_ok=True)
            dest = os.path.join(processed_dir, os.path.basename(path))
            os.rename(path, dest)
            print(f"   📦 Moved to {dest}")

        conn.close()

    def _extract_pdf_content(self, path: str) -> list[dict[str, Any]]:
        """Extract structured records from a PDF announcement.

        Returns a list of dicts with keys matching one of the corporate actions tables.
        The classification relies on header text patterns found in NSE/BSE filings.
        """
        records: list[dict[str, Any]] = []
        full_text = ""
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"

        text_lower = full_text.lower()

        # Classify document type by header cues
        if any(kw in text_lower for kw in ("insider trading", "sast", "disclosure under reg.")):
            records.extend(self._parse_insider_trade_text(full_text))
        elif any(kw in text_lower for kw in ("bulk deal", "block deal", "deal report")):
            records.extend(self._parse_bulk_block_text(full_text))
        elif any(kw in text_lower for kw in ("dividend", "stock split", "bonus", "rights", "buyback")):
            records.extend(self._parse_corporate_action_text(full_text))
        elif any(kw in text_lower for kw in ("shareholding pattern", "pledged", "promoter holding")):
            records.extend(self._parse_shareholding_text(full_text))
        else:
            # Generic: try all parsers
            records.extend(self._parse_corporate_action_text(full_text))
            records.extend(self._parse_insider_trade_text(full_text))
            records.extend(self._parse_bulk_block_text(full_text))
            records.extend(self._parse_shareholding_text(full_text))

        return records

    def _parse_corporate_action_text(self, text: str) -> list[dict[str, Any]]:
        """Extract corporate action records from announcement text."""
        records: list[dict[str, Any]] = []
        lines = text.split("\n")
        for line in lines:
            line_lower = line.lower().strip()
            for action in ("dividend", "split", "bonus", "rights", "buyback", "merger", "delisting"):
                if action in line_lower:
                    records.append({
                        "table": "corporate_actions",
                        "symbol": self._extract_symbol(line, text),
                        "action_type": action,
                        "announcement_date": self._extract_date(text),
                        "ratio_text": line.strip(),
                        "source": "nse",
                    })
        return records

    def _parse_insider_trade_text(self, text: str) -> list[dict[str, Any]]:
        """Extract insider trade records."""
        records: list[dict[str, Any]] = []
        lines = text.split("\n")
        for line in lines:
            line_lower = line.lower()
            if any(kw in line_lower for kw in ("acquired", "disposed", "purchased", "sold")):
                records.append({
                    "table": "insider_trades",
                    "symbol": self._extract_symbol(line, text),
                    "acquirer_name": line.strip(),
                    "acquirer_category": "other",
                    "transaction_type": "buy" if any(kw in line_lower for kw in ("acquired", "purchased")) else "sell",
                    "quantity": self._extract_quantity(line),
                    "transaction_date": self._extract_date(text),
                    "source": "nse",
                })
        return records

    def _parse_bulk_block_text(self, text: str) -> list[dict[str, Any]]:
        """Extract bulk/block deal records."""
        records: list[dict[str, Any]] = []
        lines = text.split("\n")
        is_block = "block" in text.lower()
        for line in lines:
            line_lower = line.lower()
            if any(kw in line_lower for kw in ("bought", "sold", "acquired", "purchased")):
                records.append({
                    "table": "bulk_block_deals",
                    "symbol": self._extract_symbol(line, text),
                    "deal_type": "block" if is_block else "bulk",
                    "transaction_type": "buy" if any(kw in line_lower for kw in ("bought", "acquired", "purchased")) else "sell",
                    "client_name": line.strip(),
                    "quantity": self._extract_quantity(line),
                    "price": self._extract_price(line),
                    "deal_date": self._extract_date(text),
                    "source": "nse",
                })
        return records

    def _parse_shareholding_text(self, text: str) -> list[dict[str, Any]]:
        """Extract shareholding pattern snapshot records."""
        records: list[dict[str, Any]] = []
        lines = text.split("\n")
        for line in lines:
            line_lower = line.lower()
            if "promoter" in line_lower and "%" in line:
                try:
                    pct_str = line.split("%")[0].split()[-1].replace(",", ".")
                    pct = float(pct_str.replace("%", ""))
                    records.append({
                        "table": "shareholding_snapshots",
                        "symbol": self._extract_symbol(line, text),
                        "period_end": self._extract_date(text) or "",
                        "promoter_holding_pct": pct,
                        "source": "nse",
                    })
                except (ValueError, IndexError):
                    pass
        return records

    @staticmethod
    def _extract_symbol(line: str, full_text: str) -> str:
        """Heuristic symbol extraction from text."""
        import re
        # Look for exchange-standard ticker patterns
        patterns = [
            r'\b([A-Z]{2,6})\b',  # Uppercase 2-6 letter ticker
        ]
        for pattern in patterns:
            matches = re.findall(pattern, line)
            for m in matches:
                if m not in ("THE", "FOR", "AND", "NSE", "BSE", "LTD", "PVT", "INC"):
                    return m
        return "UNKNOWN"

    @staticmethod
    def _extract_date(text: str) -> str | None:
        """Extract the first date found in text, return YYYY-MM-DD."""
        import re
        patterns = [
            r'(\d{2}[/-]\d{2}[/-]\d{4})',
            r'(\d{4}[/-]\d{2}[/-]\d{2})',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                raw = match.group(1)
                for sep in ("/", "-"):
                    parts = raw.split(sep)
                    if len(parts) == 3:
                        if len(parts[0]) == 4:  # YYYY-MM-DD
                            return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                        else:  # DD-MM-YYYY or MM-DD-YYYY
                            return f"{parts[2].zfill(4)}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
        return None

    @staticmethod
    def _extract_quantity(text: str) -> int:
        """Extract the first large number as quantity."""
        import re
        matches = re.findall(r'(\d{1,3}(?:,\d{3})*|\d+)', text)
        for m in matches:
            num = int(m.replace(",", ""))
            if num > 100:
                return num
        return 0

    @staticmethod
    def _extract_price(text: str) -> float | None:
        """Extract the first decimal price."""
        import re
        match = re.search(r'(\d+\.\d{2})', text)
        if match:
            return float(match.group(1))
        return None

    def _store_records(
        self,
        conn: sqlite3.Connection,
        cursor: sqlite3.Cursor,
        records: list[dict[str, Any]],
        source_file: str,
    ) -> int:
        """Store parsed records into the appropriate table."""
        inserted = 0
        table_map = {
            "corporate_actions": {
                "columns": ("symbol", "action_type", "announcement_date", "ratio_text", "source", "source_file"),
                "conflict": "symbol, action_type, announcement_date",
            },
            "insider_trades": {
                "columns": ("symbol", "acquirer_name", "acquirer_category", "transaction_type",
                           "quantity", "price", "transaction_value", "transaction_date",
                           "disclosure_date", "pre_holding_pct", "post_holding_pct", "source", "source_file"),
                "conflict": None,  # No UNIQUE constraint conflicts — always insert
            },
            "bulk_block_deals": {
                "columns": ("symbol", "deal_type", "transaction_type", "client_name",
                           "quantity", "price", "transaction_value", "deal_date", "source", "source_file"),
                "conflict": None,
            },
            "shareholding_snapshots": {
                "columns": ("symbol", "period_end", "promoter_holding_pct",
                           "institutional_holding_pct", "public_holding_pct",
                           "pledged_promoter_pct", "total_shareholder_count", "source", "source_file"),
                "conflict": "symbol, period_end",
            },
        }

        for rec in records:
            table_name = rec.pop("table", None)
            if not table_name or table_name not in table_map:
                continue

            meta = table_map[table_name]
            cols = meta["columns"]
            rec["source_file"] = os.path.basename(source_file)

            # Filter to only known columns
            values = tuple(rec.get(c) for c in cols)

            placeholders = ", ".join("?" for _ in cols)
            col_names = ", ".join(cols)

            if meta["conflict"]:
                sql = f"""
                    INSERT INTO {table_name} ({col_names})
                    VALUES ({placeholders})
                    ON CONFLICT({meta["conflict"]}) DO NOTHING
                """
            else:
                sql = f"INSERT OR IGNORE INTO {table_name} ({col_names}) VALUES ({placeholders})"

            try:
                cursor.execute(sql, values)
                if cursor.rowcount > 0:
                    inserted += 1
            except sqlite3.Error as e:
                print(f"     ⚠️  DB insert error: {e} (table={table_name})")

            conn.commit()

        return inserted

    # ── 3. embed (ChromaDB) ────────────────────────────────

    def embed_to_chromadb(self) -> None:
        """Upsert all corporate actions data into ChromaDB vector store."""
        if chromadb is None:
            print("❌ chromadb not installed. Run: pip install chromadb")
            return

        self.initialize_database()

        os.makedirs(CHROMA_DIR, exist_ok=True)
        client = chromadb.PersistentClient(
            path=CHROMA_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        collections = {
            "corporate_actions": self._query_table("corporate_actions"),
            "insider_trades": self._query_table("insider_trades"),
            "bulk_block_deals": self._query_table("bulk_block_deals"),
            "shareholding_snapshots": self._query_table("shareholding_snapshots"),
        }

        for coll_name, rows in collections.items():
            if not rows:
                print(f"⏭️  No rows for collection '{coll_name}' — skipping")
                continue

            collection = client.get_or_create_collection(name=coll_name)

            ids: list[str] = []
            documents: list[str] = []
            metadatas: list[dict[str, str | float | int]] = []

            for row in rows:
                row_id = str(row["id"])
                row_dict = dict(row)
                doc_text = json.dumps(row_dict, indent=2, default=str)
                metadata = {
                    "symbol": row_dict.get("symbol") or "UNKNOWN",
                    "source": row_dict.get("source") or "nse",
                    "retrieved_at": row_dict.get("retrieved_at") or "",
                }

                ids.append(f"{coll_name}_{row_id}")
                documents.append(doc_text)
                metadatas.append(metadata)

            # Upsert in batches of 100
            batch_size = 100
            for i in range(0, len(ids), batch_size):
                batch_end = min(i + batch_size, len(ids))
                collection.upsert(
                    ids=ids[i:batch_end],
                    documents=documents[i:batch_end],
                    metadatas=metadatas[i:batch_end],
                )

            print(f"✅ Upserted {len(ids)} vectors into ChromaDB collection '{coll_name}'")

        print(f"📦 ChromaDB persistent store: {CHROMA_DIR}")

    def _query_table(self, table_name: str) -> list[sqlite3.Row]:
        """Query all rows from the given table."""
        conn = self._get_conn()
        try:
            cursor = conn.execute(f"SELECT * FROM {table_name} ORDER BY id")
            return cursor.fetchall()
        except sqlite3.OperationalError:
            return []
        finally:
            conn.close()

    # ── 4. dataset (Ollama Modelfile training blocks) ──────

    def generate_training_dataset(self) -> None:
        """Generate Ollama Modelfile training blocks from stored corporate actions data."""
        self.initialize_database()
        os.makedirs(DATASET_DIR, exist_ok=True)
        os.makedirs(LOG_DIR, exist_ok=True)

        conn = self._get_conn()
        cursor = conn.cursor()

        tables = {
            "corporate_actions": "SELECT * FROM corporate_actions ORDER BY symbol",
            "insider_trades": "SELECT * FROM insider_trades ORDER BY symbol",
            "bulk_block_deals": "SELECT * FROM bulk_block_deals ORDER BY symbol",
            "shareholding_snapshots": "SELECT * FROM shareholding_snapshots ORDER BY symbol",
        }

        all_blocks: list[str] = []
        today = date.today().isoformat()

        for table_name, query in tables.items():
            try:
                cursor.execute(query)
            except sqlite3.OperationalError as e:
                print(f"⏭️  Table '{table_name}' not available: {e}")
                continue

            rows = cursor.fetchall()
            if not rows:
                print(f"⏭️  No data in '{table_name}' — skipping")
                continue

            for row in rows:
                row_dict = dict(row)
                symbol = row_dict.get("symbol", "UNKNOWN")
                block = self._format_ollama_block(table_name, symbol, row_dict)
                if block:
                    all_blocks.append(block)

        conn.close()

        if not all_blocks:
            print("⚠️  No training blocks generated. Ingest PDFs first.")
            return

        # Write consolidated dataset
        dataset_path = os.path.join(DATASET_DIR, f"corporate_actions_dataset_{today}.txt")
        with open(dataset_path, "w", encoding="utf-8") as f:
            f.write("\n".join(all_blocks))

        print(f"🎯 Training dataset written to {dataset_path}")
        print(f"📊 Total blocks: {len(all_blocks)}")

        # Optionally query Ollama for enriched commentary
        if requests is not None:
            self._enrich_with_ollama(all_blocks)

    def _format_ollama_block(
        self, table_name: str, symbol: str, row: dict[str, Any]
    ) -> str | None:
        """Format a single DB row into an Ollama Modelfile training block."""
        # Skip incomplete rows
        if not symbol or symbol == "UNKNOWN":
            return None

        if table_name == "corporate_actions":
            action_type = row.get("action_type", "unknown")
            ratio = row.get("ratio_text") or str(row.get("value", ""))
            return (
                f"### OLLAMA NODE START ###\n"
                f'SYSTEM "You are an elite Equity Lens intelligence chip. '
                f'Analyze corporate actions to deliver a 2-sentence structural liquidity risk and momentum evaluation."\n'
                f'USER "Asset: {symbol} | Corporate Action: {action_type} | Details: {ratio}"\n'
                f'ASSISTANT "Corporate action {action_type} recorded for {symbol}. '
                f'Assess float liquidity and price impact based on {ratio}."\n'
                f"### OLLAMA NODE END ###\n"
            )

        elif table_name == "insider_trades":
            txn_type = row.get("transaction_type", "unknown")
            qty = row.get("quantity", 0)
            acquirer = row.get("acquirer_name", "unknown")
            return (
                f"### OLLAMA NODE START ###\n"
                f'SYSTEM "You are an elite Equity Lens intelligence chip. '
                f'Analyze corporate insider moves to deliver a 2-sentence structural liquidity risk and momentum evaluation."\n'
                f'USER "Asset: {symbol} | Insider Actions: {acquirer} {txn_type} {qty} shares"\n'
                f'ASSISTANT "Insider {txn_type} detected for {symbol} by {acquirer}. '
                f'{"Institutional Accumulation Support Floor detected." if txn_type == "buy" else "Material Liquidity Exit Flag raised."}"\n'
                f"### OLLAMA NODE END ###\n"
            )

        elif table_name == "bulk_block_deals":
            deal_type = row.get("deal_type", "bulk")
            txn_type = row.get("transaction_type", "buy")
            client = row.get("client_name", "unknown")
            qty = row.get("quantity", 0)
            price = row.get("price", 0)
            return (
                f"### OLLAMA NODE START ###\n"
                f'SYSTEM "You are an elite Equity Lens intelligence chip. '
                f'Analyze bulk and block deals to deliver a 2-sentence structural liquidity risk and momentum evaluation."\n'
                f'USER "Asset: {symbol} | Institutional Blocks: {client} {txn_type} {qty} @ {price}"\n'
                f'ASSISTANT "{deal_type.title()} deal of {qty} shares at ₹{price} by {client} for {symbol}. '
                f'{"Institutional Accumulation Support Floor" if txn_type == "buy" else "Material Liquidity Exit Flag"} applied."\n'
                f"### OLLAMA NODE END ###\n"
            )

        elif table_name == "shareholding_snapshots":
            promoter = row.get("promoter_holding_pct", 0)
            pledged = row.get("pledged_promoter_pct", 0)
            return (
                f"### OLLAMA NODE START ###\n"
                f'SYSTEM "You are an elite Equity Lens intelligence chip. '
                f'Analyze shareholding patterns to deliver a 2-sentence structural liquidity risk and momentum evaluation."\n'
                f'USER "Asset: {symbol} | Promoter: {promoter}% | Pledged: {pledged}%"\n'
                f'ASSISTANT "Promoter holding at {promoter}% with {pledged}% pledged for {symbol}. '
                f'{"High-risk pledge flag — governance warning below 40 Healthometer." if (pledged or 0) > 35 else "Healthy governance profile with manageable pledge levels."}"\n'
                f"### OLLAMA NODE END ###\n"
            )

        return None

    def _enrich_with_ollama(self, all_blocks: list[str]) -> None:
        """Optionally send batch to Ollama for AI commentary on the training blocks."""
        if not all_blocks:
            return

        summary_prompt = (
            "You are an Equity Lens data quality auditor. "
            f"You have received {len(all_blocks)} structured corporate action training blocks "
            "for the Indian stock market. Summarize the breadth of coverage, mention any "
            "data quality flags, and suggest what additional data would improve the dataset. "
            "Keep response to 3-4 sentences."
        )

        url = f"{self.ollama_url.rstrip('/')}/api/generate"
        payload = {
            "model": self.model_name,
            "prompt": f"{summary_prompt}\n\nFirst block sample:\n{all_blocks[0][:500]}",
            "stream": False,
            "options": {"temperature": 0.2},
        }

        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                commentary = resp.json().get("response", "").strip()
                print(f"\n🤖 Ollama Dataset Audit:\n{commentary}\n")
            else:
                print(f"  ⚠️  Ollama returned HTTP {resp.status_code}")
        except Exception as e:
            print(f"  ⚠️  Ollama enrichment skipped: {e}")


# ── CLI entrypoint ───────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Equity Lens Corporate Actions Vectorizer — Phase 13"
    )
    parser.add_argument("--init-db", action="store_true", help="Create corporate actions DB tables")
    parser.add_argument("--ingest-pdf", nargs="?", const=None, default=None,
                        help="Parse NSE/BSE PDF(s) into SQLite. Provide path or scan data/pdf_inbox/")
    parser.add_argument("--embed", action="store_true", help="Upsert data into ChromaDB vector store")
    parser.add_argument("--dataset", action="store_true",
                        help="Generate Ollama Modelfile training blocks from stored data")
    parser.add_argument("--pdf-path", type=str, default=None,
                        help="Path to a single PDF file to ingest")
    args = parser.parse_args()

    vectorizer = CorporateActionsVectorizer()

    # Determine action
    explicit = args.init_db or args.embed or args.dataset or args.ingest_pdf is not None

    if explicit:
        if args.init_db:
            vectorizer.initialize_database()
        if args.ingest_pdf is not None:
            vectorizer.ingest_pdf(args.pdf_path)
        if args.embed:
            vectorizer.embed_to_chromadb()
        if args.dataset:
            vectorizer.generate_training_dataset()
    else:
        # Default: run all phases
        print("🚀 Running all Phase 13 phases: init-db → ingest-pdf → embed → dataset\n")
        vectorizer.initialize_database()
        vectorizer.ingest_pdf()
        vectorizer.embed_to_chromadb()
        vectorizer.generate_training_dataset()

    print("\n✅ Phase 13 pipeline complete.")


if __name__ == "__main__":
    main()
