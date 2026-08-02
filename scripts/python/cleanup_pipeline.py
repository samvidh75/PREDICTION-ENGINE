"""
StockStory Weekly Pipeline Cleanup
===================================
Prunes duplicate GGUF builds, training checkpoints, Python cache artifacts,
and log files. Designed to run via cron every Sunday at 23:59.

Usage:
    python cleanup_pipeline.py                              # Uses auto-detected project root
    python cleanup_pipeline.py --base-dir /var/www/stockstory  # Production server path
    python cleanup_pipeline.py --dry-run                    # Preview what would be deleted
"""

import argparse
import glob
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path


def run_weekly_pipeline_cleanup(base_dir: str, dry_run: bool = False):
    log_prefix = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]"
    print(f"{log_prefix} Starting pipeline maintenance...")
    if dry_run:
        print("  DRY RUN — no files will be deleted")
    print(f"  Base directory: {base_dir}")

    bytes_saved = 0
    dirs_to_preserve = {
        os.path.join(base_dir, "scripts", "python"),
        os.path.join(base_dir, "workers-api", "model-weights"),
    }

    # 1. Prune training checkpoints
    outputs_dir = os.path.join(base_dir, "outputs")
    if os.path.exists(outputs_dir):
        size = 0
        for root, _, files in os.walk(outputs_dir):
            size += sum(os.path.getsize(os.path.join(root, f)) for f in files)

        if dry_run:
            print(f"  [DRY] Would clear {outputs_dir} ({size / 1e6:.1f} MB)")
        else:
            print(f"  Clearing training checkpoints: {outputs_dir} ({size / 1e6:.1f} MB)")
            try:
                shutil.rmtree(outputs_dir)
                os.makedirs(outputs_dir)
                bytes_saved += size
            except Exception as e:
                print(f"  Failed to clear outputs: {e}")

    # 2. Prune GGUF build artifacts (Ollama already copied layers internally)
    gguf_dir = os.path.join(base_dir, "indian_stock_slm_master_gguf")
    if os.path.exists(gguf_dir):
        for filepath in glob.glob(os.path.join(gguf_dir, "*.gguf")):
            fsize = os.path.getsize(filepath)
            if dry_run:
                print(f"  [DRY] Would remove {os.path.basename(filepath)} ({fsize / 1e6:.1f} MB)")
            else:
                print(f"  Removing redundant GGUF: {os.path.basename(filepath)} ({fsize / 1e6:.1f} MB)")
                try:
                    os.remove(filepath)
                    bytes_saved += fsize
                except Exception as e:
                    print(f"  Failed to remove {filepath}: {e}")

    # 3. Truncate log files (preserve handles, zero content)
    log_patterns = [
        os.path.join(base_dir, "cron_*.txt"),
        os.path.join(base_dir, "workers-api", "*.log"),
        os.path.join(base_dir, "scripts", "python", "*.log"),
    ]
    for pattern in log_patterns:
        for log_file in glob.glob(pattern):
            try:
                fsize = os.path.getsize(log_file)
                if dry_run:
                    print(f"  [DRY] Would truncate {os.path.basename(log_file)} ({fsize / 1e3:.1f} KB)")
                else:
                    with open(log_file, "w") as f:
                        f.truncate(0)
                    bytes_saved += fsize
                    print(f"  Truncated log: {os.path.basename(log_file)} ({fsize / 1e3:.1f} KB)")
            except Exception as e:
                print(f"  Failed to truncate {log_file}: {e}")

    # 4. Prune old merged checkpoint directories (keep only latest 2)
    checkpoint_dirs = sorted([
        d for d in Path(base_dir).iterdir()
        if d.is_dir() and d.name.startswith("indian_stock_slm_master") and not d.name.endswith("_gguf")
    ], key=lambda d: d.stat().st_mtime, reverse=True)

    for old_dir in checkpoint_dirs[2:]:
        dsize = sum(f.stat().st_size for f in old_dir.rglob("*") if f.is_file())
        if dry_run:
            print(f"  [DRY] Would remove old checkpoint {old_dir.name} ({dsize / 1e6:.1f} MB)")
        else:
            print(f"  Removing old checkpoint: {old_dir.name} ({dsize / 1e6:.1f} MB)")
            try:
                shutil.rmtree(str(old_dir))
                bytes_saved += dsize
            except Exception as e:
                print(f"  Failed to remove {old_dir.name}: {e}")

    # 5. Purge Python __pycache__ directories
    pycache_count = 0
    for root, dirs, _ in os.walk(base_dir):
        if "__pycache__" in dirs:
            path = os.path.join(root, "__pycache__")
            if any(str(path).startswith(str(p)) for p in dirs_to_preserve):
                continue  # skip protected dirs
            if dry_run:
                print(f"  [DRY] Would remove {path}")
                pycache_count += 1
            else:
                try:
                    shutil.rmtree(path)
                    pycache_count += 1
                except Exception:
                    pass
    if pycache_count > 0:
        print(f"  Purged {pycache_count} __pycache__ directories")

    # 6. Remove .pyc orphan files
    pyc_count = 0
    for root, _, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".pyc"):
                fpath = os.path.join(root, f)
                if dry_run:
                    print(f"  [DRY] Would remove {fpath}")
                    pyc_count += 1
                else:
                    try:
                        bytes_saved += os.path.getsize(fpath)
                        os.remove(fpath)
                        pyc_count += 1
                    except Exception:
                        pass
    if pyc_count > 0:
        print(f"  Removed {pyc_count} .pyc orphan files")

    # 7. Prune email delivery log (market_master.db)
    email_db = os.path.join(base_dir, "scripts", "python", "market_master.db")
    if os.path.exists(email_db):
        try:
            import importlib.util
            email_cleanup_path = os.path.join(base_dir, "scripts", "python", "cleanup_email_logs.py")
            if os.path.exists(email_cleanup_path):
                spec = importlib.util.spec_from_file_location("cleanup_email_logs", email_cleanup_path)
                if spec is not None and spec.loader is not None:
                    mod = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(mod)
                    rows_pruned = mod.prune_email_logs(email_db, days_to_keep=90, dry_run=dry_run)
                else:
                    print("  Email log cleanup spec not loaded — skipping")
                    rows_pruned = 0
                bytes_saved += rows_pruned * 512
                print(f"  Email log cleanup: {rows_pruned} record(s) affected")
            else:
                print("  Email log cleanup script not found — skipping")
        except Exception as e:
            print(f"  Email log cleanup skipped: {e}")
    else:
        print("  No market_master.db found — skipping email log cleanup")

    megabytes_saved = round(bytes_saved / (1024 * 1024), 2)
    print(f"Maintenance complete. Recovered {megabytes_saved} MB of disk space.\n")
    return bytes_saved


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="StockStory weekly pipeline cleanup — removes build artifacts, old checkpoints, logs, and Python cache."
    )
    parser.add_argument(
        "--base-dir",
        default=None,
        help="Project root directory (default: auto-detected from script location)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be deleted without actually removing anything",
    )
    parser.add_argument(
        "--cron",
        action="store_true",
        help="Suppress non-essential output for cron logging",
    )
    args = parser.parse_args()

    if args.base_dir:
        base_dir = args.base_dir
    else:
        base_dir = str(Path(__file__).resolve().parent.parent.parent)

    if not args.cron:
        cols = 70
        print("=" * cols)
        print("  STOCKSTORY PIPELINE CLEANUP")
        print("=" * cols)
        print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
        print(f"  Base: {base_dir}")
        print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * cols)

    run_weekly_pipeline_cleanup(base_dir, dry_run=args.dry_run)

    if args.cron:
        sys.stdout.flush()
