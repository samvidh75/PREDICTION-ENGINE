"""
StockStory Email Delivery Log Cleanup
======================================
Creates (if missing) and prunes the email_delivery_log table in the
market_master billing database. Designed to run via cron monthly.

Usage:
    python cleanup_email_logs.py                              # Defaults: 90 days, auto-detect DB
    python cleanup_email_logs.py --db-path /path/to/market_master.db
    python cleanup_email_logs.py --days 30                    # Keep only last 30 days
    python cleanup_email_logs.py --dry-run                    # Preview without deleting
    python cleanup_email_logs.py --cron                        # Quiet mode for cron logging
"""

import argparse
import sqlite3
import sys
from datetime import datetime

DB_PATH_DEFAULT = "market_master.db"


def ensure_email_log_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS email_delivery_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            recipient_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'sent',
            sent_at TEXT NOT NULL DEFAULT (datetime('now')),
            error TEXT
        )
    """)
    for idx in [
        "idx_email_log_sent_at ON email_delivery_log(sent_at DESC)",
        "idx_email_log_recipient ON email_delivery_log(recipient_email)",
        "idx_email_log_user ON email_delivery_log(user_id)",
    ]:
        cursor.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?",
            (idx.split(" ")[0],),
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute(f"CREATE INDEX {idx}")


def prune_email_logs(db_path: str, days_to_keep: int = 90, dry_run: bool = False) -> int:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] Email log cleanup — keeping last {days_to_keep} days")
    if dry_run:
        print("  DRY RUN — no records will be deleted")
    print(f"  Database: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    ensure_email_log_table(cursor)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM email_delivery_log")
    total_rows = cursor.fetchone()[0]
    print(f"  Current log rows: {total_rows}")

    cursor.execute(
        "SELECT COUNT(*) FROM email_delivery_log "
        "WHERE sent_at < datetime('now', ?)",
        (f"-{days_to_keep} days",),
    )
    prunable = cursor.fetchone()[0]

    if prunable == 0:
        print("  No records older than retention period — nothing to prune")
        conn.close()
        return 0

    if dry_run:
        print(f"  [DRY] Would delete {prunable} record(s) older than {days_to_keep} days")
        cursor.execute(
            "SELECT id, recipient_email, sent_at, subject FROM email_delivery_log "
            "WHERE sent_at < datetime('now', ?) ORDER BY sent_at ASC LIMIT 5",
            (f"-{days_to_keep} days",),
        )
        old_records = cursor.fetchall()
        if old_records:
            print("  Oldest records to be pruned (showing up to 5):")
            for rid, recp, sat, subj in old_records:
                print(f"    [{rid}] {sat} | {recp} | {subj[:60] if subj else ''}")
        conn.close()
        return prunable

    cursor.execute(
        "DELETE FROM email_delivery_log "
        "WHERE sent_at < datetime('now', ?)",
        (f"-{days_to_keep} days",),
    )
    deleted = cursor.rowcount
    conn.commit()
    conn.close()

    print(f"  Pruned {deleted} old email delivery log record(s)")
    remaining = total_rows - deleted
    print(f"  Remaining log rows: {remaining}")
    return deleted


def show_table_summary(cursor):
    cursor.execute("SELECT COUNT(*) FROM email_delivery_log")
    total = cursor.fetchone()[0]
    cursor.execute(
        "SELECT MIN(sent_at), MAX(sent_at) FROM email_delivery_log"
    )
    row = cursor.fetchone()
    oldest, newest = row if row[0] else ("—", "—")
    cursor.execute(
        "SELECT COUNT(DISTINCT recipient_email) FROM email_delivery_log"
    )
    unique_recipients = cursor.fetchone()[0]
    print(f"  Total records:    {total}")
    print(f"  Unique recipients: {unique_recipients}")
    print(f"  Date range:        {oldest} → {newest}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="StockStory email delivery log cleanup — prunes old send records from market_master.db."
    )
    parser.add_argument(
        "--db-path",
        default=None,
        help="Path to market_master.db (default: auto-detected relative to script)",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=90,
        help="Number of days of email logs to retain (default: 90)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview records that would be deleted without removing them",
    )
    parser.add_argument(
        "--cron",
        action="store_true",
        help="Suppress banner output for cron logging",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Show table summary and exit (no pruning)",
    )
    args = parser.parse_args()

    if args.db_path:
        db_path = args.db_path
    else:
        from pathlib import Path
        db_path = str(Path(__file__).resolve().parent / DB_PATH_DEFAULT)

    if not args.cron:
        cols = 70
        print("=" * cols)
        print("  STOCKSTORY EMAIL LOG CLEANUP")
        print("=" * cols)
        print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
        print(f"  DB:   {db_path}")
        print(f"  Keep: {args.days} days")
        print("=" * cols)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    ensure_email_log_table(cursor)
    conn.commit()

    if args.summary:
        show_table_summary(cursor)
        conn.close()
        sys.exit(0)

    records_affected = prune_email_logs(db_path, days_to_keep=args.days, dry_run=args.dry_run)

    conn.close()

    if args.cron:
        sys.stdout.flush()
