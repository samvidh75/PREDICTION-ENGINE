# Python Runtime — Dockerfile-Managed

**Last updated**: 2026-06-18

## Decision

Python is installed inside the Dockerfile via `apk add` on the `node:22-alpine` base image. No `runtime.txt`, `.python-version`, or separate Python buildpack is used. Railway runs the Dockerfile as-is, so Python is available alongside Node in the same container.

## Dockerfile Changes

| Change | Detail |
|--------|--------|
| Base image | `node:22-alpine` (unchanged) |
| Python install | `apk add --no-cache python3 py3-pip` in runner stage |
| Python version | 3.11+ (Alpine 3.21 ships Python 3.12) |
| Python deps | `COPY requirements-nse.txt` → `pip install -r requirements-nse.txt` |
| Version check | `python3 --version` logged during build |
| Fallback | `pip install` failure is non-fatal — `echo` warning, container still starts |

## Python Version

The Alpine package `python3` on Alpine 3.21 provides Python 3.12.x. Both `nselib` (needs >=3.10) and `jugaad-data` `stock_df` (needs >=3.10) are now compatible.

## Packages Installed

From `requirements-nse.txt`:

| Package | Purpose |
|---------|---------|
| `jugaad-data` | Bhavcopy CSV, RBI rates, market status, indices |
| `nsepython` | Index quotes, symbol universe, bhavcopy |
| `requests-cache` | HTTP caching for Python-based providers |

## Why Not runtime.txt / .python-version

| Approach | Problem |
|----------|---------|
| `runtime.txt` | Heroku‑only convention; Railway ignores it |
| `.python-version` | pyenv convention; Railway ignores it |
| Railway Python buildpack | Not needed — Node image is the primary runtime; Python is a secondary dependency |

## Verification

```bash
npm run check:python-runtime
```

This script verifies:
- `python3` is on `$PATH`
- Python version is >= 3.10
- `pip` is available
- Each package in `requirements-nse.txt` can be imported
