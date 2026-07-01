"""
StockStory Automated Database Snapshot Engine
==============================================
Hot-copies all SQLite databases to a timestamped snapshot directory
using the SQLite online backup API (safe for concurrent writes).
Optionally syncs to a remote destination via rsync.

Usage:
    python backup_snapshot.py                              # Auto-detect, default settings
    python backup_snapshot.py --dest-dir /mnt/snapshots    # Custom local destination
    python backup_snapshot.py --remote-dest user@host:/backups  # + remote sync
    python backup_snapshot.py --retention 7                # Keep only 7 snapshots
    python backup_snapshot.py --dry-run                    # Preview without copying
    python backup_snapshot.py --compress                   # Gzip compress (off by default)
    python backup_snapshot.py --cron                       # Quiet mode for cron logging
"""

import argparse
import gzip
import os
import sqlite3
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SNAPSHOT_DIR_DEFAULT = "data/snapshots"
RETENTION_DEFAULT = int(os.getenv("BACKUP_RETENTION", "30"))
REMOTE_DEST = os.getenv("BACKUP_REMOTE_DEST", "")

DATABASES = {
    "stockstory": "data/stockstory.db",
    "market_master": "market_master.db",
    "scripts_python_market_master": "scripts/python/market_master.db",
}


def snapshot_db(db_path: str, dest_path: str, compress: bool, dry_run: bool) -> int:
    """Hot-copy a SQLite DB using the online backup API, optionally gzip.
    Returns byte count of the resulting snapshot file."""
    if not os.path.exists(db_path):
        print(f"  Source DB not found: {db_path} — skipping")
        return 0

    src_size = os.path.getsize(db_path)
    temp_path = dest_path + ".tmp"

    if dry_run:
        dest_size = src_size
        if compress:
            compressed_path = dest_path + ".gz"
            print(f"  [DRY] Would snapshot {os.path.basename(db_path)} "
                  f"({src_size / 1024:.1f} KB) → {os.path.basename(compressed_path)}")
        else:
            print(f"  [DRY] Would snapshot {os.path.basename(db_path)} "
                  f"({src_size / 1024:.1f} KB) → {os.path.basename(dest_path)}")
        return dest_size

    try:
        source_conn = sqlite3.connect(db_path)
        dest_conn = sqlite3.connect(temp_path)
        source_conn.backup(dest_conn, pages=0, progress=None)
        source_conn.close()
        dest_conn.close()

        if compress:
            compressed_path = dest_path + ".gz"
            with open(temp_path, "rb") as f_in:
                with gzip.open(compressed_path, "wb", compresslevel=6) as f_out:
                    shutil.copyfileobj(f_in, f_out)
            os.remove(temp_path)
            final_path = compressed_path
        else:
            os.rename(temp_path, dest_path)
            final_path = dest_path

        dest_size = os.path.getsize(final_path)
        ratio = dest_size / src_size * 100 if src_size > 0 else 0
        print(f"  ✓ {os.path.basename(db_path)} ({src_size / 1024:.1f} KB → "
              f"{dest_size / 1024:.1f} KB, {ratio:.0f}%)")
        return dest_size
    except Exception as e:
        print(f"  ✗ Failed to snapshot {db_path}: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return 0


def prune_snapshots(snapshot_dir: str, db_prefix: str, retention: int, dry_run: bool):
    """Remove old snapshots for a given DB prefix, keeping only the N most recent."""
    pattern = f"{db_prefix}_"
    snapshots = sorted(
        [f for f in os.listdir(snapshot_dir) if f.startswith(pattern)],
        key=lambda f: os.path.getmtime(os.path.join(snapshot_dir, f)),
    )
    while len(snapshots) > retention:
        oldest = snapshots.pop(0)
        oldest_path = os.path.join(snapshot_dir, oldest)
        oldest_gz = oldest_path + ".gz"
        target = oldest_gz if os.path.exists(oldest_gz) else oldest_path
        if dry_run:
            print(f"  [DRY] Would remove old snapshot: {os.path.basename(target)}")
        else:
            try:
                os.remove(target)
                print(f"  Pruned old snapshot: {os.path.basename(target)}")
            except Exception as e:
                print(f"  Failed to prune {target}: {e}")


def rsync_snapshots(snapshot_dir: str, remote_dest: str, dry_run: bool):
    """Sync local snapshot directory to a remote destination via rsync."""
    if not remote_dest:
        return

    rsync_cmd = [
        "rsync", "-avz", "--delete",
        snapshot_dir.rstrip("/") + "/",
        remote_dest,
    ]

    if dry_run:
        print(f"  [DRY] Would rsync: {' '.join(rsync_cmd)}")
        return

    print(f"  Syncing to remote: {remote_dest}")
    try:
        result = subprocess.run(
            rsync_cmd, capture_output=True, text=True, timeout=300
        )
        if result.returncode == 0:
            files_synced = len([l for l in result.stdout.split("\n") if l.endswith(".db") or l.endswith(".gz")])
            print(f"  Remote sync complete ({files_synced} file(s))")
        else:
            print(f"  Rsync stderr: {result.stderr[:200]}")
    except FileNotFoundError:
        print("  rsync not found on system — install via 'apt install rsync' or 'brew install rsync'")
    except subprocess.TimeoutExpired:
        print("  rsync timed out after 300s")
    except Exception as e:
        print(f"  rsync failed: {e}")


def run_snapshot(base_dir: str, dest_dir: str,
                 retention: int, remote_dest: str,
                 compress: bool, dry_run: bool) -> dict:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{log_ts}] Starting database snapshot...")
    if dry_run:
        print("  DRY RUN — no files will be written")
    print(f"  Base: {base_dir}")
    print(f"  Dest: {dest_dir}")
    print(f"  Retention: {retention} per database")

    os.makedirs(dest_dir, exist_ok=True)

    results = {}
    total_bytes = 0
    errors = 0

    for db_name, rel_path in DATABASES.items():
        db_abs = os.path.join(base_dir, rel_path)
        dest_filename = f"{db_name}_{ts}.db"
        dest_path = os.path.join(dest_dir, dest_filename)

        size = snapshot_db(db_abs, dest_path, compress=compress, dry_run=dry_run)
        if size > 0:
            total_bytes += size
            results[db_name] = size
        else:
            errors += 1

        if os.path.exists(db_abs):
            prune_snapshots(dest_dir, db_name, retention=retention, dry_run=dry_run)

    rsync_snapshots(dest_dir, remote_dest, dry_run=dry_run)

    total_mb = total_bytes / (1024 * 1024)
    print(f"Snapshot complete. {total_mb:.2f} MB written to {dest_dir}")
    return {"total_bytes": total_bytes, "results": results, "errors": errors}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="StockStory database snapshot engine — safe hot-backup of all SQLite databases."
    )
    parser.add_argument("--base-dir", default=None,
                        help="Project root directory (default: auto-detected from script location)")
    parser.add_argument("--dest-dir", default=None,
                        help=f"Snapshot destination (default: {{base_dir}}/{SNAPSHOT_DIR_DEFAULT})")
    parser.add_argument("--remote-dest", default=None,
                        help="rsync-compatible remote destination (e.g. user@host:/backups)")
    parser.add_argument("--retention", type=int, default=RETENTION_DEFAULT,
                        help=f"Number of snapshots to retain per database (default: {RETENTION_DEFAULT})")
    parser.add_argument("--compress", action="store_true", default=True,
                        help="Compress snapshots with gzip (default: true)")
    parser.add_argument("--no-compress", action="store_false", dest="compress",
                        help="Skip gzip compression for faster snapshots")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview what would be backed up without writing files")
    parser.add_argument("--cron", action="store_true",
                        help="Suppress banner output for cron logging")
    args = parser.parse_args()

    if args.base_dir:
        base_dir = args.base_dir
    else:
        base_dir = str(Path(__file__).resolve().parent.parent.parent)

    if args.dest_dir:
        dest_dir = args.dest_dir
    else:
        dest_dir = os.path.join(base_dir, SNAPSHOT_DIR_DEFAULT)

    remote_dest = args.remote_dest or REMOTE_DEST

    if not args.cron:
        cols = 70
        print("=" * cols)
        print("  STOCKSTORY DATABASE SNAPSHOT")
        print("=" * cols)
        print(f"  Mode:       {'DRY RUN' if args.dry_run else 'LIVE'}")
        print(f"  Compress:   {'gzip' if args.compress else 'none'}")
        print(f"  Retention:  {args.retention} per database")
        print(f"  Remote:     {remote_dest or 'none'}")
        print(f"  Dest:       {dest_dir}")
        print("=" * cols)

    run_snapshot(
        base_dir=base_dir,
        dest_dir=dest_dir,
        retention=args.retention,
        remote_dest=remote_dest,
        compress=args.compress,
        dry_run=args.dry_run,
    )

    if args.cron:
        sys.stdout.flush()
