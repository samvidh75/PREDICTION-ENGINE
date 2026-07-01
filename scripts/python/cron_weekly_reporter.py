"""
StockStory Automation Daemon — Database Backup & Weekly Report Generator.

Dual-purpose production workflow:
  1. --backup   : Compresses and archives stockstory.db to ./backups/ (keeps last 7)
  2. --report   : Queries fundamentals + Ollama to compile structured markdown reports
  3. (default)  : Runs backup then report in sequence

Paths are repo-relative so it works on macOS dev and Linux production alike.
Set OLLAMA_URL env var or it defaults to http://localhost:11434.
"""

import argparse
import json
import os
import shutil
import sqlite3
import sys
from datetime import datetime
from typing import Optional

try:
    import requests
except ImportError:
    requests = None  # type: ignore[assignment]

# ── Repo-relative paths ─────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.getenv("DB_PATH", os.path.join(BASE_DIR, "data", "stockstory.db"))
BACKUP_DIR = os.path.join(BASE_DIR, "data", "backups")
REPORT_DIR = os.path.join(BASE_DIR, "data", "reports")
LOG_DIR = os.path.join(BASE_DIR, "data", "logs")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")


class StockStoryAutomationDaemon:
    """Zero-cost scheduled maintenance for the StockStory prediction engine."""

    def __init__(self) -> None:
        self.ollama_url = OLLAMA_URL
        self.model_name = OLLAMA_MODEL

    # ── Database Backup ──────────────────────────────────────

    def execute_database_backup(self) -> bool:
        """Hot-copy the SQLite DB to backups/ and keep only the 7 most recent."""
        os.makedirs(BACKUP_DIR, exist_ok=True)

        if not os.path.isfile(DB_PATH):
            print(f"❌ Backup failed: database not found at {DB_PATH}")
            return False

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = os.path.join(BACKUP_DIR, f"stockstory_backup_{ts}.db")

        try:
            print(f"💾 Copying hot-backup → {dest}")
            shutil.copy2(DB_PATH, dest)

            # Keep last 7 backups
            backups = sorted(
                [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
                key=os.path.getmtime,
            )
            while len(backups) > 7:
                oldest = backups.pop(0)
                os.remove(oldest)
                print(f"🧹 Pruned {os.path.basename(oldest)}")

            print(f"✅ Backup complete — {len(backups)} archives retained")
            return True
        except Exception as e:
            print(f"❌ Backup failed: {e}")
            return False

    # ── Weekly Report ────────────────────────────────────────

    def generate_weekly_market_intelligence_report(self) -> None:
        """Generate a structured markdown report from fundamentals + Ollama."""
        os.makedirs(REPORT_DIR, exist_ok=True)
        os.makedirs(LOG_DIR, exist_ok=True)

        if not os.path.isfile(DB_PATH):
            print(f"❌ Report aborted: database not found at {DB_PATH}")
            return

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Pull fundamentals + company metadata
        cursor.execute("""
            SELECT
                f.symbol,
                m.company_name,
                m.sector,
                f.pe_ratio,
                f.debt_to_equity,
                f.roe,
                f.roce,
                f.revenue_growth,
                f.profit_growth,
                f.snapshot_date
            FROM financial_snapshots f
            LEFT JOIN master_security_registry m ON m.symbol = f.symbol
            WHERE f.pe_ratio IS NOT NULL
            ORDER BY f.symbol
        """)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            print("⚠️  No fundamental records found. Populate financial_snapshots first.")
            return

        report_date = datetime.now().strftime("%Y-%m-%d")
        lines: list[str] = [
            f"# StockStory Weekly Intelligence Digest • {report_date}\n",
        ]

        for stock in rows:
            symbol = stock["symbol"]
            name = stock["company_name"] or symbol
            sector = stock["sector"] or "N/A"
            name_display = stock["company_name"] or symbol

            print(f"🤖 Generating summary for {symbol}...")

            pe = stock["pe_ratio"]
            de = stock["debt_to_equity"]
            roe = stock["roe"]
            rev_g = stock["revenue_growth"]

            prompt = (
                f"Generate a concise weekly performance wrap-up for {name_display} ({symbol}).\n"
                f"Metrics: P/E {pe:.1f}, Debt/Equity {de:.2f}, ROE {roe:.1f}%, "
                f"Revenue Growth {rev_g:.1f}%.\n"
                f"Keep it factual and 2-3 sentences. No recommendations."
            )

            ai_text = self._query_ollama(prompt)

            lines.append(f"## 📈 {symbol} — {name_display}\n")
            lines.append(f"- **Sector:** {sector}\n")
            lines.append(f"- **P/E:** {pe:.1f} | **D/E:** {de:.2f} | **ROE:** {roe:.1f}%\n")
            if ai_text:
                lines.append(f"- **Analysis:** {ai_text}\n")
            else:
                lines.append(f"- *Ollama unavailable — metrics recorded without commentary*\n")
            lines.append("")

        report_path = os.path.join(REPORT_DIR, f"Weekly_Market_Digest_{report_date}.md")
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        print(f"🎉 Report written to {report_path}")

    def _query_ollama(self, prompt: str) -> Optional[str]:
        """Call the local Ollama API; return None on failure."""
        if requests is None:
            print("  ⚠️  'requests' package not installed — skipping Ollama call")
            return None

        url = f"{self.ollama_url.rstrip('/')}/api/generate"
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2},
        }

        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                return resp.json().get("response", "").strip()
            else:
                print(f"  ⚠️  Ollama returned HTTP {resp.status_code}")
        except Exception as e:
            print(f"  ⚠️  Ollama connection failed: {e}")

        return None


# ── CLI entrypoint ─────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="StockStory Maintenance Daemon")
    parser.add_argument("--backup", action="store_true", help="Database backup")
    parser.add_argument("--report", action="store_true", help="Weekly report")
    args = parser.parse_args()

    daemon = StockStoryAutomationDaemon()

    if args.backup:
        sys.exit(0 if daemon.execute_database_backup() else 1)
    elif args.report:
        daemon.generate_weekly_market_intelligence_report()
    else:
        if daemon.execute_database_backup():
            daemon.generate_weekly_market_intelligence_report()
