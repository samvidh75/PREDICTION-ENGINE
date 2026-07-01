"""
StockStory Automated Database Snapshot & Replication Engine
===========================================================
Archives local SQLite databases and/or the active PostgreSQL database into
timestamped snapshot files, keeps a rolling retention window, and can
replicate the archive directory to an off-site host via rsync.

Usage:
    python backup_snapshot.py
    python backup_snapshot.py --dest-dir /mnt/snapshots
    python backup_snapshot.py --remote-dest user@host:/backups
    python backup_snapshot.py --retention 7
    python backup_snapshot.py --dry-run
    python backup_snapshot.py --cron

Environment:
    BACKUP_REMOTE_DEST          rsync destination for off-site replication
    BACKUP_RETENTION            snapshots to retain per source (default: 30)
    BACKUP_DEST_DIR             local archive directory (default: data/snapshots)
    BACKUP_INCLUDE_SQLITE       set to "false" to skip local SQLite files
    BACKUP_INCLUDE_POSTGRES     set to "false" to skip PostgreSQL dump
    BACKUP_LOCK_FILE            custom lock file path for concurrency safety
"""

from __future__ import annotations

import argparse
import fcntl
import gzip
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

SNAPSHOT_DIR_DEFAULT = "data/snapshots"
RETENTION_DEFAULT = int(os.getenv("BACKUP_RETENTION", "30"))
REMOTE_DEST = os.getenv("BACKUP_REMOTE_DEST", "")
DEST_DIR_ENV = os.getenv("BACKUP_DEST_DIR", "")
LOCK_FILE_ENV = os.getenv("BACKUP_LOCK_FILE", "")
INCLUDE_SQLITE = os.getenv("BACKUP_INCLUDE_SQLITE", "true").lower() not in {"0", "false", "no"}
INCLUDE_POSTGRES = os.getenv("BACKUP_INCLUDE_POSTGRES", "true").lower() not in {"0", "false", "no"}

SQLITE_DATABASES = {
    "stockstory": "data/stockstory.db",
    "market_master": "market_master.db",
    "scripts_python_market_master": "scripts/python/market_master.db",
}


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_postgres_url(database_url: str | None) -> bool:
    if not database_url:
        return False
    scheme = urlparse(database_url).scheme.lower()
    return scheme in {"postgres", "postgresql"}


def build_postgres_env(database_url: str) -> dict[str, str]:
    parsed = urlparse(database_url)
    env = os.environ.copy()

    if parsed.hostname:
        env["PGHOST"] = parsed.hostname
    if parsed.port:
        env["PGPORT"] = str(parsed.port)
    if parsed.path and parsed.path != "/":
        env["PGDATABASE"] = parsed.path.lstrip("/")
    if parsed.username:
        env["PGUSER"] = unquote(parsed.username)
    if parsed.password:
        env["PGPASSWORD"] = unquote(parsed.password)

    # Preserve sslmode/query settings if present.
    query_params = parse_qs(parsed.query)
    if "sslmode" in query_params and query_params["sslmode"]:
        env["PGSSLMODE"] = query_params["sslmode"][0]

    return env


def snapshot_sqlite(db_path: str, dest_path: str, compress: bool, dry_run: bool) -> tuple[int, str]:
    """Hot-copy a SQLite DB using the online backup API."""
    if not os.path.exists(db_path):
        print(f"  Source DB not found: {db_path} — skipping")
        return 0, dest_path if not compress else dest_path + ".gz"

    src_size = os.path.getsize(db_path)
    temp_path = dest_path + ".tmp"

    if dry_run:
        if compress:
            print(
                f"  [DRY] Would snapshot {os.path.basename(db_path)} "
                f"({src_size / 1024:.1f} KB) → {os.path.basename(dest_path)}.gz"
            )
        else:
            print(
                f"  [DRY] Would snapshot {os.path.basename(db_path)} "
                f"({src_size / 1024:.1f} KB) → {os.path.basename(dest_path)}"
            )
        return src_size, dest_path if not compress else dest_path + ".gz"

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
            os.replace(temp_path, dest_path)
            final_path = dest_path

        dest_size = os.path.getsize(final_path)
        ratio = dest_size / src_size * 100 if src_size > 0 else 0
        print(
            f"  ✓ {os.path.basename(db_path)} "
            f"({src_size / 1024:.1f} KB → {dest_size / 1024:.1f} KB, {ratio:.0f}%)"
        )
        return dest_size, final_path
    except Exception as exc:  # pragma: no cover - safety logging
        print(f"  ✗ Failed to snapshot {db_path}: {exc}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return 0, dest_path if not compress else dest_path + ".gz"


def snapshot_postgres(database_url: str, dest_path: str, dry_run: bool) -> tuple[int, str]:
    """Dump the active PostgreSQL database using pg_dump custom format."""
    if dry_run:
        print(f"  [DRY] Would pg_dump PostgreSQL database → {os.path.basename(dest_path)}")
        return 0, dest_path

    pg_dump_path = shutil.which("pg_dump")
    if not pg_dump_path:
        print("  ✗ pg_dump not found — install PostgreSQL client tools to enable Postgres backups")
        return 0, dest_path

    env = build_postgres_env(database_url)
    temp_path = dest_path + ".tmp"
    cmd = [
        pg_dump_path,
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--file",
        temp_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=1800,
            check=False,
        )
        if result.returncode != 0:
            stderr = (result.stderr or result.stdout or "").strip()
            print(f"  ✗ pg_dump failed: {stderr[:400]}")
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return 0, dest_path

        os.replace(temp_path, dest_path)
        dest_size = os.path.getsize(dest_path)
        print(f"  ✓ PostgreSQL dump written ({dest_size / 1024:.1f} KB)")
        return dest_size, dest_path
    except subprocess.TimeoutExpired:
        print("  ✗ pg_dump timed out after 1800s")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return 0, dest_path
    except Exception as exc:  # pragma: no cover - safety logging
        print(f"  ✗ Failed to dump PostgreSQL database: {exc}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return 0, dest_path


def prune_snapshots(snapshot_dir: str, db_prefix: str, retention: int, dry_run: bool) -> None:
    """Remove old snapshots for a given DB prefix, keeping only the N most recent."""
    pattern = f"{db_prefix}_"
    snapshots = sorted(
        [f for f in os.listdir(snapshot_dir) if f.startswith(pattern)],
        key=lambda f: os.path.getmtime(os.path.join(snapshot_dir, f)),
    )

    while len(snapshots) > retention:
        oldest = snapshots.pop(0)
        oldest_path = os.path.join(snapshot_dir, oldest)
        target = oldest_path
        if dry_run:
            print(f"  [DRY] Would remove old snapshot: {os.path.basename(target)}")
        else:
            try:
                os.remove(target)
                print(f"  Pruned old snapshot: {os.path.basename(target)}")
            except Exception as exc:
                print(f"  Failed to prune {target}: {exc}")


def rsync_snapshots(snapshot_dir: str, remote_dest: str, dry_run: bool) -> None:
    """Sync local snapshot directory to a remote destination via rsync."""
    if not remote_dest:
        return

    rsync_cmd = [
        "rsync",
        "-avz",
        "--delete",
        snapshot_dir.rstrip("/") + "/",
        remote_dest,
    ]

    if dry_run:
        print(f"  [DRY] Would rsync: {' '.join(rsync_cmd)}")
        return

    print(f"  Syncing to remote: {remote_dest}")
    try:
        result = subprocess.run(
            rsync_cmd,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
        if result.returncode == 0:
            files_synced = len(
                [line for line in (result.stdout or "").splitlines() if line.endswith((".db", ".dump", ".gz", ".json"))]
            )
            print(f"  Remote sync complete ({files_synced} file(s))")
        else:
            print(f"  Rsync stderr: {(result.stderr or result.stdout or '')[:200]}")
    except FileNotFoundError:
        print("  rsync not found on system — install via 'apt install rsync' or 'brew install rsync'")
    except subprocess.TimeoutExpired:
        print("  rsync timed out after 300s")
    except Exception as exc:
        print(f"  rsync failed: {exc}")


@contextmanager
def snapshot_lock(lock_path: str):
    os.makedirs(os.path.dirname(lock_path), exist_ok=True)
    handle = open(lock_path, "a+")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    except BlockingIOError:
        print(f"  Another backup is already running (lock: {lock_path})")
        raise SystemExit(0)
    finally:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        except Exception:
            pass
        handle.close()


def run_snapshot(
    base_dir: str,
    dest_dir: str,
    retention: int,
    remote_dest: str,
    compress: bool,
    dry_run: bool,
    include_sqlite: bool,
    include_postgres: bool,
    database_url: str | None,
) -> dict[str, object]:
    ts = utc_timestamp()
    log_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    manifest: dict[str, object] = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "baseDir": base_dir,
        "destDir": dest_dir,
        "retention": retention,
        "remoteDest": remote_dest or None,
        "compress": compress,
        "sources": [],
    }

    print(f"[{log_ts}] Starting database snapshot...")
    if dry_run:
        print("  DRY RUN — no files will be written")
    print(f"  Base: {base_dir}")
    print(f"  Dest: {dest_dir}")
    print(f"  Retention: {retention} per source")
    print(f"  Remote: {remote_dest or 'none'}")

    os.makedirs(dest_dir, exist_ok=True)

    results: dict[str, int] = {}
    total_bytes = 0
    errors = 0

    if include_sqlite:
        for db_name, rel_path in SQLITE_DATABASES.items():
            db_abs = os.path.join(base_dir, rel_path)
            dest_filename = f"{db_name}_{ts}.db"
            dest_path = os.path.join(dest_dir, dest_filename)

            size, final_path = snapshot_sqlite(db_abs, dest_path, compress=compress, dry_run=dry_run)
            if size > 0:
                total_bytes += size
                results[db_name] = size
                manifest["sources"].append(
                    {
                        "name": db_name,
                        "kind": "sqlite",
                        "source": db_abs,
                        "file": os.path.basename(final_path),
                        "bytes": size,
                        "sha256": None if dry_run else sha256_file(final_path),
                    }
                )
            else:
                errors += 1

            if os.path.exists(db_abs):
                prune_snapshots(dest_dir, db_name, retention=retention, dry_run=dry_run)

    if include_postgres and is_postgres_url(database_url):
        dest_filename = f"postgresql_{ts}.dump"
        dest_path = os.path.join(dest_dir, dest_filename)
        size, final_path = snapshot_postgres(database_url or "", dest_path, dry_run=dry_run)
        if size > 0:
            total_bytes += size
            results["postgresql"] = size
            manifest["sources"].append(
                {
                    "name": "postgresql",
                    "kind": "postgres",
                    "source": "DATABASE_URL",
                    "file": os.path.basename(final_path),
                    "bytes": size,
                    "sha256": None if dry_run else sha256_file(final_path),
                }
            )
            prune_snapshots(dest_dir, "postgresql", retention=retention, dry_run=dry_run)
        else:
            errors += 1

    manifest_path = os.path.join(dest_dir, f"manifest_{ts}.json")
    if not dry_run:
        with open(manifest_path, "w", encoding="utf-8") as handle:
            json.dump(manifest, handle, indent=2, sort_keys=True)
        total_bytes += os.path.getsize(manifest_path)
        print(f"  Manifest written: {os.path.basename(manifest_path)}")

    rsync_snapshots(dest_dir, remote_dest, dry_run=dry_run)

    total_mb = total_bytes / (1024 * 1024)
    print(f"Snapshot complete. {total_mb:.2f} MB written to {dest_dir}")
    return {"total_bytes": total_bytes, "results": results, "errors": errors, "manifest": manifest}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="StockStory database snapshot engine — safe hot-backup and replication."
    )
    parser.add_argument(
        "--base-dir",
        default=None,
        help="Project root directory (default: auto-detected from script location)",
    )
    parser.add_argument(
        "--dest-dir",
        default=None,
        help=f"Snapshot destination (default: {{base_dir}}/{SNAPSHOT_DIR_DEFAULT})",
    )
    parser.add_argument(
        "--remote-dest",
        default=None,
        help="rsync-compatible remote destination (e.g. user@host:/backups)",
    )
    parser.add_argument(
        "--retention",
        type=int,
        default=RETENTION_DEFAULT,
        help=f"Number of snapshots to retain per source (default: {RETENTION_DEFAULT})",
    )
    parser.add_argument(
        "--compress",
        action="store_true",
        default=True,
        help="Compress SQLite snapshots with gzip (default: true)",
    )
    parser.add_argument(
        "--no-compress",
        action="store_false",
        dest="compress",
        help="Skip gzip compression for faster SQLite snapshots",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be backed up without writing files",
    )
    parser.add_argument(
        "--cron",
        action="store_true",
        help="Suppress banner output for cron logging",
    )
    parser.add_argument(
        "--no-sqlite",
        action="store_true",
        help="Skip local SQLite archives",
    )
    parser.add_argument(
        "--no-postgres",
        action="store_true",
        help="Skip PostgreSQL archive",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.base_dir:
        base_dir = args.base_dir
    else:
        base_dir = str(Path(__file__).resolve().parent.parent.parent)

    if args.dest_dir:
        dest_dir = args.dest_dir
    elif DEST_DIR_ENV:
        dest_dir = DEST_DIR_ENV
    else:
        dest_dir = os.path.join(base_dir, SNAPSHOT_DIR_DEFAULT)

    remote_dest = args.remote_dest or REMOTE_DEST
    database_url = os.getenv("DATABASE_URL", "")
    include_sqlite = INCLUDE_SQLITE and not args.no_sqlite
    include_postgres = INCLUDE_POSTGRES and not args.no_postgres

    lock_path = LOCK_FILE_ENV or os.path.join(dest_dir, ".backup.lock")

    if not args.cron:
        cols = 78
        print("=" * cols)
        print("  STOCKSTORY DATABASE SNAPSHOT & REPLICATION")
        print("=" * cols)
        print(f"  Mode:       {'DRY RUN' if args.dry_run else 'LIVE'}")
        print(f"  Compress:   {'gzip' if args.compress else 'none'}")
        print(f"  Retention:  {args.retention} per source")
        print(f"  Remote:     {remote_dest or 'none'}")
        print(f"  Dest:       {dest_dir}")
        print(f"  Sources:    sqlite={'yes' if include_sqlite else 'no'}, postgres={'yes' if include_postgres else 'no'}")
        print("=" * cols)

    with snapshot_lock(lock_path):
        run_snapshot(
            base_dir=base_dir,
            dest_dir=dest_dir,
            retention=args.retention,
            remote_dest=remote_dest,
            compress=args.compress,
            dry_run=args.dry_run,
            include_sqlite=include_sqlite,
            include_postgres=include_postgres,
            database_url=database_url,
        )

    if args.cron:
        sys.stdout.flush()


if __name__ == "__main__":
    main()
