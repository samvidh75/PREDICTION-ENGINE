#!/usr/bin/env python3
"""Check Python runtime and dependencies for IndianAPI Premium ingestion."""

import importlib
import os
import sys
from pathlib import Path


REQUIRED_PACKAGES = [
    "aiohttp",
    "pandas",
    "sqlalchemy",
    "tenacity",
    "psycopg2",
    "dotenv",
]

OPTIONAL_ENV_VARS = [
    "INDIANAPI_PREMIUM_API_KEY",
    "INDIANAPI_PREMIUM_BASE_URL",
    "INDIANAPI_PREMIUM_ENABLED",
    "DATABASE_URL",
]


def check_runtime() -> int:
    exit_code = 0

    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    print()

    # Check required packages
    print("=== Required Packages ===")
    for pkg in REQUIRED_PACKAGES:
        try:
            importlib.import_module(pkg)
            print(f"  {pkg}: OK")
        except ImportError:
            print(f"  {pkg}: MISSING")
            exit_code = 1

    print()

    # Check env vars (without printing values)
    print("=== Environment Variables ===")
    dotenv_path = Path(".env")
    if dotenv_path.exists():
        print("  .env file: present")
    else:
        print("  .env file: not found (will use environment only)")

    for var in OPTIONAL_ENV_VARS:
        if os.environ.get(var):
            label = var.replace("INDIANAPI_PREMIUM_", "").replace("_", " ").strip()
            print(f"  {label}: configured")
        else:
            label = var.replace("INDIANAPI_PREMIUM_", "").replace("_", " ").strip()
            print(f"  {label}: not set")

    print()
    if exit_code == 0:
        print("Runtime check: PASSED")
    else:
        print("Runtime check: FAILED — missing dependencies")

    return exit_code


if __name__ == "__main__":
    sys.exit(check_runtime())
